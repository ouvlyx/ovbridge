import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Signal, Video, VideoOff } from "lucide-react";
import { useCall } from "./CallContext";

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
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteMediaRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = localVideoRef.current;
    if (el) el.srcObject = localStream;
  }, [localStream, callState]);

  // Le flux distant est toujours branché sur un élément média (même en audio seul),
  // sinon on n'entend rien.
  useEffect(() => {
    const el = remoteMediaRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) el.play().catch(() => {});
  }, [remoteStream, callState]);

  const open = callState !== "idle";
  const isVideo = callType === "video";
  const inCall = callState === "connecting" || callState === "connected";
  const statusLabel = callState === "idle" ? "" : STATUS_LABEL[callState];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-ov-bg border-ov-border text-ov-text max-w-lg p-4 sm:p-6 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-ov-border pb-3 mb-3 pr-8">
          <div className="min-w-0">
            <DialogTitle className="font-bold text-sm text-ov-text truncate">{peerName}</DialogTitle>
            <DialogDescription className="text-[10px] text-ov-muted uppercase tracking-wider">
              Appel {isVideo ? "vidéo" : "audio"} · {statusLabel || "Chiffré (DTLS-SRTP)"}
            </DialogDescription>
          </div>
          {callState === "connected" && (
            <div className="flex items-center gap-1.5 text-xs text-ov-success font-medium bg-ov-success/10 px-2 py-1 rounded-full">
              <Signal className="w-3.5 h-3.5" />
              <span className="capitalize">{netQuality}</span>
            </div>
          )}
        </div>

        <div className="relative aspect-video bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-ov-border/40">
          {/* Élément distant : visible en vidéo, caché (mais audible) en audio */}
          <video
            ref={remoteMediaRef}
            autoPlay
            playsInline
            className={isVideo && inCall ? "w-full h-full object-cover" : "hidden"}
          />

          {isVideo && inCall ? (
            <div className="absolute bottom-3 right-3 w-28 aspect-video bg-black/80 rounded-xl overflow-hidden border border-white/20 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div
                className={`w-16 h-16 rounded-full bg-ov-primary/20 text-ov-primary mx-auto flex items-center justify-center font-bold text-2xl border border-ov-primary/40 ${
                  callState === "connected" ? "" : "animate-pulse"
                }`}
              >
                {peerName[0]?.toUpperCase() ?? "A"}
              </div>
              <p className="text-xs text-ov-muted">
                {callState === "connected"
                  ? "Communication audio chiffrée en cours…"
                  : statusLabel}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 pt-4">
          {callState === "incoming" ? (
            <>
              <Button
                size="icon"
                variant="danger"
                onClick={rejectCall}
                className="rounded-full w-14 h-14"
                title="Refuser"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                size="icon"
                onClick={() => void acceptCall()}
                className="rounded-full w-14 h-14 bg-ov-success hover:bg-ov-success/90 text-white"
                title="Répondre"
              >
                <Phone className="w-6 h-6" />
              </Button>
            </>
          ) : (
            <>
              {inCall && (
                <Button
                  size="icon"
                  variant={isMuted ? "danger" : "outline"}
                  onClick={toggleMute}
                  className="rounded-full w-12 h-12"
                  title={isMuted ? "Activer le micro" : "Couper le micro"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              )}
              {inCall && isVideo && (
                <Button
                  size="icon"
                  variant={isVideoOff ? "danger" : "outline"}
                  onClick={toggleVideo}
                  className="rounded-full w-12 h-12"
                  title={isVideoOff ? "Activer la caméra" : "Désactiver la caméra"}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="danger"
                onClick={endCall}
                className="rounded-full w-14 h-14"
                title="Raccrocher"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
