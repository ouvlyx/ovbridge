import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import { encryptFor, decryptFrom } from "./crypto";
import { MAX_CLIPBOARD_SIZE_BYTES } from "./constants";
import { ClipboardError } from "./errors";

export type ClipboardItem = {
  id: string;
  user_id: string;
  from_device_id: string;
  content_encrypted: string;
  nonce: string;
  preview: string | null;
  kind: "text" | "url" | "password" | "code";
  created_at: string;
  expires_at: string | null;
};

export type DecryptedClipboard = ClipboardItem & {
  content: string;
};

export function clipboardContentSizeBytes(content: string): number {
  if (content.length > MAX_CLIPBOARD_SIZE_BYTES) {
    return MAX_CLIPBOARD_SIZE_BYTES + 1;
  }
  return new TextEncoder().encode(content).byteLength;
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

  const { ciphertext, nonce } = await encryptFor(
    content,
    me.publicKey,
    me.privateKey
  );

  const { error } = await supabase.from("ovbridge_clipboard").insert({
    user_id: userId,
    from_device_id: me.deviceId,
    content_encrypted: ciphertext,
    nonce,
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

  const decrypted = await Promise.all(
    items.map(async (item) => {
      try {
        const content = await decryptFrom(
          { ciphertext: item.content_encrypted, nonce: item.nonce },
          me.publicKey,
          me.privateKey
        );
        return { ...item, content };
      } catch {
        return { ...item, content: "[Impossible à déchiffrer]" };
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

    const text = await navigator.clipboard.readText();
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