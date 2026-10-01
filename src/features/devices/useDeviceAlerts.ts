import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Écoute les insertions de nouveaux devices de l'utilisateur.
 * Affiche un toast si le device n'est pas celui qu'on est en train d'enregistrer.
 */
export function useDeviceAlerts(currentDeviceId: string | null) {
  const { user } = useAuth();
  const recentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

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
          const d = payload.new as {
            id: string;
            name: string;
            platform: string | null;
          };

          // Ignore si c'est le device qu'on vient de créer soi-même
          if (currentDeviceId && d.id === currentDeviceId) return;

          // Ignore les doublons
          if (recentIds.current.has(d.id)) return;
          recentIds.current.add(d.id);

          toast(`📱 Nouvel appareil connecté`, {
            description: `${d.name} vient de rejoindre votre pont.`,
            duration: 8000,
            action: {
              label: "Voir",
              onClick: () => {
                window.location.href = "/devices";
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentDeviceId]);
}