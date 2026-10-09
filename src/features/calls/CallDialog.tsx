import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Signal,
  Users,
} from "lucide-react";
import { useCall } from "./CallContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMaxParticipants } from "@/lib/callLimits";

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

function PeerVideo({ stream, name }: { stream: MediaStream | null; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;
    if (stream) {
      ref.current?.play().catch(() => {});
      audioRef.current?.play().catch(() => {});
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="relative bg-black/60 rounded-2xl overflow-hidden aspect-video border border-white/10">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <video
        ref={ref}
        autoPlay
        playsInline
        className={cn(
          "w-full h-full object-cover",
          !hasVideo && "hidden"
        )}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ov-primary to-ov-accent flex items-center justify-center text-white font-bold text-2xl">
            {name[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
        <span className="text-white text-xs font-medium">{name}</span>
      </div>
    </div>
  );
}

export function CallDialog() {
  const {
    callState,
    callType,
    peerName,
    isMuted,
    isVideoOff,
    netQuality,
    localStream,
    peers,
    durationSec,
    participantCount,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    upgradeToVideo,
    downgradeToAudio,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  if (callState === "idle") return null;

  const isVideo = callType === "video";
  const inCall = callState === "connecting" || callState === "connected";
  const isGroup = peers.length > 1;
  const maxParticipants = getMaxParticipants(callType);
  const statusLabel =
    callState === "connected"
      ? formatDuration(durationSec)
      : STATUS_LABEL[callState];

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-ov-bg via-[#0a0e1a] to-ov-bg flex flex-col">
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="w-10" />

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

          {isGroup && (
            <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
              <Users className="w-3 h-3" />
              <span>
                {participantCount}/{maxParticipants}
              </span>
            </div>
          )}
        </div>

        <div className="w-10" />
      </header>

      <main className="flex-1 relative overflow-hidden px-4 pb-4">
        {inCall && peers.length > 0 ? (
          <div
            className={cn(
              "grid gap-2 h-full",
              peers.length === 1 && "grid-cols-1",
              peers.length === 2 && "grid-cols-2",
              peers.length === 3 && "grid-cols-2 grid-rows-2",
              peers.length >= 4 && "grid-cols-2 grid-rows-2"
            )}
          >
            {peers.slice(0, 4).map((p) => (
              <PeerVideo key={p.deviceId} stream={p.stream} name={p.name} />
            ))}

            {/* Vignette locale */}
            {isVideo && (
              <div className="relative bg-black/60 rounded-2xl overflow-hidden aspect-video border-2 border-ov-primary/40">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-ov-bg flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-white/60" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                  <span className="text-white text-xs font-medium">Vous</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
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
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">
                {peerName}
              </h2>
              <p className="text-sm md:text-base text-white/60 font-mono">
                {statusLabel || "\u00A0"}
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="p-6 md:p-8">
        {callState === "incoming" ? (
          <div className="flex items-center justify-center gap-12 md:gap-20">
            <div className="flex flex-col items-center gap-3">
              <Button
                size="icon"
                onClick={rejectCall}
                className="rounded-full w-16 h-16 md:w-20 md:h-20 bg-ov-danger hover:bg-ov-danger/90 shadow-lg shadow-ov-danger/30"
              >
                <PhoneOff className="w-7 h-7 md:w-8 md:h-8" />
              </Button>
              <span className="text-white/60 text-xs">Refuser</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="icon"
                onClick={() => void acceptCall()}
                className="rounded-full w-16 h-16 md:w-20 md:h-20 bg-ov-success hover:bg-ov-success/90 shadow-lg shadow-ov-success/30 animate-pulse"
              >
                <Video className="w-7 h-7 md:w-8 md:h-8" />
              </Button>
              <span className="text-white/60 text-xs">Rejoindre</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 md:gap-5">
            <ControlButton
              active={!isMuted}
              onClick={toggleMute}
              label={isMuted ? "Activer le micro" : "Couper le micro"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </ControlButton>

            {inCall && (
              <ControlButton
                active={isVideo && !isVideoOff}
                onClick={() => {
                  if (isVideo) void downgradeToAudio();
                  else void upgradeToVideo();
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

            <Button
              size="icon"
              onClick={endCall}
              className="rounded-full w-16 h-16 bg-ov-danger hover:bg-ov-danger/90 shadow-lg shadow-ov-danger/30"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}

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