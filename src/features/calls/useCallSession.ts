import { useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { toast } from "sonner";

export type CallType = "audio" | "video";
export type CallState = "idle" | "calling" | "incoming" | "connected" | "ended";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useCallSession(targetId?: string, isSpace = false) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [callerName, setCallerName] = useState("Appelant");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [netQuality, setNetQuality] = useState<"excellente" | "moyenne" | "faible">("excellente");

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  const me = getStoredIdentity();

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallState("idle");
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: e.candidate, from: me?.deviceId },
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        remoteStreamRef.current = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
        setNetQuality("excellente");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setNetQuality("faible");
        toast.warning("Connexion d'appel instable.");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [me?.deviceId]);

  const startCall = async (type: CallType) => {
    if (!me || !targetId) return;
    setCallType(type);
    setCallState("calling");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const channelName = isSpace ? `call_space_${targetId}` : `call_dev_${targetId}`;
      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.to === me.deviceId && pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            setCallState("connected");
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.from !== me.deviceId && pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn(e);
            }
          }
        })
        .on("broadcast", { event: "end-call" }, () => {
          toast.info("L'appel a pris fin.");
          cleanupCall();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: {
                offer,
                type,
                from: me.deviceId,
                fromName: me.deviceId.slice(0, 8),
                to: targetId,
              },
            });
          }
        });
    } catch (err: any) {
      toast.error("Impossible d'accéder à la caméra ou au microphone.");
      cleanupCall();
    }
  };

  const acceptCall = async (offerPayload: any) => {
    if (!me) return;
    setCallType(offerPayload.type);
    setCallState("connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: offerPayload.type === "video",
      });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offerPayload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "answer",
          payload: { answer, to: offerPayload.from, from: me.deviceId },
        });
      }
    } catch (err) {
      toast.error("Échec du démarrage du flux audio/vidéo.");
      cleanupCall();
    }
  };

  const endCall = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "end-call",
        payload: { from: me?.deviceId },
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsVideoOff((prev) => !prev);
    }
  };

  return {
    callState,
    callType,
    callerName,
    isMuted,
    isVideoOff,
    netQuality,
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo,
    setCallerName,
  };
}
