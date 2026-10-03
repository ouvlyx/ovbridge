import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import { encryptFileFor, decryptFileFrom } from "./crypto";
import { WorkspaceError, TransferError, CryptoError } from "./errors";

const BUCKET = "ovbridge_files";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  quota_bytes: number;
  used_bytes: number;
  created_at: string;
};

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

/**
 * Récupère ou initialise automatiquement le workspace de stockage personnel de l'utilisateur.
 */
export async function ensureWorkspace(userId: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from("ovbridge_workspaces")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new WorkspaceError("WORKSPACE_FETCH_FAILED", "Impossible de charger votre espace de stockage.", error.message, error);
  }

  if (data) {
    return data as Workspace;
  }

  // Crée un espace par défaut s'il n'existe pas encore
  const { data: created, error: createError } = await supabase
    .from("ovbridge_workspaces")
    .insert({
      owner_id: userId,
      name: "Mon espace personnel",
      quota_bytes: 100 * 1024 * 1024, // 100 Mo
      used_bytes: 0,
    })
    .select("*")
    .single();

  if (createError) {
    throw new WorkspaceError("WORKSPACE_CREATE_FAILED", "Échec de l'initialisation de votre espace personnel.", createError.message, createError);
  }

  return created as Workspace;
}

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
  if (upErr) {
    throw TransferError.uploadFailed(upErr.message, upErr);
  }

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
  if (error || !data) {
    throw TransferError.downloadFailed(error?.message ?? "Téléchargement échoué", error);
  }

  try {
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
  } catch (err) {
    throw CryptoError.decryptionFailed(
      err instanceof Error ? err.message : String(err),
      err
    );
  }
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
