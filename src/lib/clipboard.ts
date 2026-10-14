import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import {
  decryptFrom,
  decryptSymKey,
  decryptTextWithSymKey,
  encryptSymKey,
  encryptTextWithSymKey,
  generateSymKey,
} from "./crypto";
import { MAX_CLIPBOARD_SIZE_BYTES } from "./constants";
import { ClipboardError } from "./errors";

const MAX_ENCRYPTED_CLIPBOARD_SIZE_BYTES = 700_000;

export type ClipboardItem = {
  id: string;
  user_id: string;
  from_device_id: string;
  content_encrypted: string;
  nonce: string;
  encrypted_keys: Record<string, EncryptedClipboardKey> | null;
  preview: string | null;
  kind: "text" | "url" | "password" | "code";
  created_at: string;
  expires_at: string | null;
};

export type DecryptedClipboard = ClipboardItem & {
  content: string;
  decryptionError?: "legacy" | "unavailable" | "failed";
};

type EncryptedClipboardKey = {
  encrypted_key: string;
  nonce: string;
};

export function clipboardContentSizeBytes(content: string): number {
  if (content.length > MAX_CLIPBOARD_SIZE_BYTES) {
    return MAX_CLIPBOARD_SIZE_BYTES + 1;
  }
  return new TextEncoder().encode(content).byteLength;
}

export async function readLocalClipboardText(timeoutMs = 8000): Promise<string> {
  const readText = navigator.clipboard?.readText;
  if (!readText) throw ClipboardError.accessDenied();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      readText.call(navigator.clipboard),
      new Promise<string>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(ClipboardError.readTimeout()),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Détection de contenu sensible
// ---------------------------------------------------------------------------

export type SensitivityResult = {
  sensitive: boolean;
  reason: string | null;
};

const PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "mot de passe", regex: /(password|mot de passe|pwd|passwd)\s*[:=]/i },
  { name: "clé API", regex: /(api[_-]?key|secret|token|bearer)\s*[:=]/i },
  { name: "JWT", regex: /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/ },
  { name: "clé OpenAI", regex: /^sk-[A-Za-z0-9]{20,}$/ },
  { name: "clé AWS", regex: /^AKIA[0-9A-Z]{16}$/ },
  { name: "clé GitHub", regex: /^gh[pousr]_[A-Za-z0-9]{20,}$/ },
  { name: "carte bancaire", regex: /^\d{13,19}$/ },
  { name: "IBAN", regex: /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/ },
  { name: "clé privée", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "cvv", regex: /^cvv\s*[:=]\s*\d{3,4}/i },
];

export function checkSensitivity(content: string): SensitivityResult {
  const trimmed = content.trim();
  for (const { name, regex } of PATTERNS) {
    if (regex.test(trimmed)) {
      return { sensitive: true, reason: `Ce contenu ressemble à un ${name}.` };
    }
  }
  return { sensitive: false, reason: null };
}

