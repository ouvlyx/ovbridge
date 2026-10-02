import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/AuthProvider";
import { getConversation, type ConversationMessage } from "@/lib/transfers";

type Scope = { kind: "space" | "device"; id: string };

export function useConversation(scope: Scope | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Verrou anti-requêtes concurrentes
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || !scope) return;
    if (fetchingRef.current) return;         // ← empêche les refresh simultanés
    const me = getStoredIdentity();
    if (!me) return;

    fetchingRef.current = true;
    try {
      const msgs = await getConversation({
        myUserId: user.id,
        myDeviceId: me.deviceId,
        scope,
      });

      // Dédoublonne par id (ceinture + bretelles)
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
    }
  }, [user, scope?.kind, scope?.id]);

  useEffect(() => {
    if (!user || !scope) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    // Debounce : si plusieurs events arrivent vite, on ne refresh qu'une fois
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refresh(), 200);
    };

    const ch = supabase
      .channel(`conv_${scope.kind}_${scope.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovbridge_transfers" },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      active = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(ch);
    };
  }, [user, scope?.kind, scope?.id, refresh]);

  return { messages, loading, refresh };
}