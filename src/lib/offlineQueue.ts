import { toast } from "sonner";
import { getStoredIdentity } from "./device";
import { sendText, sendFile, sendTextToSpace, sendFileToSpace } from "./transfers";

const OFFLINE_QUEUE_KEY = "ovbridge_offline_queue";

export type QueuedTransfer = {
  id: string;
  userId: string;
  kind: "text" | "file";
  targetKind: "device" | "space";
  targetId: string;
  targetPublicKey?: string;
  content?: string;
  fileName?: string;
  fileMime?: string;
  fileBase64?: string;
  createdAt: string;
};

export function getOfflineQueue(): QueuedTransfer[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedTransfer[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("[saveOfflineQueue]", e);
  }
}

export function queueOfflineTransfer(transfer: Omit<QueuedTransfer, "id" | "createdAt">): QueuedTransfer {
  const item: QueuedTransfer = {
    ...transfer,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const queue = getOfflineQueue();
  queue.push(item);
  saveOfflineQueue(queue);

  toast.info("Envoi conservé hors-ligne", {
    description: "Il sera automatiquement transmis dès le rétablissement de votre connexion.",
  });

  return item;
}

/**
 * Convertit un File en Base64 pour le stockage hors-ligne
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Re-convertit une Data URL Base64 en File
 */
export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const arr = base64.split(",");
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mimeType });
}

let isSyncing = false;

/**
 * Synchronise et transmet automatiquement tous les transferts en attente dans la file hors-ligne
 */
export async function flushOfflineQueue(): Promise<{ sent: number; failed: number }> {
  if (isSyncing || !navigator.onLine) return { sent: 0, failed: 0 };
  const queue = getOfflineQueue();
  if (queue.length === 0) return { sent: 0, failed: 0 };

  isSyncing = true;
  const me = getStoredIdentity();
  if (!me) {
    isSyncing = false;
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const remaining: QueuedTransfer[] = [];

  for (const item of queue) {
    try {
      if (item.targetKind === "device") {
        if (item.kind === "text" && item.content) {
          await sendText(item.userId, me, { id: item.targetId, public_key: item.targetPublicKey! }, item.content);
        } else if (item.kind === "file" && item.fileBase64 && item.fileName) {
          const file = base64ToFile(item.fileBase64, item.fileName, item.fileMime || "application/octet-stream");
          await sendFile(item.userId, me, { id: item.targetId, public_key: item.targetPublicKey! }, file);
        }
      } else {
        if (item.kind === "text" && item.content) {
          await sendTextToSpace(item.userId, me, item.targetId, item.content);
        } else if (item.kind === "file" && item.fileBase64 && item.fileName) {
          const file = base64ToFile(item.fileBase64, item.fileName, item.fileMime || "application/octet-stream");
          await sendFileToSpace(item.userId, me, item.targetId, file);
        }
      }
      sent++;
    } catch (e) {
      console.error("[flushOfflineQueue] Échec de transmission pour", item.id, e);
      failed++;
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  isSyncing = false;

  if (sent > 0) {
    toast.success(`Synchro hors-ligne terminée : ${sent} transfert(s) transmis !`);
  }

  return { sent, failed };
}

// Auto-déclenchement au retour de la connexion internet
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushOfflineQueue();
  });
}
