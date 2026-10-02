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
  const userId = user?.id;
  const [deviceSnapshot, setDeviceSnapshot] = useState<{
    userId: string;
    devices: Device[];
  } | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const devices =
    deviceSnapshot && deviceSnapshot.userId === userId
      ? deviceSnapshot.devices
      : [];
  const loading = Boolean(userId && loadedUserId !== userId);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDeviceSnapshot(null);
      return;
    }
    const { data, error } = await supabase
      .from("ovbridge_devices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[useDevices]", error);
      return;
    }
    setDeviceSnapshot({ userId, devices: (data ?? []) as Device[] });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoadedUserId(userId);
    })();

    const channel = supabase
      .channel(`ovbridge_devices_rt_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_devices",
          filter: `user_id=eq.${userId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { devices, loading, refresh };
}