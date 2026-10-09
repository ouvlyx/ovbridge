import {
  Download,
  FileText,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  Play,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, getMediaKind, isVocalNote } from "@/lib/mediaType";

type Props = {
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  url?: string | null;
  mine: boolean;
  busy?: boolean;
  onOpen: () => void;
  onDownload: () => void;
};

export function MessageMedia({
  name,
  mimeType,
  sizeBytes,
  url,
  mine,
  busy,
  onOpen,
  onDownload,
}: Props) {
  const kind = getMediaKind(mimeType, name);
  const isVocal = isVocalNote(name);

  /* ---------- vocal : lecteur inline ---------- */
  if (isVocal && url) {
    return (
      <div className="min-w-[220px] space-y-1">
        <div className="flex items-center gap-2">
          <Music
            className={cn(
              "w-4 h-4 shrink-0",
              mine ? "text-white/80" : "text-ov-accent"
            )}
          />
          <span className="text-xs font-medium opacity-90">Message vocal</span>
        </div>
        <audio
          src={url}
          controls
          className="w-full h-9 rounded-lg"
          preload="metadata"
        />
      </div>
    );
  }

  /* ---------- image : aperçu cliquable ---------- */
  if (kind === "image" && url) {
    return (
      <div className="space-y-1.5 -mx-1">
        <button
          onClick={onOpen}
          className="block rounded-lg overflow-hidden max-w-full"
        >
          <img
            src={url}
            alt={name}
            className="max-h-64 object-cover hover:opacity-95 transition-opacity"
            loading="lazy"
          />
        </button>
        <div className="flex items-center gap-2 px-1">
          <ImageIcon className="w-3 h-3 opacity-60 shrink-0" />
          <span className="text-[10px] opacity-70 truncate">{name}</span>
          <span className="text-[10px] opacity-50 shrink-0">
            {formatBytes(sizeBytes)}
          </span>
        </div>
      </div>
    );
  }

  /* ---------- vidéo : vignette + play ---------- */
  if (kind === "video" && url) {
    return (
      <div className="space-y-1.5 -mx-1">
        <button
          onClick={onOpen}
          className="relative block rounded-lg overflow-hidden max-w-full group"
        >
          <video
            src={url}
            className="max-h-64 max-w-full"
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center">
              <Play
                className="w-6 h-6 text-white ml-0.5"
                fill="white"
              />
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 px-1">
          <VideoIcon className="w-3 h-3 opacity-60 shrink-0" />
          <span className="text-[10px] opacity-70 truncate">{name}</span>
          <span className="text-[10px] opacity-50 shrink-0">
            {formatBytes(sizeBytes)}
          </span>
        </div>
      </div>
    );
  }

  /* ---------- PDF / autre fichier : carte ---------- */
  const Icon =
    kind === "pdf"
      ? FileText
      : kind === "audio"
      ? Music
      : kind === "video"
      ? VideoIcon
      : FileText;

  const typeLabel =
    kind === "pdf"
      ? "PDF"
      : kind === "audio"
      ? "Audio"
      : kind === "video"
      ? "Vidéo"
      : "Fichier";

  return (
    <div className="min-w-[220px] space-y-2">
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          mine ? "bg-white/10" : "bg-ov-bg"
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            mine ? "bg-white/20" : "bg-ov-primary/15"
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5",
              mine ? "text-white" : "text-ov-primary"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{name}</p>
          <p className="text-[10px] opacity-70">
            {typeLabel}
            {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {!url ? (
          <button
            onClick={onOpen}
            disabled={busy}
            className={cn(
              "text-xs px-3 py-2 rounded-lg w-full font-medium transition-colors flex items-center justify-center gap-1.5",
              mine
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-ov-bg hover:bg-ov-primary/10 text-ov-primary",
              busy && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
              </>
            ) : (
              <>Ouvrir</>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={onOpen}
              className={cn(
                "text-xs px-3 py-2 rounded-lg flex-1 font-medium transition-colors",
                mine
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-ov-bg hover:bg-ov-primary/10 text-ov-primary"
              )}
            >
              Ouvrir
            </button>
            <button
              onClick={onDownload}
              className={cn(
                "text-xs px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center",
                mine
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-ov-bg hover:bg-ov-primary/10 text-ov-primary"
              )}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}