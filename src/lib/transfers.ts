import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import {
  encryptFor,
  decryptFrom,
  encryptFileFor,
  decryptFileFrom,
} from "./crypto";

const BUCKET = "ovbridge_files";

export type Transfer = {
  id: string;
  user_id: string;
  from_device_id: string;
  to_device_id: string | null;
  kind: "text" | "file";
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  encrypted_key: string | null;
  nonce: string | null;
  status: "pending" | "delivered" | "read" | "expired";
  created_at: string;
};

// ---------------------------------------------------------------------------
// Envoi texte
// ---------------------------------------------------------------------------

export async function sendText(
  userId: string,
  me: DeviceIdentity,
  recipient: { id: string; public_key: string },
  plaintext: string
) {
  const { ciphertext, nonce } = await encryptFor(
    plaintext,
    recipient.public_key,
    me.privateKey
  );

  const { error } = await supabase.from("ovbridge_transfers").insert({
    user_id: userId,
    from_device_id: me.deviceId,
    to_device_id: recipient.id,
    kind: "text",
    content: ciphertext,
    nonce,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Envoi fichier
// ---------------------------------------------------------------------------

export async function sendFile(
  userId: string,
  me: DeviceIdentity,
  recipient: { id: string; public_key: string },
  file: File
) {
  const enc = await encryptFileFor(
    file,
    recipient.public_key,
    me.privateKey
  );

  const path = `${userId}/${crypto.randomUUID()}.enc`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, enc.ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { error } = await supabase.from("ovbridge_transfers").insert({
    user_id: userId,
    from_device_id: me.deviceId,
    to_device_id: recipient.id,
    kind: "file",
    file_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || "application/octet-stream",
    encrypted_key: enc.encryptedKey,
    nonce: enc.nonce,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Réception
// ---------------------------------------------------------------------------

export async function decryptTransfer(
  tr: Transfer,
  me: DeviceIdentity,
  senderPublicKey: string
): Promise<{ text?: string; blob?: Blob }> {
  if (tr.kind === "text") {
    const text = await decryptFrom(
      { ciphertext: tr.content!, nonce: tr.nonce! },
      senderPublicKey,
      me.privateKey
    );
    return { text };
  }

  // fichier
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(tr.file_path!);
  if (error || !data) throw error ?? new Error("Téléchargement échoué");

  const buf = new Uint8Array(await data.arrayBuffer());
  const plain = await decryptFileFrom(
    buf,
    tr.encrypted_key!,
    tr.nonce!,
    senderPublicKey,
    me.privateKey
  );

return {
  blob: new Blob([new Uint8Array(plain)], {
    type: tr.mime_type ?? "application/octet-stream",
  }),
};
}

export async function markAsRead(transferId: string) {
  await supabase
    .from("ovbridge_transfers")
    .update({ status: "read" })
    .eq("id", transferId);
}