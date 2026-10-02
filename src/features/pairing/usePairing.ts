import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureDeviceRegistered } from "@/lib/device";
import { friendlyError } from "@/lib/errors";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export function usePairing(userId: string | undefined) {
  const [pairingState, setPairingState] = useState<{
    userId: string;
    code: string | null;
    expiresAt: string | null;
    paired: boolean;
    error: string | null;
  } | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const currentState = pairingState?.userId === userId ? pairingState : null;
  const code = currentState?.code ?? null;
  const expiresAt = currentState?.expiresAt ?? null;
  const paired = currentState?.paired ?? false;
  const error = currentState?.error ?? null;
  const loading = Boolean(userId && loadingUserId === userId);

  const start = async () => {
    if (!userId || loadingUserId === userId) return;

    const activeUserId = userId;
    setLoadingUserId(activeUserId);
    setPairingState((previous) =>
      previous?.userId === activeUserId
        ? { ...previous, paired: false, error: null }
        : {
            userId: activeUserId,
            code: null,
            expiresAt: null,
            paired: false,
            error: null,
          }
    );

    try {
      const identity = await ensureDeviceRegistered(activeUserId);
      const newCode = generateCode();
      const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Insert direct (plus de RPC)
      const { error: createError } = await supabase
        .from("ovbridge_pairing_tokens")
        .insert({
          user_id: activeUserId,
          created_by_device: identity.deviceId,
          token: newCode,
          expires_at: exp,
        });

      if (createError) throw createError;

      setPairingState({
        userId: activeUserId,
        code: newCode,
        expiresAt: exp,
        paired: false,
        error: null,
      });
    } catch (startError) {
      setPairingState((previous) =>
        previous?.userId === activeUserId
          ? { ...previous, error: friendlyError(startError) }
          : {
              userId: activeUserId,
              code: null,
              expiresAt: null,
              paired: false,
              error: friendlyError(startError),
            }
      );
    } finally {
      setLoadingUserId((current) =>
        current === activeUserId ? null : current
      );
    }
  };

  useEffect(() => {
    if (!userId || !code) return;
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
          if (!payload.new.used_at) return;
          setPairingState((previous) =>
            previous?.userId === userId && previous.code === code
              ? { ...previous, paired: true }
              : previous
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, userId]);

  return { code, expiresAt, loading, paired, error, start };
}