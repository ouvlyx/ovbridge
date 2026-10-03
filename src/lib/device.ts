import { supabase } from "./supabase";
import { generateKeyPair, fingerprint } from "./crypto";
import { DeviceError, isNetworkError, NetworkError } from "./errors";

const STORAGE_KEY = "ovbridge_device_identity";
const CREATING_KEY = "ovbridge_device_creating";



export type DeviceIdentity = {
  deviceId: string;
  publicKey: string;
  privateKey: string;
  userId?: string;
};

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/macintosh|windows|linux/.test(ua)) return "desktop";
  return "web";
}

function detectName(): string {
  const ua = navigator.userAgent;

  // Cas Android classiques
  const androidMatch = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\))/i);
  if (androidMatch && androidMatch[1] && androidMatch[1].length > 1) {
    return androidMatch[1].trim();
  }
  if (/android/i.test(ua)) return "Android";

  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/windows/i.test(ua)) return "PC Windows";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux";

  // Fallback : nom d'OS depuis platform
  const p = (navigator as any).userAgentData?.platform || navigator.platform;
  if (p) return p;

  return "Appareil";
}


export function getStoredIdentity(): DeviceIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.deviceId === "string" && typeof parsed.publicKey === "string" && typeof parsed.privateKey === "string") {
      return parsed as DeviceIdentity;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeIdentity(id: DeviceIdentity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
  } catch (e) {
    console.error("[storeIdentity] échec d'écriture dans localStorage:", e);
  }
}

export function clearIdentity() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("[clearIdentity] échec de suppression dans localStorage:", e);
  }
}

/**
 * Vérifie qu'un device local existe bien en DB et n'est pas révoqué.
 * En cas de panne de connexion Internet, conserve l'identité locale plutôt que de la supprimer.
 * Sinon, en crée un nouveau (première connexion ou après révocation confirmée).
 */
export async function ensureDeviceRegistered(
  userId: string
): Promise<DeviceIdentity> {
  const creatingKey = `${CREATING_KEY}:${userId}`;

  // Verrou anti-double-exécution (StrictMode, reload rapide…)
  if (localStorage.getItem(creatingKey)) {
    await new Promise((r) => setTimeout(r, 800));
    const id = getStoredIdentity();
    if (id?.userId === userId) return id;
  }
  localStorage.setItem(creatingKey, "1");

  try {
    const existing = getStoredIdentity();

    if (existing) {
      const { data, error } = await supabase
        .from("ovbridge_devices")
        .select("id, user_id, revoked")
        .eq("id", existing.deviceId)
        .eq("user_id", userId)
        .maybeSingle();

      // En cas d'erreur réseau, ne pas détruire les clés privées locales !
      if (error) {
        if (isNetworkError(error) && existing.userId === userId) {
          return existing;
        }
        if (isNetworkError(error)) {
          throw new NetworkError(
            "Impossible de vérifier l'appareil pour ce compte. Rétablissez Internet puis réessayez.",
            "L'identité locale n'est pas associée de façon vérifiable au compte courant.",
            error
          );
        }
        throw error;
      }

      if (data) {
        if (data.revoked) {
          clearIdentity();
          throw DeviceError.revoked();
        }

        const identity = { ...existing, userId };
        if (existing.userId !== userId) storeIdentity(identity);

        // Met à jour la date de dernière activité (en tâche de fond non bloquante)
        supabase
          .from("ovbridge_devices")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", existing.deviceId)
          .then();

        return identity;
      }

      // Ne remplacer l'identité existante qu'après la création réussie du nouvel appareil.
    }

    const kp = await generateKeyPair();
    const fp = await fingerprint(kp.publicKey);

    const { data, error } = await supabase
      .from("ovbridge_devices")
      .insert({
        user_id: userId,
        name: detectName(),
        platform: detectPlatform(),
        public_key: kp.publicKey,
        fingerprint: fp,
        approved: true,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const identity: DeviceIdentity = {
      deviceId: data.id,
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      userId,
    };
    storeIdentity(identity);
    return identity;
  } finally {
    localStorage.removeItem(creatingKey);
  }
}