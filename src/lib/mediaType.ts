export type MediaKind = "image" | "video" | "audio" | "pdf" | "other";

export function getMediaKind(mimeType: string | null, fileName?: string | null): MediaKind {
  const mime = (mimeType ?? "").toLowerCase();
  const name = (fileName ?? "").toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/.test(name)) {
    return "image";
  }
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|avi|mkv|m4v|3gp)$/.test(name)) {
    return "video";
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/.test(name) || name.startsWith("vocal_")) {
    return "audio";
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  return "other";
}

export function isVocalNote(fileName: string | null | undefined): boolean {
  return !!fileName?.startsWith("vocal_");
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}