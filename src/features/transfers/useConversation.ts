import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_SCHEMA } from "@/lib/constants";
import { withMinDelay } from "@/lib/utils";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/useAuth";
import { getConversation, type ConversationMessage } from "@/lib/transfers";

type Scope = { kind: "space" | "device"; id: string };

export function useConversation(scope: Scope | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Verrou anti-requêtes concurrentes avec re-déclenchement automatique
  const fetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  const scopeKind = scope?.kind;
  const scopeId = scope?.id;

  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const refresh = useCallback(async () => {
    if (!user || !scopeKind || !scopeId) return;
    const me = getStoredIdentity();
    if (!me) return;

    if (fetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    fetchingRef.current = true;
    try {
      const msgs = await withMinDelay(
        getConversation({
          myUserId: user.id,
          myDeviceId: me.deviceId,
          scope: { kind: scopeKind, id: scopeId },
        }),
        2000
      );

      // Dédoublonne par id
      const seen = new Set<string>();
      const unique = msgs.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      setMessages(unique);
    } catch (e) {
      console.error("[useConversation]", e);
    } finally {
      fetchingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        refreshRef.current();
      }
    }
  }, [user, scopeKind, scopeId]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!user || !scopeKind || !scopeId) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (active) refresh();
      }, 200);
    };

    const ch = supabase
      .channel(`conv_${scopeKind}_${scopeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: SUPABASE_SCHEMA, table: "ovbridge_transfers" },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      active = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(ch);
    };
  }, [user, scopeKind, scopeId, refresh]);

  return { messages, loading, refresh };
}
