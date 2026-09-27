import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";

export type Device = {
  id: string;
  user_id: string;
  name: string;
  platform: string | null;
  fingerprint: string | null;
  last_seen: string | null;
  approved: boolean;
  revoked: boolean;
  created_at: string;
};

export function useDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ovbridge_devices")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[useDevices]", error);
      return;
    }
    setDevices((data ?? []) as Device[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    const channel = supabase
      .channel("ovbridge_devices_rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_devices",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { devices, loading, refresh };
}