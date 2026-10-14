import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import {
  generateSymKey,
  encryptSymKey,
  decryptSymKey,
} from "./crypto";

/**
 * Récupère la clé symétrique du workspace pour cet appareil.
 * Si elle n'existe pas : la génère et la partage à tous les devices du compte.
 */
export async function getOrCreateWorkspaceKey(
  workspaceId: string,
  userId: string,
  me: DeviceIdentity
): Promise<string> {
  // 1. Cherche ma clé existante pour ce workspace
  const { data: existing, error: existingError } = await supabase
    .from("ovbridge_workspace_keys")
    .select("wrapped_key, nonce, wrapped_by_public_key")
    .eq("workspace_id", workspaceId)
    .eq("device_id", me.deviceId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.wrapped_key && existing.wrapped_by_public_key) {
    try {
      return await decryptSymKey(
        existing.wrapped_key,
        existing.nonce,
        existing.wrapped_by_public_key,
        me.privateKey
      );
    } catch (err) {
      console.warn("[getOrCreateWorkspaceKey] Déchiffrement échoué pour la clé existante", err);
    }
  }

  // 2. Si une clé existe déjà pour ce workspace sur un autre appareil, ne JAMAIS générer une nouvelle clé aléatoire !
  const { data: allWorkspaceKeys, error: allKeysError } = await supabase
    .from("ovbridge_workspace_keys")
    .select("workspace_id, device_id, wrapped_key, nonce, wrapped_by_public_key")
    .eq("workspace_id", workspaceId);

  if (allKeysError) throw allKeysError;

  if (allWorkspaceKeys && allWorkspaceKeys.length > 0) {
    // Tenter de déchiffrer une clé si emballée par moi-même
    for (const keyRow of allWorkspaceKeys) {
      if (
        keyRow.device_id === me.deviceId &&
        keyRow.wrapped_by_public_key === me.publicKey &&
        keyRow.wrapped_key
      ) {
        try {
          const symKey = await decryptSymKey(
            keyRow.wrapped_key,
            keyRow.nonce,
            me.publicKey,
            me.privateKey
          );
          // Auto-réparation : s'enregistrer soi-même avec la clé unique du workspace
          await shareWorkspaceKeyWithNewDevice(workspaceId, me.deviceId, symKey, me);
          return symKey;
        } catch {
          /* continue */
        }
      }
    }

    throw new Error(
      "La clé de cet espace de stockage a été générée par un autre appareil. Réappairez cet appareil pour synchroniser vos clés."
    );
  }

  // 3. Aucune clé n'existe pour ce workspace (premier fichier/premier device) → créer la clé maîtresse unique et la partager à tous les appareils du compte
  return await createAndShareSymKey(workspaceId, userId, me);
}

/**
 * Crée une nouvelle clé symétrique et la chiffre pour TOUS les appareils du compte.
 */
async function createAndShareSymKey(
  workspaceId: string,
  userId: string,
  me: DeviceIdentity
): Promise<string> {
  const symKey = await generateSymKey();

  const { data: devices, error: devicesError } = await supabase
    .from("ovbridge_devices")
    .select("id, public_key")
    .eq("user_id", userId)
    .eq("revoked", false);

  if (devicesError) throw devicesError;
  if (!devices || devices.length === 0) {
    throw new Error("Aucun appareil trouvé");
  }

  const rows = await Promise.all(
    devices.map(async (d: any) => {
      const { encryptedKey, nonce } = await encryptSymKey(
        symKey,
        d.public_key,
        me.privateKey
      );
      return {
        workspace_id: workspaceId,
        device_id: d.id,
        wrapped_key: encryptedKey,
        nonce,
        wrapped_by_public_key: me.publicKey,
      };
    })
  );

  const { error } = await supabase
    .from("ovbridge_workspace_keys")
    .insert(rows);

  if (error) throw error;

  return symKey;
}

/**
 * Enregistre la clé symétrique pour un nouvel appareil.
 */
export async function shareWorkspaceKeyWithNewDevice(
  workspaceId: string,
  newDeviceId: string,
  symKeyB64: string,
  me: DeviceIdentity
): Promise<void> {
  const { data: newDevice, error: deviceError } = await supabase
    .from("ovbridge_devices")
    .select("public_key")
    .eq("id", newDeviceId)
    .maybeSingle();

  if (deviceError) throw deviceError;
  if (!newDevice) throw new Error("Nouvel appareil introuvable");

  const { data: existingKey, error: keyLookupError } = await supabase
    .from("ovbridge_workspace_keys")
    .select("device_id")
    .eq("workspace_id", workspaceId)
    .eq("device_id", newDeviceId)
    .maybeSingle();

  if (keyLookupError) throw keyLookupError;
  if (existingKey) return;

  const { encryptedKey, nonce } = await encryptSymKey(
    symKeyB64,
    newDevice.public_key,
    me.privateKey
  );

  const { error } = await supabase
    .from("ovbridge_workspace_keys")
    .insert({
      workspace_id: workspaceId,
      device_id: newDeviceId,
      wrapped_key: encryptedKey,
      nonce,
      wrapped_by_public_key: me.publicKey,
    });

  if (error) throw error;
}