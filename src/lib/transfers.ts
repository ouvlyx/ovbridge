import { supabase } from "./supabase";
import type { DeviceIdentity } from "./device";
import {
  encryptFor,
  decryptFrom,
  encryptFileFor,
  decryptFileFrom,
} from "./crypto";
import { getSpaceTargetDevices } from "./spaces";
import { TransferError, CryptoError } from "./errors";

const BUCKET = "ovbridge_files";

export type Transfer = {
  id: string;
  user_id: string;
  from_device_id: string;
  to_device_id: string | null;
  to_space_id: string | null;
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
  read_at: string | null;
  opened_at?: string | null;
};

// ---------------------------------------------------------------------------
// Cache local du texte et des fichiers envoyés (pour réouverture immédiate côté expéditeur)
// ---------------------------------------------------------------------------

const sentPlaintextCache = new Map<string, string>();
const sentFileBlobCache = new Map<string, Blob>();

export function cacheSentPlaintext(transferId: string, plaintext: string) {
  sentPlaintextCache.delete(transferId);
  sentPlaintextCache.set(transferId, plaintext);
  if (sentPlaintextCache.size > 200) {
    const oldestId = sentPlaintextCache.keys().next().value;
    if (oldestId) sentPlaintextCache.delete(oldestId);
  }
}

export function getSentPlaintext(transferId: string): string | null {
  return sentPlaintextCache.get(transferId) ?? null;
}

export function cacheSentFileBlob(transferId: string, fileBlob: Blob) {
  sentFileBlobCache.delete(transferId);
  sentFileBlobCache.set(transferId, fileBlob);
  if (sentFileBlobCache.size > 50) {
    const oldestId = sentFileBlobCache.keys().next().value;
    if (oldestId) sentFileBlobCache.delete(oldestId);
  }
}

export function getSentFileBlob(transferId: string): Blob | null {
  return sentFileBlobCache.get(transferId) ?? null;
}

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

  const { data, error } = await supabase
    .from("ovbridge_transfers")
    .insert({
      user_id: userId,
      from_device_id: me.deviceId,
      to_device_id: recipient.id,
      kind: "text",
      content: ciphertext,
      nonce,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (data?.id) cacheSentPlaintext(data.id, plaintext);
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
  const enc = await encryptFileFor(file, recipient.public_key, me.privateKey);

  const path = `${userId}/${crypto.randomUUID()}.enc`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, enc.ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("ovbridge_transfers")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (cleanupError) console.error("[sendFile] cleanup failed", cleanupError);
    throw error;
  }

  if (data?.id) cacheSentFileBlob(data.id, file);
}

// ---------------------------------------------------------------------------
// Réception
// ---------------------------------------------------------------------------

