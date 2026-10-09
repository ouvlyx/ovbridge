import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { sendUniversalNotification } from "@/lib/notifications";
import { useAuth } from "@/features/auth/useAuth";
import {
  CallContext,
  type CallContextValue,
  type CallState,
  type CallType,
  type NetQuality,
} from "./CallContext";
import { CallDialog } from "./CallDialog";

/* ------------------------------------------------------------------ */
/*  Signalisation                                                      */
/* ------------------------------------------------------------------ */

const RING_TIMEOUT_MS = 45_000;
const ICE_GATHER_TIMEOUT_MS = 3_500;
const CHANNEL_JOIN_TIMEOUT_MS = 8_000;

type SdpPayload = { type: RTCSdpType; sdp: string };

type InvitePayload = {
  callId: string;
  from: string;
  type: CallType;
  offer: SdpPayload;
};

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((s) => s.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

function toSdp(desc: RTCSessionDescription | null): SdpPayload {
  if (!desc) throw new Error("no-local-description");
  return { type: desc.type, sdp: desc.sdp };
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      pc.removeEventListener("icegatheringstatechange", check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = setTimeout(finish, ICE_GATHER_TIMEOUT_MS);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

async function removeExistingChannel(topic: string) {
  const old = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
  if (old) await supabase.removeChannel(old);
}

let joinQueue: Promise<unknown> = Promise.resolve();

function joinChannel(
  topic: string,
  register: (ch: RealtimeChannel) => void,
  onLost?: () => void
): Promise<RealtimeChannel> {
  const run = joinQueue.then(() => doJoinChannel(topic, register, onLost));
  joinQueue = run.catch(() => undefined);
  return run;
}

async function doJoinChannel(
  topic: string,
  register: (ch: RealtimeChannel) => void,
  onLost?: () => void
): Promise<RealtimeChannel> {
  await removeExistingChannel(topic);
  const ch = supabase.channel(topic, { config: { broadcast: { self: false } } });
  register(ch);

  return new Promise<RealtimeChannel>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void supabase.removeChannel(ch);
      reject(new Error("signaling-timeout"));
    }, CHANNEL_JOIN_TIMEOUT_MS);

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ch);
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          void supabase.removeChannel(ch);
          reject(new Error("signaling-error"));
        } else {
          onLost?.();
        }
      }
    });
  });
}

const senderChannels = new Map<string, { ch: RealtimeChannel; state: { ok: boolean } }>();

async function sendToInbox(targetDeviceId: string, event: string, payload: object) {
  const topic = `call-inbox:${targetDeviceId}`;
  let entry = senderChannels.get(topic);
  if (!entry || !entry.state.ok) {
    if (entry) await supabase.removeChannel(entry.ch);
    senderChannels.delete(topic);
    const state = { ok: true };
    const ch = await joinChannel(
      topic,
      () => {},
      () => {
        state.ok = false;
      }
    );
    entry = { ch, state };
    senderChannels.set(topic, entry);
  }
  const res = await entry.ch.send({ type: "broadcast", event, payload });
  if (res !== "ok") throw new Error("signaling-send-failed");
}

function mediaErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Accès refusé : autorise le micro (et la caméra) dans les réglages du navigateur.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Aucun micro ou aucune caméra détecté sur cet appareil.";
  }
  if (name === "NotReadableError") {
    return "Le micro ou la caméra est déjà utilisé par une autre application.";
  }
  return "Impossible de démarrer l'appel. Réessaie dans un instant.";
}

