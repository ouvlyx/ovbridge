import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import {
  decryptFileWithSymKey,
  decryptSymKey,
  encryptFileWithSymKey,
  encryptSymKey,
  generateSymKey,
} from "./crypto";

const BUCKET = "ovbridge_files";
const MAX_PROJECT_FILE_BYTES = 20 * 1024 * 1024;

type ProjectKeyRow = {
  device_id: string;
  wrapped_key: string;
  nonce: string;
  wrapped_by_public_key: string;
};

type ProjectDevice = {
  device_id: string;
  public_key: string;
};

export type ProjectFile = {
  id: string;
  space_id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number;
  storage_path: string;
  uploaded_by_device: string | null;
  created_at: string;
};

async function getProjectKeys(spaceId: string): Promise<ProjectKeyRow[]> {
  const { data, error } = await supabase
    .from("ovbridge_project_keys")
    .select("device_id, wrapped_key, nonce, wrapped_by_public_key")
    .eq("space_id", spaceId);

  if (error) throw error;
  return (data ?? []) as ProjectKeyRow[];
}

async function decryptProjectKey(
  keyRow: ProjectKeyRow,
  me: DeviceIdentity
): Promise<string> {
  return decryptSymKey(
    keyRow.wrapped_key,
    keyRow.nonce,
    keyRow.wrapped_by_public_key,
    me.privateKey
  );
}

async function getProjectDevices(spaceId: string): Promise<ProjectDevice[]> {
  const { data, error } = await supabase.rpc("ovbridge_project_devices", {
    p_space_id: spaceId,
  });

  if (error) throw error;
  return (data ?? []) as ProjectDevice[];
}

async function wrapProjectKeyForDevices(
  spaceId: string,
  projectKey: string,
  me: DeviceIdentity,
  knownKeys: ProjectKeyRow[]
): Promise<void> {
  const knownDeviceIds = new Set(knownKeys.map((key) => key.device_id));
  const devices = await getProjectDevices(spaceId);
  const missingDevices = devices.filter(
    (device) => !knownDeviceIds.has(device.device_id)
  );

  if (missingDevices.length === 0) return;

  const rows = await Promise.all(
    missingDevices.map(async (device) => {
      const { encryptedKey, nonce } = await encryptSymKey(
        projectKey,
        device.public_key,
        me.privateKey
      );

      return {
        space_id: spaceId,
        device_id: device.device_id,
        wrapped_key: encryptedKey,
        nonce,
        wrapped_by_public_key: me.publicKey,
      };
    })
  );

  const { error } = await supabase
    .from("ovbridge_project_keys")
    .upsert(rows, {
      onConflict: "space_id,device_id",
      ignoreDuplicates: true,
    });

  if (error) throw error;
}

/**
 * Project drive key is stored separately from the account's private workspace.
 * The first project member creates it; existing members can wrap it for newly
 * approved member devices.
 */
export async function getOrCreateProjectKey(
  spaceId: string,
  me: DeviceIdentity
): Promise<string> {
  let keys = await getProjectKeys(spaceId);
  const ownKey = keys.find((key) => key.device_id === me.deviceId);

  if (ownKey) {
    return decryptProjectKey(ownKey, me);
  }

  if (keys.length > 0) {
    throw new Error(
      "Un administrateur du projet doit synchroniser les clés avec cet appareil."
    );
  }

  if (!me.userId) {
    throw new Error("Le compte associé à cet appareil est introuvable.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("ovbridge_space_members")
    .select("role")
    .eq("space_id", spaceId)
    .eq("user_id", me.userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (membership?.role !== "admin") {
    throw new Error(
      "Un administrateur du projet doit initialiser son espace de fichiers."
    );
  }

  const devices = await getProjectDevices(spaceId);
  if (!devices.some((device) => device.device_id === me.deviceId)) {
    throw new Error("Cet appareil n'est pas approuvé pour ce projet.");
  }

  const projectKey = await generateSymKey();
  await wrapProjectKeyForDevices(spaceId, projectKey, me, keys);

  keys = await getProjectKeys(spaceId);
  const storedOwnKey = keys.find((key) => key.device_id === me.deviceId);
  if (!storedOwnKey) {
    throw new Error("Impossible d'initialiser la clé de chiffrement du projet.");
  }

  const canonicalKey = await decryptProjectKey(storedOwnKey, me);
  return canonicalKey;
}

export async function syncProjectKeysToMemberDevices(
  spaceId: string,
  me: DeviceIdentity
): Promise<number> {
  const keys = await getProjectKeys(spaceId);
  const ownKey = keys.find((key) => key.device_id === me.deviceId);

  if (!ownKey) {
    throw new Error(
      "Aucune clé de projet n'est disponible sur cet appareil. Demandez à un membre déjà autorisé de synchroniser les clés."
    );
  }

  const projectKey = await decryptProjectKey(ownKey, me);
  const devices = await getProjectDevices(spaceId);
  const knownDeviceIds = new Set(keys.map((key) => key.device_id));
  const missingCount = devices.filter(
    (device) => !knownDeviceIds.has(device.device_id)
  ).length;

  await wrapProjectKeyForDevices(spaceId, projectKey, me, keys);
  return missingCount;
}

export async function listProjectFiles(spaceId: string): Promise<ProjectFile[]> {
  const { data, error } = await supabase
    .from("ovbridge_project_files")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectFile[];
}

export async function uploadProjectFile(
  spaceId: string,
  userId: string,
  me: DeviceIdentity,
  file: File
): Promise<ProjectFile> {
  if (file.size > MAX_PROJECT_FILE_BYTES) {
    throw new Error("Le fichier dépasse la limite de 20 Mo.");
  }

  const projectKey = await getOrCreateProjectKey(spaceId, me);
  const { ciphertext } = await encryptFileWithSymKey(file, projectKey);
  const fileId = crypto.randomUUID();
  const path = `project/${spaceId}/${userId}/${fileId}.enc`;

  const { data: fileRow, error: insertError } = await supabase
    .from("ovbridge_project_files")
    .insert({
      id: fileId,
      space_id: spaceId,
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path: path,
      uploaded_by_device: me.deviceId,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    const { error: storageCleanupError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (storageCleanupError) {
      console.error(
        "[uploadProjectFile] Failed to remove encrypted object after upload failure:",
        storageCleanupError
      );
    }

    const { error: cleanupError } = await supabase
      .from("ovbridge_project_files")
      .delete()
      .eq("id", fileId);
    if (cleanupError) {
      console.error(
        "[uploadProjectFile] Failed to remove metadata after storage upload failure:",
        cleanupError
      );
    }
    throw uploadError;
  }

  return fileRow as ProjectFile;
}

export async function downloadProjectFile(
  file: ProjectFile,
  me: DeviceIdentity
): Promise<Blob> {
  const projectKey = await getOrCreateProjectKey(file.space_id, me);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(file.storage_path);

  if (error) throw error;
  if (!data) throw new Error("Le fichier du projet est introuvable.");

  const plaintext = await decryptFileWithSymKey(
    new Uint8Array(await data.arrayBuffer()),
    projectKey
  );

  return new Blob([new Uint8Array(plaintext)], {
    type: file.mime_type ?? "application/octet-stream",
  });
}

export async function deleteProjectFile(file: ProjectFile): Promise<void> {
  const { error: metadataError } = await supabase
    .from("ovbridge_project_files")
    .delete()
    .eq("id", file.id);

  if (metadataError) throw metadataError;

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([file.storage_path]);

  if (storageError) {
    throw new Error(
      `Le fichier a été retiré de la liste, mais le nettoyage du stockage a échoué : ${storageError.message}`
    );
  }
}
