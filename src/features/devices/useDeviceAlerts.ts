import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/useAuth";
import { sendUniversalNotification } from "@/lib/notifications";

export function useDeviceAlerts(myDeviceId: string | null) {
  const { user } = useAuth();
  const knownDeviceIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !myDeviceId) return;

    // Charger les appareils existants pour ne notifier que sur un NOUVEAU
    supabase
      .from("ovbridge_devices")
      .select("id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        data?.forEach((d) => knownDeviceIds.current.add(d.id));
      });

    const channel = supabase
      .channel("device_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ovbridge_devices",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newDevice = payload.new as {
            id: string;
            name: string;
            platform: string | null;
          };

          if (newDevice.id === myDeviceId) return;
          if (knownDeviceIds.current.has(newDevice.id)) return;
          knownDeviceIds.current.add(newDevice.id);

          sendUniversalNotification({
            title: "📱 Nouvel appareil lié",
            body: `Un nouvel appareil ("${newDevice.name}") a rejoint votre pont.`,
            type: "device",
          });
        }
      )
      .subscribe();

    return () => {
      if (channel && channel.state !== "closed") {
        supabase.removeChannel(channel);
      }
    };
  }, [user, myDeviceId]);
}
