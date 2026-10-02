import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import { encryptFileFor, decryptFileFrom } from "./crypto";

const BUCKET = "ovbridge_files";

export type WorkspaceFile = {
  id: string;
  workspace_id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number;
  storage_path: string;
  encrypted_key: string;
  nonce: string;
  content_hash: string | null;
  uploaded_by_device: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function uploadWorkspaceFile(
  userId: string,
  workspaceId: string,
  me: DeviceIdentity,
  file: File
): Promise<WorkspaceFile> {
  const enc = await encryptFileFor(file, me.publicKey, me.privateKey);

  const path = `workspace/${userId}/${workspaceId}/${crypto.randomUUID()}.enc`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, enc.ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("ovbridge_workspace_files")
    .insert({
      workspace_id: workspaceId,
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path: path,
      encrypted_key: enc.encryptedKey,
      nonce: enc.nonce,
      uploaded_by_device: me.deviceId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }

  // Met à jour used_bytes du workspace
  await supabase.rpc("ovbridge_add_workspace_usage", {
    p_workspace_id: workspaceId,
    p_delta: file.size,
  });

  return data as WorkspaceFile;
}

// ---------------------------------------------------------------------------
// Téléchargement + déchiffrement
// ---------------------------------------------------------------------------

export async function downloadWorkspaceFile(
  wf: WorkspaceFile,
  me: DeviceIdentity
): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(wf.storage_path);
  if (error || !data) throw error ?? new Error("Téléchargement échoué");

  const buf = new Uint8Array(await data.arrayBuffer());
  const plain = await decryptFileFrom(
    buf,
    wf.encrypted_key,
    wf.nonce,
    me.publicKey,
    me.privateKey
  );

  return new Blob([new Uint8Array(plain)], {
    type: wf.mime_type ?? "application/octet-stream",
  });
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

export async function deleteWorkspaceFile(wf: WorkspaceFile) {
  await supabase.storage.from(BUCKET).remove([wf.storage_path]);

  const { error } = await supabase
    .from("ovbridge_workspace_files")
    .delete()
    .eq("id", wf.id);
  if (error) throw error;

  await supabase.rpc("ovbridge_add_workspace_usage", {
    p_workspace_id: wf.workspace_id,
    p_delta: -wf.size_bytes,
  });
}