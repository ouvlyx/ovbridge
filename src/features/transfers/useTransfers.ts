import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Transfer } from "@/lib/transfers";

export function useTransfers() {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<Transfer[]>([]);
  const [sent, setSent] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("ovbridge_transfers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !active) return;

      const all = (data ?? []) as Transfer[];
      const me = JSON.parse(localStorage.getItem("ovbridge_device_identity") ?? "null");
      const myId = me?.deviceId;

      setInbox(all.filter((t) => t.to_device_id === myId));
      setSent(all.filter((t) => t.from_device_id === myId));
      setLoading(false);
    }

    load();

    const ch = supabase
      .channel("ovbridge_transfers_rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_transfers",
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  return { inbox, sent, loading };
}