import { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Signal } from "lucide-react";
import type { CallState, CallType } from "./useCallSession";

interface CallDialogProps {
  open: boolean;
  callState: CallState;
  callType: CallType;
  callerName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  netQuality: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export function CallDialog({
  open,
  callType,
  callerName,
  isMuted,
  isVideoOff,
  netQuality,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: CallDialogProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-ov-bg border-ov-border text-ov-text max-w-lg p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ov-border pb-3 mb-3">
          <div>
            <h3 className="font-bold text-sm text-ov-text">{callerName}</h3>
            <p className="text-[10px] text-ov-muted uppercase tracking-wider">
              Appel {callType === "video" ? "Vidéo" : "Audio"} Chiffré E2E
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ov-success font-medium bg-ov-success/10 px-2 py-1 rounded-full">
            <Signal className="w-3.5 h-3.5" />
            <span className="capitalize">{netQuality}</span>
          </div>
        </div>

        {/* CONTENEUR VIDÉO OU VAGUE AUDIO */}
        <div className="relative aspect-video bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-ov-border/40">
          {callType === "video" ? (
            <>
              {/* flux distant */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* flux local miniature */}
              <div className="absolute bottom-3 right-3 w-28 aspect-video bg-black/80 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-ov-primary/20 text-ov-primary mx-auto flex items-center justify-center font-bold text-2xl border border-ov-primary/40 animate-pulse">
                {callerName[0]?.toUpperCase() ?? "A"}
              </div>
              <p className="text-xs text-ov-muted">Communication audio chiffrée en cours…</p>
            </div>
          )}
        </div>

        {/* CONTRÔLES D'APPEL */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            size="icon"
            variant={isMuted ? "danger" : "outline"}
            onClick={onToggleMute}
            className="rounded-full w-12 h-12"
            title={isMuted ? "Activer le micro" : "Couper le micro"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {callType === "video" && (
            <Button
              size="icon"
              variant={isVideoOff ? "danger" : "outline"}
              onClick={onToggleVideo}
              className="rounded-full w-12 h-12"
              title={isVideoOff ? "Activer la caméra" : "Désactiver la caméra"}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}

          <Button
            size="icon"
            variant="danger"
            onClick={onEndCall}
            className="rounded-full w-14 h-14 bg-ov-danger hover:bg-ov-danger/90 text-white shadow-lg"
            title="Raccrocher"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
