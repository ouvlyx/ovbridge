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
  const { data: existing } = await supabase
    .from("ovbridge_workspace_keys")
    .select("encrypted_key, nonce, wrapped_by_device_id")
    .eq("workspace_id", workspaceId)
    .eq("device_id", me.deviceId)
    .maybeSingle();

  if (existing?.encrypted_key && existing.wrapped_by_device_id) {
    const senderDeviceId = existing.wrapped_by_device_id;
    const senderPubKey =
      senderDeviceId === me.deviceId
        ? me.publicKey
        : (
            await supabase
              .from("ovbridge_devices")
              .select("public_key")
              .eq("id", senderDeviceId)
              .maybeSingle()
          ).data?.public_key;

    if (senderPubKey) {
      try {
        return await decryptSymKey(
          existing.encrypted_key,
          existing.nonce,
          senderPubKey,
          me.privateKey
        );
      } catch (err) {
        console.warn("[getOrCreateWorkspaceKey] Déchiffrement échoué pour la clé existante", err);
      }
    }
  }

  // 2. Si une clé existe déjà pour ce workspace sur un autre appareil, ne JAMAIS générer une nouvelle clé aléatoire !
  const { data: allWorkspaceKeys } = await supabase
    .from("ovbridge_workspace_keys")
    .select("workspace_id, device_id, encrypted_key, nonce, wrapped_by_device_id")
    .eq("workspace_id", workspaceId);

  if (allWorkspaceKeys && allWorkspaceKeys.length > 0) {
    // Tenter de déchiffrer une clé si emballée par moi-même
    for (const keyRow of allWorkspaceKeys) {
      if (keyRow.wrapped_by_device_id === me.deviceId && keyRow.encrypted_key) {
        try {
          const symKey = await decryptSymKey(
            keyRow.encrypted_key,
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

  const { data: devices } = await supabase
    .from("ovbridge_devices")
    .select("id, public_key")
    .eq("user_id", userId)
    .eq("revoked", false);

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
        encrypted_key: encryptedKey,
        nonce,
        wrapped_by_device_id: me.deviceId,
      };
    })
  );

  const { error } = await supabase
    .from("ovbridge_workspace_keys")
    .upsert(rows, { onConflict: "workspace_id,device_id" });

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
  const { data: newDevice } = await supabase
    .from("ovbridge_devices")
    .select("public_key")
    .eq("id", newDeviceId)
    .maybeSingle();

  if (!newDevice) throw new Error("Nouvel appareil introuvable");

  const { encryptedKey, nonce } = await encryptSymKey(
    symKeyB64,
    newDevice.public_key,
    me.privateKey
  );

  const { error } = await supabase
    .from("ovbridge_workspace_keys")
    .upsert(
      {
        workspace_id: workspaceId,
        device_id: newDeviceId,
        encrypted_key: encryptedKey,
        nonce,
        wrapped_by_device_id: me.deviceId,
      },
      { onConflict: "workspace_id,device_id" }
    );

  if (error) throw error;
}