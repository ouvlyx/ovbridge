import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes, getMediaKind } from "@/lib/mediaType";

export type MediaItem = {
  id: string;
  url: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

type Props = {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
};

export function MediaViewer({ items, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const item = items[index];
  const kind = getMediaKind(item?.mimeType, item?.name);

  /* ---------- reset au changement d'item ---------- */
  useEffect(() => {
    setZoom(1);
    setVideoPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [index]);

  /* ---------- navigation clavier ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      if (e.key === "ArrowRight" && index < items.length - 1) setIndex(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, items.length, onClose]);

  /* ---------- téléchargement ---------- */
  const download = () => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.name;
    a.click();
  };

  const openExternal = () => {
    window.open(item.url, "_blank", "noopener");
  };

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setVideoPlaying(true);
    } else {
      v.pause();
      setVideoPlaying(false);
    }
  };

  const seek = (time: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = time;
    const a = audioRef.current;
    if (a) a.currentTime = time;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate max-w-[40vw] sm:max-w-md">
              {item.name}
            </p>
            <p className="text-xs text-white/50">
              {formatBytes(item.sizeBytes)}
              {items.length > 1 && ` · ${index + 1} / ${items.length}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {kind === "image" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                disabled={zoom <= 1}
                className="text-white/80 hover:text-white hover:bg-white/10"
                title="Zoom arrière"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                disabled={zoom >= 4}
                className="text-white/80 hover:text-white hover:bg-white/10"
                title="Zoom avant"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              {zoom > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom(1)}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  title="Réinitialiser le zoom"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              )}
            </>
          )}

          {kind === "pdf" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openExternal}
              className="text-white/80 hover:text-white hover:bg-white/10"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={download}
            className="text-white/80 hover:text-white hover:bg-white/10"
            title="Télécharger"
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 relative overflow-hidden flex items-center justify-center">
        {kind === "image" && (
          <img
            src={item.url}
            alt={item.name}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />
        )}

        {kind === "video" && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={item.url}
              className="max-w-full max-h-full"
              playsInline
              onClick={toggleVideo}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
            />

            {/* Overlay play */}
            {!videoPlaying && (
              <button
                onClick={toggleVideo}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </button>
            )}
          </div>
        )}

        {kind === "audio" && (
          <div className="w-full max-w-md px-6">
            <div className="text-center space-y-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-ov-primary to-ov-accent flex items-center justify-center">
                <Volume2 className="w-16 h-16 text-white" />
              </div>
              <p className="text-white font-medium truncate">{item.name}</p>
              <audio
                ref={audioRef}
                src={item.url}
                controls
                autoPlay
                className="w-full"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
            </div>
          </div>
        )}

        {kind === "pdf" && (
          <iframe
            src={item.url}
            className="w-full h-full bg-white"
            title={item.name}
          />
        )}

        {kind === "other" && (
          <div className="text-center space-y-4 px-6">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
              <Download className="w-12 h-12 text-white/60" />
            </div>
            <p className="text-white font-medium">{item.name}</p>
            <p className="text-sm text-white/50">
              Ce format ne peut pas être prévisualisé.
            </p>
            <Button
              onClick={download}
              className="bg-ov-primary hover:bg-ov-primaryHover"
            >
              <Download className="w-4 h-4 mr-2" /> Télécharger
            </Button>
          </div>
        )}

        {/* Navigation */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => setIndex(index - 1)}
              disabled={index === 0}
              className={cn(
                "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10",
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full",
                "bg-black/50 hover:bg-black/70 backdrop-blur-md",
                "flex items-center justify-center transition-colors",
                "disabled:opacity-20 disabled:cursor-not-allowed"
              )}
              aria-label="Précédent"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setIndex(index + 1)}
              disabled={index === items.length - 1}
              className={cn(
                "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10",
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full",
                "bg-black/50 hover:bg-black/70 backdrop-blur-md",
                "flex items-center justify-center transition-colors",
                "disabled:opacity-20 disabled:cursor-not-allowed"
              )}
              aria-label="Suivant"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </main>

      {/* Barre de progression (vidéo) */}
      {kind === "video" && duration > 0 && (
        <div className="p-3 sm:p-4 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVideo}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
            >
              {videoPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 accent-ov-primary"
            />

            <span className="text-xs text-white/70 font-mono shrink-0 min-w-[80px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !muted;
                  setMuted(!muted);
                }
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}