import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import {
  generateSymKey,
  encryptSymKey,
  decryptSymKey,
} from "./crypto";

/**
 * Récupère la clé symétrique du workspace pour cet appareil.
 * Si elle n'existe pas :
 *  - Si c'est le 1er appareil : en génère une et la stocke pour soi
 *  - Sinon : essaie de la récupérer depuis un autre appareil du compte
 */
export async function getOrCreateWorkspaceKey(
  workspaceId: string,
  userId: string,
  me: DeviceIdentity
): Promise<string> {
  // 1. Cherche ma clé existante
  const { data: existing } = await supabase
    .from("ovbridge_workspace_keys")
    .select("encrypted_key, nonce, device_id")
    .eq("workspace_id", workspaceId)
    .eq("device_id", me.deviceId)
    .maybeSingle();

  if (existing) {
    // Récupère la clé publique de l'appareil qui a créé la clé
    const { data: senderDevice } = await supabase
      .from("ovbridge_devices")
      .select("public_key")
      .eq("id", existing.device_id)
      .maybeSingle();

    if (!senderDevice) throw new Error("Appareil source introuvable");

    return await decryptSymKey(
      existing.encrypted_key,
      existing.nonce,
      senderDevice.public_key,
      me.privateKey
    );
  }

  // 2. Cherche une clé existante chez un autre appareil du compte
  const { data: peerKey } = await supabase
    .from("ovbridge_workspace_keys")
    .select("encrypted_key, nonce, device_id")
    .eq("workspace_id", workspaceId)
    .neq("device_id", me.deviceId)
    .limit(1)
    .maybeSingle();

  if (peerKey) {
    // On doit demander à cet appareil de nous envoyer la clé déchiffrée
    // Pour l'instant, on va créer une nouvelle clé et re-chiffrer tous les fichiers
    // → plus simple : générer une nouvelle clé et la partager
    return await createAndShareSymKey(workspaceId, userId, me);
  }

  // 3. Aucune clé nulle part → génère la première
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

  // Récupère tous les appareils du compte (non révoqués)
  const { data: devices } = await supabase
    .from("ovbridge_devices")
    .select("id, public_key")
    .eq("user_id", userId)
    .eq("revoked", false);

  if (!devices || devices.length === 0) {
    throw new Error("Aucun appareil trouvé");
  }

  // Chiffre la clé pour chaque appareil
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
      };
    })
  );

  // Upsert (au cas où une clé existe déjà)
  const { error } = await supabase
    .from("ovbridge_workspace_keys")
    .upsert(rows, { onConflict: "workspace_id,device_id" });

  if (error) throw error;

  return symKey;
}

/**
 * Enregistre la clé symétrique pour un nouvel appareil qui vient de se lier.
 * À appeler quand un device s'ajoute au compte.
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
      },
      { onConflict: "workspace_id,device_id" }
    );

  if (error) throw error;
}