export function detectKind(content: string): ClipboardItem["kind"] {
  const t = content.trim();
  if (/^https?:\/\//i.test(t)) return "url";
  if (/^\d{13,19}$/.test(t)) return "password";
  if (/[\n{};=]/.test(t) && t.length > 40) return "code";
  return "text";
}

// ---------------------------------------------------------------------------
// Envoi au presse-papiers partagé
// ---------------------------------------------------------------------------

export async function sendToSharedClipboard(
  userId: string,
  me: DeviceIdentity,
  content: string
): Promise<void> {
  if (clipboardContentSizeBytes(content) > MAX_CLIPBOARD_SIZE_BYTES) {
    throw ClipboardError.tooLarge(MAX_CLIPBOARD_SIZE_BYTES / 1024);
  }

  const { data: devices, error: devicesError } = await supabase
    .from("ovbridge_devices")
    .select("id, public_key")
    .eq("user_id", userId)
    .eq("revoked", false);

  if (devicesError) throw devicesError;
  const senderDevice = devices?.find((device) => device.id === me.deviceId);
  if (!senderDevice || senderDevice.public_key !== me.publicKey) {
    throw new Error(
      "La clé de cet appareil ne correspond plus à son enregistrement. Réappairez-le avant de partager."
    );
  }

  const symKey = await generateSymKey();
  const { ciphertext, nonce } = await encryptTextWithSymKey(content, symKey);
  const encryptedKeys: Record<string, EncryptedClipboardKey> = {};

  for (const device of devices) {
    const { encryptedKey, nonce: keyNonce } = await encryptSymKey(
      symKey,
      device.public_key,
      me.privateKey
    );
    encryptedKeys[device.id] = {
      encrypted_key: encryptedKey,
      nonce: keyNonce,
    };
  }

  if (
    new TextEncoder().encode(ciphertext).byteLength >
    MAX_ENCRYPTED_CLIPBOARD_SIZE_BYTES
  ) {
    throw new Error(
      "Le contenu chiffré dépasse la limite de stockage. Réduisez sa taille puis réessayez."
    );
  }

  const { error } = await supabase.from("ovbridge_clipboard").insert({
    user_id: userId,
    from_device_id: me.deviceId,
    content_encrypted: ciphertext,
    nonce,
    encrypted_keys: encryptedKeys,
    preview: null,
    kind: detectKind(content),
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Récupération + déchiffrement
// ---------------------------------------------------------------------------

export async function fetchClipboardHistory(
  me: DeviceIdentity,
  limit = 20
): Promise<DecryptedClipboard[]> {
  const { data, error } = await supabase
    .from("ovbridge_clipboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const items = (data ?? []) as ClipboardItem[];
  const senderDeviceIds = [...new Set(items.map((item) => item.from_device_id))];
  const { data: senderDevices, error: senderDevicesError } =
    senderDeviceIds.length > 0
      ? await supabase
          .from("ovbridge_devices")
          .select("id, public_key")
          .in("id", senderDeviceIds)
      : { data: [], error: null };

  if (senderDevicesError) throw senderDevicesError;

  const senderPublicKeys = new Map(
    (senderDevices ?? []).map((device) => [device.id, device.public_key])
  );

  const decrypted = await Promise.all(
    items.map(async (item) => {
      try {
        let content: string;

        if (item.encrypted_keys) {
          const encryptedKey = item.encrypted_keys[me.deviceId];
          if (!encryptedKey) {
            return {
              ...item,
              content: "[Contenu non disponible sur cet appareil]",
              decryptionError: "unavailable" as const,
            };
          }

          const senderPublicKey = senderPublicKeys.get(item.from_device_id);
          if (!senderPublicKey) {
            throw new Error("Clé publique de l'appareil expéditeur introuvable.");
          }

          const symKey = await decryptSymKey(
            encryptedKey.encrypted_key,
            encryptedKey.nonce,
            senderPublicKey,
            me.privateKey
          );
          content = await decryptTextWithSymKey(
            { ciphertext: item.content_encrypted, nonce: item.nonce },
            symKey
          );
        } else {
          if (item.from_device_id !== me.deviceId) {
            return {
              ...item,
              content: "[Ancien partage inaccessible sur cet appareil]",
              decryptionError: "legacy" as const,
            };
          }

          content = await decryptFrom(
            { ciphertext: item.content_encrypted, nonce: item.nonce },
            me.publicKey,
            me.privateKey
          );
        }

        return { ...item, content };
      } catch {
        return {
          ...item,
          content: "[Impossible à déchiffrer sur cet appareil]",
          decryptionError: "failed" as const,
        };
      }
    })
  );

  return decrypted;
}

export async function deleteClipboardItem(id: string) {
  const { error } = await supabase
    .from("ovbridge_clipboard")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function clearClipboardHistory() {
  const { error } = await supabase
    .from("ovbridge_clipboard")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Envoi rapide depuis le presse-papiers local
// ---------------------------------------------------------------------------

export type QuickShareResult =
  | { status: "empty" }
  | { status: "denied" }
  | { status: "sensitive"; reason: string; content: string }
  | { status: "sent" }
  | { status: "error"; message: string };

export async function quickShareFromLocalClipboard(
  userId: string,
  me: DeviceIdentity
): Promise<QuickShareResult> {
  try {
    if (!navigator.clipboard?.readText) {
      return { status: "denied" };
    }

    const text = await readLocalClipboardText();
    if (!text || !text.trim()) {
      return { status: "empty" };
    }
    if (clipboardContentSizeBytes(text) > MAX_CLIPBOARD_SIZE_BYTES) {
      return {
        status: "error",
        message: ClipboardError.tooLarge(MAX_CLIPBOARD_SIZE_BYTES / 1024).userMessage,
      };
    }

    const sensitivity = checkSensitivity(text);
    if (sensitivity.sensitive) {
      return {
        status: "sensitive",
        reason: sensitivity.reason ?? "Contenu sensible",
        content: text,
      };
    }

    await sendToSharedClipboard(userId, me, text);
    return { status: "sent" };
  } catch (e: any) {
    return { status: "error", message: e?.message ?? "Erreur" };
  }
}