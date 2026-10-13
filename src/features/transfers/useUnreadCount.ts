import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_SCHEMA } from "@/lib/constants";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const me = getStoredIdentity();
    if (!me) return;
    let active = true;

    const refresh = async () => {
      const { count: c, error } = await supabase
        .from("ovbridge_transfers")
        .select("id", { count: "exact", head: true })
        .eq("to_device_id", me.deviceId)
        .is("read_at", null);

      if (!error && active) setCount(c ?? 0);
    };

    refresh();

    const ch = supabase
      .channel("unread_count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: SUPABASE_SCHEMA,
          table: "ovbridge_transfers",
          filter: `to_device_id=eq.${me.deviceId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  return count;
}
