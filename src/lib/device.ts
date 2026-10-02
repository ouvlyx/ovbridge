import { supabase } from "./supabase";
import { generateKeyPair, fingerprint } from "./crypto";

const STORAGE_KEY = "ovbridge_device_identity";
const CREATING_KEY = "ovbridge_device_creating";



export type DeviceIdentity = {
  deviceId: string;
  publicKey: string;
  privateKey: string;
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
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as DeviceIdentity) : null;
}

export function storeIdentity(id: DeviceIdentity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
}

export function clearIdentity() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Vérifie qu'un device local existe bien en DB et n'est pas révoqué.
 * Sinon, en crée un nouveau (première connexion ou après révocation).
 */
export async function ensureDeviceRegistered(
  userId: string
): Promise<DeviceIdentity> {
  // Verrou anti-double-exécution (StrictMode, reload rapide…)
  if (localStorage.getItem(CREATING_KEY)) {
    // Attend un peu et retente
    await new Promise((r) => setTimeout(r, 800));
    const id = getStoredIdentity();
    if (id) return id;
  }
  localStorage.setItem(CREATING_KEY, "1");

  try {
    const existing = getStoredIdentity();

    if (existing) {
      const { data } = await supabase
        .from("ovbridge_devices")
        .select("id, user_id, revoked")
        .eq("id", existing.deviceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (data && !data.revoked) {
        await supabase
          .from("ovbridge_devices")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", existing.deviceId);
        return existing;
      }
      clearIdentity();
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

    if (error) throw error;

    const identity: DeviceIdentity = {
      deviceId: data.id,
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
    };
    storeIdentity(identity);
    return identity;
  } finally {
    localStorage.removeItem(CREATING_KEY);
  }
}