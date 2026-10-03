import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth";
import {
  fetchClipboardHistory,
  type DecryptedClipboard,
} from "@/lib/clipboard";

export function useClipboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<DecryptedClipboard[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || fetchingRef.current) return;
    const me = getStoredIdentity();
    if (!me) return;

    fetchingRef.current = true;
    try {
      const list = await fetchClipboardHistory(me);
      const seen = new Set<string>();
      const unique = list.filter((i) => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      setItems(unique);
    } catch (e) {
      console.error("[useClipboard]", e);
    } finally {
      fetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => refresh(), 200);
    };

    const ch = supabase
      .channel("clipboard_rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_clipboard",
          filter: `user_id=eq.${user.id}`,
        },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      active = false;
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return { items, loading, refresh };
}