export async function decryptTransfer(
  tr: Transfer,
  me: DeviceIdentity,
  peerPublicKey: string
): Promise<{ text?: string; blob?: Blob }> {
  try {
    // Si c'est notre propre message texte en cache local
    if (tr.from_device_id === me.deviceId && tr.kind === "text") {
      const cached = getSentPlaintext(tr.id);
      if (cached) return { text: cached };
    }

    // Si c'est notre propre fichier en cache local
    if (tr.from_device_id === me.deviceId && tr.kind === "file") {
      const cachedBlob = getSentFileBlob(tr.id);
      if (cachedBlob) return { blob: cachedBlob };
    }

    if (tr.kind === "text") {
      const text = await decryptFrom(
        { ciphertext: tr.content!, nonce: tr.nonce! },
        peerPublicKey,
        me.privateKey
      );
      return { text };
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(tr.file_path!);
    if (error || !data) {
      throw TransferError.downloadFailed(error?.message, error);
    }

    const buf = new Uint8Array(await data.arrayBuffer());
    const plain = await decryptFileFrom(
      buf,
      tr.encrypted_key!,
      tr.nonce!,
      peerPublicKey,
      me.privateKey
    );

    return {
      blob: new Blob([new Uint8Array(plain)], {
        type: tr.mime_type ?? "application/octet-stream",
      }),
    };
  } catch (err) {
    if (err instanceof TransferError || err instanceof CryptoError) {
      throw err;
    }
    throw CryptoError.decryptionFailed(
      err instanceof Error ? err.message : String(err),
      err
    );
  }
}

export async function markAsRead(transferId: string) {
  const now = new Date().toISOString();
  await supabase
    .from("ovbridge_transfers")
    .update({ status: "read", read_at: now, opened_at: now })
    .eq("id", transferId);
}

export async function markFileAsOpened(transferId: string) {
  const now = new Date().toISOString();
  await supabase
    .from("ovbridge_transfers")
    .update({ status: "read", read_at: now, opened_at: now })
    .eq("id", transferId);
}

// ---------------------------------------------------------------------------
// Envoi vers un espace (fan-out)
// ---------------------------------------------------------------------------

export type FanoutResult = {
  sent: number;
  failed: number;
};

export async function sendTextToSpace(
  userId: string,
  me: DeviceIdentity,
  spaceId: string,
  plaintext: string
): Promise<FanoutResult> {
  const devices = await getSpaceTargetDevices(spaceId, userId);
  if (devices.length === 0) {
    throw new TransferError("SPACE_NO_RECIPIENT", "Aucun appareil destinataire dans cet espace");
  }

  let sent = 0;
  let failed = 0;

  for (const d of devices) {
    try {
      const { ciphertext, nonce } = await encryptFor(
        plaintext,
        d.public_key,
        me.privateKey
      );

      const { data, error } = await supabase
        .from("ovbridge_transfers")
        .insert({
          user_id: userId,
          from_device_id: me.deviceId,
          to_device_id: d.id,
          to_space_id: spaceId,
          kind: "text",
          content: ciphertext,
          nonce,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (data?.id) cacheSentPlaintext(data.id, plaintext);
      sent++;
    } catch (e) {
      console.error("[sendTextToSpace] fail for device", d.id, e);
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendFileToSpace(
  userId: string,
  me: DeviceIdentity,
  spaceId: string,
  file: File
): Promise<FanoutResult> {
  const devices = await getSpaceTargetDevices(spaceId, userId);
  if (devices.length === 0) {
    throw new Error("Aucun appareil destinataire dans cet espace");
  }

  let sent = 0;
  let failed = 0;

  for (const d of devices) {
    try {
      const enc = await encryptFileFor(file, d.public_key, me.privateKey);

      const path = `${userId}/space-${spaceId}/${crypto.randomUUID()}.enc`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, enc.ciphertext, {
          contentType: "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("ovbridge_transfers")
        .insert({
          user_id: userId,
          from_device_id: me.deviceId,
          to_device_id: d.id,
          to_space_id: spaceId,
          kind: "file",
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          encrypted_key: enc.encryptedKey,
          nonce: enc.nonce,
        })
        .select("id")
        .single();

      if (error) {
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove([path]);
        if (cleanupError) {
          console.error("[sendFileToSpace] cleanup failed", cleanupError);
        }
        throw error;
      }
      if (data?.id) cacheSentFileBlob(data.id, file);
      sent++;
    } catch (e) {
      console.error("[sendFileToSpace] fail for device", d.id, e);
      failed++;
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export type ConversationMessage = Transfer & {
  sender_name: string;
  sender_platform: string | null;
  sender_user_id: string;
  is_mine: boolean;
};

export async function getConversation(params: {
  myUserId: string;
  myDeviceId: string;
  scope: { kind: "space"; id: string } | { kind: "device"; id: string };
  limit?: number;
}): Promise<ConversationMessage[]> {
  const { myUserId, myDeviceId, scope, limit = 100 } = params;

  let query = supabase
    .from("ovbridge_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope.kind === "space") {
    query = query.eq("to_space_id", scope.id);
  } else {
    query = query.or(
      `and(from_device_id.eq.${myDeviceId},to_device_id.eq.${scope.id}),and(from_device_id.eq.${scope.id},to_device_id.eq.${myDeviceId})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const transfers = (data ?? []) as Transfer[];
  if (transfers.length === 0) return [];

  const deviceIds = Array.from(
    new Set([
      ...transfers.map((t) => t.from_device_id),
      ...transfers.map((t) => t.to_device_id).filter(Boolean),
    ])
  ) as string[];

  const { data: devicesData } = await supabase
    .from("ovbridge_devices")
    .select("id, name, platform, user_id")
    .in("id", deviceIds);

  const deviceMap: Record<
    string,
    { name: string; platform: string | null; user_id: string }
  > = {};
  devicesData?.forEach((d: any) => {
    deviceMap[d.id] = {
      name: d.name,
      platform: d.platform,
      user_id: d.user_id,
    };
  });

  return transfers
    .map((t) => {
      const sender = deviceMap[t.from_device_id];
      return {
        ...t,
        sender_name: sender?.name ?? "Inconnu",
        sender_platform: sender?.platform ?? null,
        sender_user_id: sender?.user_id ?? t.user_id,
        is_mine: t.user_id === myUserId && t.from_device_id === myDeviceId,
      };
    })
    .reverse();
}

export type ConversationSummary = {
  kind: "space" | "device";
  id: string;
  name: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  membersCount?: number;
};

export async function getConversationSummaries(params: {
  myDeviceId: string;
}): Promise<ConversationSummary[]> {
  const { myDeviceId } = params;

  const { data: spacesData, error: spacesError } = await supabase
    .from("ovbridge_spaces")
    .select("id, name");

  if (spacesError) {
    console.error("[getConversationSummaries] Erreur de chargement des espaces:", spacesError);
  }

  const result: ConversationSummary[] = [];

  for (const sp of spacesData ?? []) {
    const { data: msgs } = await supabase
      .from("ovbridge_transfers")
      .select("content, file_name, kind, created_at, read_at, to_device_id")
      .eq("to_space_id", sp.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const last = msgs?.[0];
    const { count } = await supabase
      .from("ovbridge_transfers")
      .select("id", { count: "exact", head: true })
      .eq("to_space_id", sp.id)
      .eq("to_device_id", myDeviceId)
      .is("read_at", null);
    const unread = count ?? 0;

    result.push({
      kind: "space",
      id: sp.id,
      name: sp.name,
      lastMessageAt: last?.created_at ?? null,
      lastMessagePreview: last
        ? last.kind === "file"
          ? `📄 ${last.file_name}`
          : "Message chiffré"
        : null,
      unreadCount: unread,
    });
  }

  const directDeviceIds = new Set<string>();

  const directMsgs: {
    from_device_id: string;
    to_device_id: string | null;
    content: string | null;
    file_name: string | null;
    kind: "text" | "file";
    created_at: string;
    read_at: string | null;
  }[] = [];

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("ovbridge_transfers")
      .select("from_device_id, to_device_id, content, file_name, kind, created_at, read_at")
      .or(`from_device_id.eq.${myDeviceId},to_device_id.eq.${myDeviceId}`)
      .is("to_space_id", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);

    if (error) {
      console.error("[getConversationSummaries] Erreur transferts directs:", error);
      break;
    }
    directMsgs.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  directMsgs.forEach((m) => {
    if (m.from_device_id !== myDeviceId) directDeviceIds.add(m.from_device_id);
    if (m.to_device_id && m.to_device_id !== myDeviceId)
      directDeviceIds.add(m.to_device_id);
  });

  let directDevicesData: { id: string; name: string }[] = [];
  if (directDeviceIds.size > 0) {
    const { data: devs, error: devErr } = await supabase
      .from("ovbridge_devices")
      .select("id, name")
      .in("id", Array.from(directDeviceIds));
    if (!devErr && devs) {
      directDevicesData = devs;
    }
  }

  for (const d of directDevicesData ?? []) {
    const msgsForThis = (directMsgs ?? []).filter(
      (m: any) =>
        (m.from_device_id === d.id && m.to_device_id === myDeviceId) ||
        (m.to_device_id === d.id && m.from_device_id === myDeviceId)
    );
    const last = msgsForThis[0];
    const { count } = await supabase
      .from("ovbridge_transfers")
      .select("id", { count: "exact", head: true })
      .eq("from_device_id", d.id)
      .eq("to_device_id", myDeviceId)
      .is("to_space_id", null)
      .is("read_at", null);
    const unread = count ?? 0;

    result.push({
      kind: "device",
      id: d.id,
      name: d.name,
      lastMessageAt: last?.created_at ?? null,
      lastMessagePreview: last
        ? last.kind === "file"
          ? `📄 ${last.file_name}`
          : "Message chiffré"
        : null,
      unreadCount: unread,
    });
  }

  result.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return result;
}