async function getMedia(type: CallType): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("getUserMedia indisponible (HTTPS requis)", "SecurityError");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: type === "video" ? { facingMode: "user" } : false,
  });
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [callState, setCallStateRaw] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [peerName, setPeerName] = useState("Appareil");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [netQuality, setNetQuality] = useState<NetQuality>("excellente");
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(
    () => getStoredIdentity()?.deviceId ?? null
  );

  const stateRef = useRef<CallState>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteMediaRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callChRef = useRef<RealtimeChannel | null>(null);
  const inviteRef = useRef<InvitePayload | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setCallState = useCallback((s: CallState) => {
    stateRef.current = s;
    setCallStateRaw(s);
  }, []);

  /* ---------- identité de l'appareil ---------- */
  useEffect(() => {
    if (!user) {
      setDeviceId(null);
      return;
    }
    const read = () => setDeviceId(getStoredIdentity()?.deviceId ?? null);
    read();
    const timer = setInterval(read, 2_000);
    return () => clearInterval(timer);
  }, [user]);

  /* ---------- nettoyage complet ---------- */
  const cleanup = useCallback(() => {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    ringTimerRef.current = null;
    statsTimerRef.current = null;
    durationTimerRef.current = null;

    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    remoteMediaRef.current = null;

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    const ch = callChRef.current;
    callChRef.current = null;
    if (ch) setTimeout(() => void supabase.removeChannel(ch), 300);

    callIdRef.current = null;
    inviteRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setNetQuality("excellente");
    setIsRemoteVideoEnabled(false);
    setDurationSec(0);
    setCallState("idle");
  }, [setCallState]);

  const sendOnCall = useCallback((event: string, payload: object = {}) => {
    const ch = callChRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event, payload }).catch(() => {});
  }, []);

  /* ---------- RTCPeerConnection ---------- */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.ontrack = (e) => {
      const remote = remoteMediaRef.current ?? new MediaStream();
      if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
      remoteMediaRef.current = remote;
      setRemoteStream(new MediaStream(remote.getTracks()));

      if (e.track.kind === "video") {
        setIsRemoteVideoEnabled(true);
        e.track.onmute = () => setIsRemoteVideoEnabled(false);
        e.track.onunmute = () => setIsRemoteVideoEnabled(true);
        e.track.onended = () => setIsRemoteVideoEnabled(false);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      switch (pc.connectionState) {
        case "connected":
          if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
          ringTimerRef.current = null;
          setCallState("connected");
          setNetQuality("excellente");
          if (!durationTimerRef.current) {
            durationTimerRef.current = setInterval(() => {
              setDurationSec((s) => s + 1);
            }, 1000);
          }
          if (!statsTimerRef.current) {
            statsTimerRef.current = setInterval(async () => {
              try {
                const stats = await pc.getStats();
                let rtt: number | undefined;
                stats.forEach((r) => {
                  if (
                    r.type === "candidate-pair" &&
                    r.nominated &&
                    r.state === "succeeded"
                  ) {
                    rtt = r.currentRoundTripTime;
                  }
                });
                if (typeof rtt !== "number") return;
                setNetQuality(
                  rtt < 0.15 ? "excellente" : rtt < 0.4 ? "moyenne" : "faible"
                );
              } catch {
                /* pc fermée entre-temps */
              }
            }, 3_000);
          }
          break;
        case "disconnected":
          setNetQuality("faible");
          break;
        case "failed":
          toast.error("La connexion de l'appel a échoué. Vérifie ta connexion Internet.");
          sendOnCall("end", { reason: "failed" });
          cleanup();
          break;
        default:
          break;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup, sendOnCall, setCallState]);

  /* ---------- gestion de la renégociation (bascule audio/vidéo) ---------- */
  const handleRenegotiate = useCallback(
    async (payload: { description: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(payload.description);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendOnCall("renegotiate-answer", { description: answer });
      } catch (e) {
        console.error("[call] renegotiate", e);
      }
    },
    [sendOnCall]
  );

  const handleRenegotiateAnswer = useCallback(
    async (payload: { description: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(payload.description);
        }
      } catch (e) {
        console.error("[call] renegotiate-answer", e);
      }
    },
    []
  );

  /* ---------- appelant ---------- */
  const startCall = useCallback(
    async (targetDeviceId: string, type: CallType, name?: string) => {
      const me = getStoredIdentity();
      if (!me) {
        toast.error(
          "Cet appareil n'est pas encore enregistré. Ouvre l'onglet Appareils, puis réessaie."
        );
        return;
      }
      if (stateRef.current !== "idle") {
        toast.info("Un appel est déjà en cours.");
        return;
      }
      if (targetDeviceId === me.deviceId) {
        toast.info("Tu ne peux pas t'appeler toi-même.");
        return;
      }
      if (!navigator.onLine) {
        toast.warning(
          "Pas de connexion Internet : l'appel est impossible pour le moment."
        );
        return;
      }

      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      setCallType(type);
      setPeerName(name ?? "Appareil");
      setCallState("calling");

      const cancelled = () => callIdRef.current !== callId;

      try {
        const stream = await getMedia(type);
        if (cancelled()) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);

        const ch = await joinChannel(`call:${callId}`, (c) => {
          c.on("broadcast", { event: "answer" }, async ({ payload }) => {
            const pc = pcRef.current;
            if (!pc || pc.signalingState !== "have-local-offer") return;
            try {
              await pc.setRemoteDescription(payload.answer as SdpPayload);
              setCallState("connecting");
            } catch (e) {
              console.error("[call] setRemoteDescription(answer)", e);
              toast.error("Échec de la négociation de l'appel.");
              sendOnCall("end", { reason: "negotiation" });
              cleanup();
            }
          });
          c.on("broadcast", { event: "reject" }, ({ payload }) => {
            toast.info(
              payload?.reason === "busy"
                ? "Ton correspondant est déjà en appel."
                : "Appel refusé."
            );
            cleanup();
          });
          c.on("broadcast", { event: "end" }, () => {
            toast.info("L'appel a pris fin.");
            cleanup();
          });
          c.on("broadcast", { event: "renegotiate" }, ({ payload }) => {
            void handleRenegotiate(payload as { description: RTCSessionDescriptionInit });
          });
          c.on("broadcast", { event: "renegotiate-answer" }, ({ payload }) => {
            void handleRenegotiateAnswer(
              payload as { description: RTCSessionDescriptionInit }
            );
          });
        });
        if (cancelled()) {
          void supabase.removeChannel(ch);
          return;
        }
        callChRef.current = ch;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        await pc.setLocalDescription(await pc.createOffer());
        await waitForIceGathering(pc);
        if (cancelled()) return;

        const invite: InvitePayload = {
          callId,
          from: me.deviceId,
          type,
          offer: toSdp(pc.localDescription),
        };
        await sendToInbox(targetDeviceId, "invite", invite);

        ringTimerRef.current = setTimeout(() => {
          if (stateRef.current === "calling" && callIdRef.current === callId) {
            toast.info(
              "Pas de réponse. L'autre appareil doit avoir OvBridge ouvert pour recevoir l'appel."
            );
            sendOnCall("end", { reason: "timeout" });
            cleanup();
          }
        }, RING_TIMEOUT_MS);
      } catch (err) {
        if (cancelled()) return;
        console.error("[call] startCall", err);
        const msg = String((err as Error)?.message ?? "");
        toast.error(
          msg.startsWith("signaling")
            ? "Impossible de joindre le serveur d'appel. Vérifie ta connexion."
            : mediaErrorMessage(err)
        );
        cleanup();
      }
    },
    [
      cleanup,
      createPeerConnection,
      handleRenegotiate,
      handleRenegotiateAnswer,
      sendOnCall,
      setCallState,
    ]
  );

  /* ---------- destinataire : réponse ---------- */
  const acceptCall = useCallback(async () => {
    const invite = inviteRef.current;
    if (!invite || stateRef.current !== "incoming") return;
    const callId = invite.callId;
    const cancelled = () => callIdRef.current !== callId;

    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setCallState("connecting");

    try {
      const stream = await getMedia(invite.type);
      if (cancelled()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      await pc.setRemoteDescription(invite.offer);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setLocalDescription(await pc.createAnswer());
      await waitForIceGathering(pc);
      if (cancelled()) return;

      sendOnCall("answer", { answer: toSdp(pc.localDescription) });
    } catch (err) {
      if (cancelled()) return;
      console.error("[call] acceptCall", err);
      toast.error(mediaErrorMessage(err));
      sendOnCall("reject", { reason: "error" });
      cleanup();
    }
  }, [cleanup, createPeerConnection, sendOnCall, setCallState]);

  const rejectCall = useCallback(() => {
    sendOnCall("reject", { reason: "declined" });
    cleanup();
  }, [cleanup, sendOnCall]);

  const endCall = useCallback(() => {
    sendOnCall("end", { reason: "hangup" });
    cleanup();
  }, [cleanup, sendOnCall]);

  /* ---------- destinataire : écoute permanente des invitations ---------- */
  useEffect(() => {
    if (!deviceId) return;
    let disposed = false;
    let inbox: RealtimeChannel | null = null;

    const onInvite = async (payload: InvitePayload) => {
      if (!payload?.callId || !payload.from || !payload.offer?.sdp) return;
      if (payload.from === deviceId) return;

      if (stateRef.current !== "idle") {
        try {
          const busy = await joinChannel(`call:${payload.callId}`, () => {});
          await busy.send({
            type: "broadcast",
            event: "reject",
            payload: { reason: "busy" },
          });
          setTimeout(() => void supabase.removeChannel(busy), 300);
        } catch {
          /* l'appelant finira par expirer */
        }
        return;
      }

      const { data: caller } = await supabase
        .from("ovbridge_devices")
        .select("name, revoked")
        .eq("id", payload.from)
        .maybeSingle();
      if (disposed || !caller || caller.revoked) return;
      if (stateRef.current !== "idle") return;

      const callId = payload.callId;
      callIdRef.current = callId;
      inviteRef.current = payload;
      setCallType(payload.type === "video" ? "video" : "audio");
      setPeerName(caller.name ?? "Appareil");
      setCallState("incoming");

      try {
        const ch = await joinChannel(`call:${callId}`, (c) => {
          c.on("broadcast", { event: "end" }, () => {
            if (stateRef.current === "incoming") toast.info("Appel manqué.");
            else toast.info("L'appel a pris fin.");
            cleanup();
          });
          c.on("broadcast", { event: "renegotiate" }, ({ payload }) => {
            void handleRenegotiate(
              payload as { description: RTCSessionDescriptionInit }
            );
          });
          c.on("broadcast", { event: "renegotiate-answer" }, ({ payload }) => {
            void handleRenegotiateAnswer(
              payload as { description: RTCSessionDescriptionInit }
            );
          });
        });
        if (callIdRef.current !== callId) {
          void supabase.removeChannel(ch);
          return;
        }
        callChRef.current = ch;
      } catch {
        cleanup();
        return;
      }

      void sendUniversalNotification({
        title: "Appel entrant",
        body: `${caller.name ?? "Un appareil"} t'appelle (${
          payload.type === "video" ? "vidéo" : "audio"
        })`,
        type: "alert",
      });

      ringTimerRef.current = setTimeout(() => {
        if (stateRef.current === "incoming" && callIdRef.current === callId) {
          toast.info("Appel manqué.");
          cleanup();
        }
      }, RING_TIMEOUT_MS);
    };

    (async () => {
      try {
        const ch = await joinChannel(`call-inbox:${deviceId}`, (c) => {
          c.on("broadcast", { event: "invite" }, ({ payload }) => {
            void onInvite(payload as InvitePayload);
          });
        });
        if (disposed) {
          void supabase.removeChannel(ch);
          return;
        }
        inbox = ch;
      } catch (e) {
        console.warn("[call] boîte d'appels indisponible", e);
      }
    })();

    return () => {
      disposed = true;
      if (inbox) void supabase.removeChannel(inbox);
    };
  }, [deviceId, cleanup, handleRenegotiate, handleRenegotiateAnswer, setCallState]);

  /* ---------- libération à la fermeture de l'app ---------- */
  useEffect(() => {
    const onUnload = () => {
      if (stateRef.current !== "idle") sendOnCall("end", { reason: "closed" });
    };
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      onUnload();
      cleanup();
    };
  }, [cleanup, sendOnCall]);

  /* ---------- contrôles ---------- */
  const toggleMute = useCallback(() => {
    const next = !isMuted;
    localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    const next = !isVideoOff;
    localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsVideoOff(next);
  }, [isVideoOff]);

  /* ---------- bascule audio → vidéo (local) ---------- */
  const upgradeToVideo = useCallback(async () => {
    const pc = pcRef.current;
    const stream = localRef.current;
    if (!pc || !stream) return;

    if (stream.getVideoTracks().length > 0) {
      // Vidéo déjà présente, on la réactive
      stream.getVideoTracks().forEach((t) => (t.enabled = true));
      setIsVideoOff(false);
      setCallType("video");
      return;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) return;

      stream.addTrack(videoTrack);
      setLocalStream(new MediaStream(stream.getTracks()));

      pc.addTrack(videoTrack, stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOnCall("renegotiate", { description: offer });

      setIsVideoOff(false);
      setCallType("video");
    } catch (err) {
      toast.error(mediaErrorMessage(err));
    }
  }, [sendOnCall]);

  /* ---------- bascule vidéo → audio (local) ---------- */
  const downgradeToAudio = useCallback(async () => {
    const pc = pcRef.current;
    const stream = localRef.current;
    if (!pc || !stream) return;

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((t) => {
      t.stop();
      stream.removeTrack(t);
    });

    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === "video") {
        try {
          pc.removeTrack(sender);
        } catch {
          /* ignore */
        }
      }
    });

    setLocalStream(new MediaStream(stream.getTracks()));
    setCallType("audio");
    setIsVideoOff(false);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendOnCall("renegotiate", { description: offer });
  }, [sendOnCall]);

  const value = useMemo<CallContextValue>(
    () => ({
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
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      upgradeToVideo,
      downgradeToAudio,
    }),
    [
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
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      upgradeToVideo,
      downgradeToAudio,
    ]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallDialog />
    </CallContext.Provider>
  );
}