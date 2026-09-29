import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I, O, 0, 1 (ambigus)

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export function usePairing(userId: string | undefined) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paired, setPaired] = useState(false);

  const start = async () => {
    if (!userId) return;
    const identity = getStoredIdentity();
    if (!identity) return;

    setLoading(true);
    setPaired(false);

    const newCode = generateCode();
    const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase.rpc("ovbridge_create_pairing_token", {
      p_device_id: identity.deviceId,
      p_token: newCode,
      p_expires_at: exp,
    });

    if (error) {
      console.error("[usePairing]", error);
      setLoading(false);
      return;
    }

    setCode(newCode);
    setExpiresAt(exp);
    setLoading(false);
  };

  useEffect(() => {
    if (!code) return;
    const channel = supabase
      .channel(`pairing_${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ovbridge_pairing_tokens",
          filter: `token=eq.${code}`,
        },
        (payload: { new: { used_at: string | null } }) => {
          if (payload.new.used_at) setPaired(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code]);

  return { code, expiresAt, loading, paired, start };
}