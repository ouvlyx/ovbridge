import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Signal,
  Volume2,
  ArrowLeft,
} from "lucide-react";
import { useCall } from "./CallContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STATUS_LABEL = {
  calling: "Appel en cours…",
  incoming: "Appel entrant",
  connecting: "Connexion…",
  connected: "",
} as const;

export function CallDialog() {
  const {
    callState,
    callType,
    peerName,
    isMuted,
    isVideoOff,
    netQuality,
    localStream,
    remoteStream,
    isRemoteVideoEnabled,
    durationSec,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    upgradeToVideo,
    downgradeToAudio,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    const audio = remoteAudioRef.current;
    if (video) video.srcObject = remoteStream;
    if (audio) audio.srcObject = remoteStream;
    if (remoteStream) {
      if (audio) audio.play().catch(() => {});
      if (video) video.play().catch(() => {});
    }
  }, [remoteStream]);

  if (callState === "idle") return null;

  const isVideo = callType === "video";
  const inCall = callState === "connecting" || callState === "connected";
  const statusLabel =
    callState === "connected"
      ? formatDuration(durationSec)
      : STATUS_LABEL[callState];
  const showRemoteVideo = isVideo && inCall && isRemoteVideoEnabled;

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-ov-bg via-[#0a0e1a] to-ov-bg flex flex-col">
      {/* Audio caché pour les appels audio et vidéo */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={endCall}
          aria-label="Réduire"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          {inCall && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                netQuality === "excellente" && "bg-ov-success/15 text-ov-success",
                netQuality === "moyenne" && "bg-yellow-500/15 text-yellow-500",
                netQuality === "faible" && "bg-ov-danger/15 text-ov-danger"
              )}
            >
              <Signal className="w-3 h-3" />
              <span className="capitalize">{netQuality}</span>
            </div>
          )}
        </div>

        <div className="w-10" />
      </header>

      {/* Main */}
      <main className="flex-1 relative overflow-hidden">
        {/* Vidéo distante (grande) */}
        {showRemoteVideo && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Avatar + infos (audio, ou vidéo distante désactivée) */}
        {!showRemoteVideo && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            {/* Avatar */}
            <div className="relative">
              <div
                className={cn(
                  "w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-ov-primary to-ov-accent",
                  "text-white font-bold text-5xl md:text-6xl",
                  "shadow-2xl shadow-ov-primary/30",
                  !inCall && "animate-pulse"
                )}
              >
                {peerName[0]?.toUpperCase() ?? "?"}
              </div>
              {inCall && (
                <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-ov-success border-4 border-ov-bg" />
              )}
            </div>

            {/* Nom + statut */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">
                {peerName}
              </h2>
              <p className="text-sm md:text-base text-white/60 font-mono">
                {statusLabel || "\u00A0"}
              </p>
            </div>

            {/* Indicateur audio */}
            {inCall && (
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Chiffré de bout en bout</span>
              </div>
            )}
          </div>
        )}

        {/* Vidéo locale (petite, en overlay) */}
        {isVideo && inCall && (
          <div
            className={cn(
              "absolute z-10 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10",
              "w-28 h-40 md:w-40 md:h-56",
              "bottom-4 right-4 md:bottom-6 md:right-6"
            )}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-ov-bg flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-white/60" />
              </div>
            )}
          </div>
        )}

        {/* Overlay nom en haut si vidéo distante affichée */}
        {showRemoteVideo && (
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
            <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="text-white text-sm font-medium">{peerName}</span>
              <span className="text-white/60 text-xs font-mono">
                {statusLabel}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Contrôles */}
      <footer className="p-6 md:p-8 safe-area-bottom">
        {callState === "incoming" ? (
          /* Écran de sonnerie */
          <div className="flex items-center justify-center gap-12 md:gap-20">
            <div className="flex flex-col items-center gap-3">
              <Button
                size="icon"
                onClick={rejectCall}
                aria-label="Refuser"
                className={cn(
                  "rounded-full w-16 h-16 md:w-20 md:h-20",
                  "bg-ov-danger hover:bg-ov-danger/90 text-white",
                  "shadow-lg shadow-ov-danger/30"
                )}
              >
                <PhoneOff className="w-7 h-7 md:w-8 md:h-8" />
              </Button>
              <span className="text-white/60 text-xs">Refuser</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="icon"
                onClick={() => void acceptCall()}
                aria-label="Répondre"
                className={cn(
                  "rounded-full w-16 h-16 md:w-20 md:h-20",
                  "bg-ov-success hover:bg-ov-success/90 text-white",
                  "shadow-lg shadow-ov-success/30",
                  "animate-pulse"
                )}
              >
                {isVideo ? (
                  <Video className="w-7 h-7 md:w-8 md:h-8" />
                ) : (
                  <Mic className="w-7 h-7 md:w-8 md:h-8" />
                )}
              </Button>
              <span className="text-white/60 text-xs">Répondre</span>
            </div>
          </div>
        ) : (
          /* Contrôles en appel */
          <div className="flex items-center justify-center gap-3 md:gap-5">
            {/* Micro */}
            <ControlButton
              active={!isMuted}
              onClick={toggleMute}
              label={isMuted ? "Activer le micro" : "Couper le micro"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </ControlButton>

            {/* Bascule vidéo (indépendante) */}
            {inCall && (
              <ControlButton
                active={isVideo && !isVideoOff}
                onClick={() => {
                  if (isVideo) {
                    if (isVideoOff) {
                      toggleVideo();
                    } else {
                      void downgradeToAudio();
                    }
                  } else {
                    void upgradeToVideo();
                  }
                }}
                label={isVideo ? "Passer en audio" : "Passer en vidéo"}
              >
                {isVideo && !isVideoOff ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </ControlButton>
            )}

            {/* Raccrocher */}
            <Button
              size="icon"
              onClick={endCall}
              aria-label="Raccrocher"
              className={cn(
                "rounded-full w-16 h-16 md:w-16 md:h-16",
                "bg-ov-danger hover:bg-ov-danger/90 text-white",
                "shadow-lg shadow-ov-danger/30"
              )}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}

/* ---------- Bouton de contrôle circulaire ---------- */
function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center",
        "transition-all active:scale-95",
        active
          ? "bg-white/10 hover:bg-white/20 text-white"
          : "bg-white text-ov-bg hover:bg-white/90"
      )}
    >
      {children}
    </button>
  );
}