import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/AuthProvider";
import { getConversation, type ConversationMessage } from "@/lib/transfers";

type Scope = { kind: "space" | "device"; id: string };

export function useConversation(scope: Scope | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !scope) return;
    const me = getStoredIdentity();
    if (!me) return;

    try {
      const msgs = await getConversation({
        myUserId: user.id,
        myDeviceId: me.deviceId,
        scope,
      });
      setMessages(msgs);
    } catch (e) {
      console.error("[useConversation]", e);
    }
  }, [user, scope?.kind, scope?.id]);

  useEffect(() => {
    if (!user || !scope) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    const ch = supabase
      .channel(`conv_${scope.kind}_${scope.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ovbridge_transfers" },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user, scope?.kind, scope?.id, refresh]);

  return { messages, loading, refresh };
}