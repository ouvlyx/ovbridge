import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

const CACHE_DIR = "ovbridge-cache";
const INDEX_FILE = `${CACHE_DIR}/index.json`;

export type CacheEntry = {
  fileId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number;
  localPath: string;
  cachedAt: string;
};

type CacheIndex = Record<string, CacheEntry>;

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const isNative = Capacitor.isNativePlatform();
const memoryBlobCache = new Map<string, Blob>();

async function ensureDir() {
  if (!isNative) return;
  try {
    await Filesystem.mkdir({
      path: CACHE_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // existe déjà
  }
}

async function readIndex(): Promise<CacheIndex> {
  if (!isNative) {
    try {
      return JSON.parse(localStorage.getItem("ovbridge_cache_index") ?? "{}");
    } catch {
      return {};
    }
  }
  try {
    const { data } = await Filesystem.readFile({
      path: INDEX_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(data as string);
  } catch {
    return {};
  }
}

async function writeIndex(index: CacheIndex) {
  if (!isNative) {
    try {
      localStorage.setItem("ovbridge_cache_index", JSON.stringify(index));
    } catch {
      // quota ou désactivé
    }
    return;
  }
  await Filesystem.writeFile({
    path: INDEX_FILE,
    directory: Directory.Data,
    data: JSON.stringify(index),
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

export async function getCacheIndex(): Promise<CacheIndex> {
  return readIndex();
}

export async function isCached(fileId: string): Promise<boolean> {
  if (!isNative) {
    return memoryBlobCache.has(fileId);
  }
  const idx = await readIndex();
  return !!idx[fileId];
}

export async function getCachedPath(fileId: string): Promise<string | null> {
  if (!isNative) {
    const b = memoryBlobCache.get(fileId);
    return b ? URL.createObjectURL(b) : null;
  }
  const idx = await readIndex();
  return idx[fileId]?.localPath ?? null;
}

/**
 * Enregistre un blob dans le cache local.
 * Retourne le chemin local ou URL objet en mémoire.
 */
export async function cacheBlob(
  fileId: string,
  fileName: string,
  mimeType: string | null,
  blob: Blob
): Promise<string> {
  await ensureDir();

  if (!isNative) {
    memoryBlobCache.set(fileId, blob);
    return URL.createObjectURL(blob);
  }

  const base64 = await blobToBase64(blob);
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  const safeName = `${fileId}.${ext}`;

  await Filesystem.writeFile({
    path: `${CACHE_DIR}/${safeName}`,
    directory: Directory.Data,
    data: base64,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path: `${CACHE_DIR}/${safeName}`,
    directory: Directory.Data,
  });

  const idx = await readIndex();
  idx[fileId] = {
    fileId,
    name: fileName,
    mimeType,
    sizeBytes: blob.size,
    localPath: uri,
    cachedAt: new Date().toISOString(),
  };
  await writeIndex(idx);

  return uri;
}

/**
 * Récupère un blob depuis le cache
 */
export async function readCachedBlob(
  fileId: string,
  fileName: string
): Promise<Blob | null> {
  if (!isNative) {
    return memoryBlobCache.get(fileId) ?? null;
  }

  const idx = await readIndex();
  const entry = idx[fileId];
  if (!entry) return null;

  try {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const safeName = `${fileId}.${ext}`;
    const { data } = await Filesystem.readFile({
      path: `${CACHE_DIR}/${safeName}`,
      directory: Directory.Data,
    });

    return base64ToBlob(data as string, entry.mimeType ?? "application/octet-stream");
  } catch {
    return null;
  }
}

/**
 * Supprime un fichier du cache
 */
export async function uncacheFile(fileId: string) {
  if (!isNative) {
    memoryBlobCache.delete(fileId);
    return;
  }

  const idx = await readIndex();
  const entry = idx[fileId];
  if (!entry) return;

  try {
    const fileName = entry.localPath.split("/").pop();
    if (fileName) {
      await Filesystem.deleteFile({
        path: `${CACHE_DIR}/${fileName}`,
        directory: Directory.Data,
      });
    }
  } catch {
    // ignoré si déjà supprimé
  }
  delete idx[fileId];
  await writeIndex(idx);
}

/**
 * Vide tout le cache
 */
export async function clearCache() {
  if (!isNative) {
    memoryBlobCache.clear();
    return;
  }

  try {
    await Filesystem.rmdir({
      path: CACHE_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // rien
  }
  await writeIndex({});
}

// ---------------------------------------------------------------------------
// Export (partage natif)
// ---------------------------------------------------------------------------

export async function exportFile(
  fileId: string,
  fileName: string
): Promise<void> {
  if (!isNative) {
    const blob = memoryBlobCache.get(fileId);
    if (!blob) throw new Error("Fichier non trouvé dans le cache");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const idx = await readIndex();
  const entry = idx[fileId];
  if (!entry) throw new Error("Fichier non trouvé dans le cache");

  await Share.share({
    title: fileName,
    url: entry.localPath,
    dialogTitle: "Exporter le fichier",
  });
}

// ---------------------------------------------------------------------------
// Helpers base64
// ---------------------------------------------------------------------------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
