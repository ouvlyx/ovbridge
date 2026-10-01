import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/AuthProvider";

type Options = {
  /** ID de la conversation actuellement ouverte (format "space:xxx" ou "device:yyy") */
  currentChat?: string | null;
};

export function useTransferAlerts({ currentChat }: Options = {}) {
  const { user } = useAuth();
  const recentIds = useRef<Set<string>>(new Set());
  const chatRef = useRef<string | null | undefined>(currentChat);

  useEffect(() => {
    chatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    if (!user) return;
    const me = getStoredIdentity();
    if (!me) return;

    const channel = supabase
      .channel("transfer_alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ovbridge_transfers",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const t = payload.new as {
            id: string;
            from_device_id: string;
            to_device_id: string | null;
            to_space_id: string | null;
            kind: "text" | "file";
            file_name: string | null;
          };

          // Ignore mes propres envois
          if (t.from_device_id === me.deviceId) return;

          // Ignore si ce n'est pas pour moi
          if (t.to_device_id !== me.deviceId) return;

          // Ignore les doublons
          if (recentIds.current.has(t.id)) return;
          recentIds.current.add(t.id);

          // Ignore si j'ai déjà cette conversation ouverte
          const chatKey = t.to_space_id
            ? `space:${t.to_space_id}`
            : `device:${t.from_device_id}`;
          if (chatRef.current === chatKey) return;

          // Récupère le nom de l'expéditeur
          const { data: sender } = await supabase
            .from("ovbridge_devices")
            .select("name")
            .eq("id", t.from_device_id)
            .maybeSingle();

          const senderName = sender?.name ?? "Quelqu'un";
          const title =
            t.kind === "file" ? "📎 Nouveau fichier" : "💬 Nouveau message";
          const desc = t.kind === "file"
            ? `${senderName} vous a envoyé ${t.file_name ?? "un fichier"}`
            : `${senderName} vous a envoyé un message`;

          const url = t.to_space_id
            ? `/messages/space/${t.to_space_id}`
            : `/messages/device/${t.from_device_id}`;

          toast(title, {
            description: desc,
            duration: 8000,
            action: {
              label: "Ouvrir",
              onClick: () => {
                window.location.href = url;
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}