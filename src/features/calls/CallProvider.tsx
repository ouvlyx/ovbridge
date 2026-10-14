import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/useAuth";
import { leaveCallRoom, endCallRoom, joinCallRoom } from "@/lib/callRooms";
import {
  CallContext,
  type CallContextValue,
  type CallState,
  type CallType,
  type NetQuality,
  type CallPeer,
} from "./CallContext";
import { CallDialog } from "./CallDialog";

const RING_TIMEOUT_MS = 45_000;
const ICE_GATHER_TIMEOUT_MS = 3_500;
const CHANNEL_JOIN_TIMEOUT_MS = 8_000;

type SdpPayload = { type: RTCSdpType; sdp: string };

type InvitePayload = {
  callId: string;
  from: string;
  fromName?: string;
  type: CallType;
  offer: SdpPayload;
  isGroup?: boolean;
  roomId?: string;
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
      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
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
    return "Accès refusé : autorise le micro (et la caméra) dans les réglages.";
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
  const [durationSec, setDurationSec] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(
    () => getStoredIdentity()?.deviceId ?? null
  );

  const stateRef = useRef<CallState>("idle");
  const localRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const isGroupRef = useRef(false);
  const callChRef = useRef<RealtimeChannel | null>(null);
  const inviteRef = useRef<InvitePayload | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Une connexion par peer
  const peerConnsRef = useRef<
    Map<
      string,
      {
        pc: RTCPeerConnection;
        stream: MediaStream;
        name: string;
        remoteStream: MediaStream;
      }
    >
  >(new Map());

  const setCallState = useCallback((s: CallState) => {
    stateRef.current = s;
    setCallStateRaw(s);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    const read = () => {
      const currentId = getStoredIdentity()?.deviceId ?? null;
      setDeviceId((prev) => (prev !== currentId ? currentId : prev));
    };
    read();
    const timer = setInterval(read, 2_000);
    return () => clearInterval(timer);
  }, [user]);

  /* ---------- mise à jour UI peers ---------- */
  const refreshPeersUi = useCallback(() => {
    const list: CallPeer[] = [];
    peerConnsRef.current.forEach((entry, peerDeviceId) => {
      list.push({
        deviceId: peerDeviceId,
        name: entry.name,
        stream: entry.remoteStream,
        isMuted: false,
        isVideoOff: false,
      });
    });
    setPeers(list);
  }, []);

  /* ---------- cleanup complet ---------- */
  const cleanup = useCallback(() => {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    ringTimerRef.current = null;
    statsTimerRef.current = null;
    durationTimerRef.current = null;

    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;

    peerConnsRef.current.forEach(({ pc, remoteStream }) => {
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      remoteStream.getTracks().forEach((t) => t.stop());
    });
    peerConnsRef.current.clear();

    const ch = callChRef.current;
    callChRef.current = null;
    if (ch) setTimeout(() => void supabase.removeChannel(ch), 300);

    // Quitte la salle si on était en groupe
    if (roomIdRef.current) {
      const roomId = roomIdRef.current;
      void leaveCallRoom(roomId).catch(() => {});
    }

    callIdRef.current = null;
    roomIdRef.current = null;
    isGroupRef.current = false;
    inviteRef.current = null;

    setLocalStream(null);
    setPeers([]);
    setIsMuted(false);
    setIsVideoOff(false);
    setNetQuality("excellente");
    setDurationSec(0);
    setCallState("idle");
  }, [setCallState]);

  const sendOnCall = useCallback((event: string, payload: object = {}) => {
    const ch = callChRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event, payload }).catch(() => {});
  }, []);

  /* ---------- création d'une peer connection ---------- */
  const createPeerConnection = useCallback(
    (peerDeviceId: string, peerNameStr: string) => {
      const existing = peerConnsRef.current.get(peerDeviceId);
      if (existing) return existing.pc;

      const remoteStream = new MediaStream();
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

      pc.ontrack = (e) => {
        if (!remoteStream.getTracks().includes(e.track)) {
          remoteStream.addTrack(e.track);
        }
        refreshPeersUi();
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          // Démarre la durée + le monitoring réseau dès la 1ʳᵉ connexion
          if (ringTimerRef.current) {
            clearTimeout(ringTimerRef.current);
            ringTimerRef.current = null;
          }
          setCallState("connected");
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
              } catch {}
            }, 3_000);
          }
        } else if (pc.connectionState === "failed") {
          toast.error(`Connexion perdue avec ${peerNameStr}`);
          closePeerRef.current(peerDeviceId);
        }
      };

      // Ajoute les pistes locales
      const stream = localRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      peerConnsRef.current.set(peerDeviceId, {
        pc,
        stream: stream ?? new MediaStream(),
        name: peerNameStr,
        remoteStream,
      });
      refreshPeersUi();

      return pc;
    },
    [refreshPeersUi, setCallState]
  );

  const closePeer = useCallback(
    (peerDeviceId: string) => {
      const entry = peerConnsRef.current.get(peerDeviceId);
      if (!entry) return;
      entry.pc.ontrack = null;
      entry.pc.onconnectionstatechange = null;
      entry.pc.close();
      entry.remoteStream.getTracks().forEach((t) => t.stop());
      peerConnsRef.current.delete(peerDeviceId);
      refreshPeersUi();
    },
    [refreshPeersUi]
  );

  const closePeerRef = useRef<(peerDeviceId: string) => void>(closePeer);
  useEffect(() => {
    closePeerRef.current = closePeer;
  }, [closePeer]);

  /* ---------- appelant : 1:1 ---------- */
  const startCall = useCallback(
    async (targetDeviceId: string, type: CallType, name?: string) => {
      const me = getStoredIdentity();
      if (!me) {
        toast.error("Appareil non enregistré");
        return;
      }
      if (stateRef.current !== "idle") {
        toast.info("Appel déjà en cours");
        return;
      }
      if (targetDeviceId === me.deviceId) {
        toast.info("Impossible de s'appeler soi-même");
        return;
      }
      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      isGroupRef.current = false;
      setCallType(type);
      setPeerName(name ?? "Appareil");
      setCallState("calling");

      try {
        const stream = await getMedia(type);
        localRef.current = stream;
        setLocalStream(stream);

        const ch = await joinChannel(`call:${callId}`, (c) => {
          c.on("broadcast", { event: "answer" }, async ({ payload }) => {
            const peerDeviceId = payload.from as string;
            const entry = peerConnsRef.current.get(peerDeviceId);
            if (!entry || entry.pc.signalingState !== "have-local-offer") return;
            try {
              await entry.pc.setRemoteDescription(payload.answer as SdpPayload);
              setCallState("connecting");
            } catch (e) {
              console.error(e);
            }
          });
          c.on("broadcast", { event: "reject" }, () => {
            toast.info("Appel refusé");
            cleanup();
          });
          c.on("broadcast", { event: "end" }, () => {
            toast.info("Appel terminé");
            cleanup();
          });
        });
        callChRef.current = ch;

        const pc = createPeerConnection(targetDeviceId, name ?? "Appareil");
        await pc.setLocalDescription(await pc.createOffer());
        await waitForIceGathering(pc);

        const invite: InvitePayload = {
          callId,
          from: me.deviceId,
          fromName: name,
          type,
          offer: toSdp(pc.localDescription),
        };
        await sendToInbox(targetDeviceId, "invite", invite);

        ringTimerRef.current = setTimeout(() => {
          if (stateRef.current === "calling") {
            toast.info("Pas de réponse");
            cleanup();
          }
        }, RING_TIMEOUT_MS);
      } catch (err) {
        console.error(err);
        toast.error(mediaErrorMessage(err));
        cleanup();
      }
    },
    [cleanup, createPeerConnection, setCallState]
  );

  /* ---------- appelant : groupe ---------- */
  const startGroupCall = useCallback(
    async (roomId: string, type: CallType, name?: string) => {
      const me = getStoredIdentity();
      if (!me) {
        toast.error("Appareil non enregistré");
        return;
      }

      const callId = `room:${roomId}`;
      callIdRef.current = callId;
      roomIdRef.current = roomId;
      isGroupRef.current = true;
      setCallType(type);
      setPeerName(name ?? "Appel de groupe");
      setCallState("calling");

      try {
        await joinCallRoom(roomId, user!.id);

        const stream = await getMedia(type);
        localRef.current = stream;
        setLocalStream(stream);

        const ch = await joinChannel(`call:${callId}`, (c) => {
          c.on("broadcast", { event: "invite" }, async ({ payload }) => {
            // Un nouveau participant arrive : on lui envoie notre offre
            await handleGroupIncomingRef.current(payload as InvitePayload);
          });
          c.on("broadcast", { event: "answer" }, async ({ payload }) => {
            const peerDeviceId = payload.from as string;
            const entry = peerConnsRef.current.get(peerDeviceId);
            if (!entry || entry.pc.signalingState !== "have-local-offer") return;
            try {
              await entry.pc.setRemoteDescription(payload.answer as SdpPayload);
            } catch (e) {
              console.error(e);
            }
          });
          c.on("broadcast", { event: "end" }, ({ payload }) => {
            const peerDeviceId = payload.from as string;
            closePeerRef.current(peerDeviceId);
          });
        });
        callChRef.current = ch;

        // J'annonce mon arrivée
        await ch.send({
          type: "broadcast",
          event: "invite",
          payload: {
            callId,
            from: me.deviceId,
            fromName: name,
            type,
            offer: null,
            isGroup: true,
            roomId,
          },
        });

        setCallState("connecting");
      } catch (err) {
        console.error(err);
        toast.error(mediaErrorMessage(err));
        cleanup();
      }
    },
    [cleanup, closePeer, setCallState, user]
  );

  /* ---------- traiter une invitation de groupe ---------- */
  const handleGroupIncoming = useCallback(
    async (payload: InvitePayload) => {
      if (!payload.from || payload.from === getStoredIdentity()?.deviceId) return;
      const me = getStoredIdentity();
      if (!me) return;

      // Qui doit initier ? Le device avec l'ID le plus petit pour éviter les doublons
      const shouldInitiate = me.deviceId < payload.from;

      if (!shouldInitiate) return; // L'autre initiera

      try {
        const pc = createPeerConnection(payload.from, payload.fromName ?? "Participant");
        await pc.setLocalDescription(await pc.createOffer());
        await waitForIceGathering(pc);
        sendOnCall("invite", {
          callId: callIdRef.current,
          from: me.deviceId,
          fromName: getStoredIdentity()?.deviceId,
          type: callType,
          offer: toSdp(pc.localDescription),
          isGroup: true,
          roomId: roomIdRef.current,
        });
      } catch (e) {
        console.error("[group] initiate", e);
      }
    },
    [callType, createPeerConnection, sendOnCall]
  );

  const handleGroupIncomingRef = useRef<(payload: InvitePayload) => Promise<void>>(
    handleGroupIncoming
  );
  useEffect(() => {
    handleGroupIncomingRef.current = handleGroupIncoming;
  }, [handleGroupIncoming]);

  /* ---------- accepter (1:1) ---------- */
  const acceptCall = useCallback(async () => {
    const invite = inviteRef.current;
    if (!invite || stateRef.current !== "incoming") return;
    
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    setCallState("connecting");

    try {
      const stream = await getMedia(invite.type);
      localRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(invite.from, invite.fromName ?? "Appelant");
      await pc.setRemoteDescription(invite.offer);
      await pc.setLocalDescription(await pc.createAnswer());
      await waitForIceGathering(pc);

      sendOnCall("answer", {
        answer: toSdp(pc.localDescription),
        from: getStoredIdentity()?.deviceId,
      });
    } catch (err) {
      console.error(err);
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
    sendOnCall("end", { from: getStoredIdentity()?.deviceId });
    if (roomIdRef.current) {
      void endCallRoom(roomIdRef.current).catch(() => {});
    }
    cleanup();
  }, [cleanup, sendOnCall]);

  /* ---------- écoute des invitations ---------- */
  useEffect(() => {
    if (!deviceId) return;
    let disposed = false;
    let inbox: RealtimeChannel | null = null;

    const onInvite = async (payload: InvitePayload) => {
      if (!payload?.callId || !payload.from) return;
      if (payload.from === deviceId) return;

      // Groupe : rejoindre la salle
      if (payload.isGroup && payload.roomId) {
        if (stateRef.current !== "idle") return;

        const { data: caller } = await supabase
          .from("ovbridge_devices")
          .select("name, revoked")
          .eq("id", payload.from)
          .maybeSingle();
        if (disposed || !caller || caller.revoked) return;

        const callId = payload.callId;
        callIdRef.current = callId;
        roomIdRef.current = payload.roomId;
        isGroupRef.current = true;
        setCallType(payload.type);
        setPeerName(caller.name ?? "Appel de groupe");
        setCallState("incoming");
        inviteRef.current = payload;
        return;
      }

      // 1:1 : sonnerie normale
      if (stateRef.current !== "idle") {
        try {
          const busy = await joinChannel(`call:${payload.callId}`, () => {});
          await busy.send({
            type: "broadcast",
            event: "reject",
            payload: { reason: "busy", from: deviceId },
          });
          setTimeout(() => void supabase.removeChannel(busy), 300);
        } catch {}
        return;
      }

      const { data: caller } = await supabase
        .from("ovbridge_devices")
        .select("name, revoked")
        .eq("id", payload.from)
        .maybeSingle();
      if (disposed || !caller || caller.revoked) return;

      callIdRef.current = payload.callId;
      inviteRef.current = payload;
      setCallType(payload.type);
      setPeerName(caller.name ?? "Appareil");
      setCallState("incoming");

      const callId = payload.callId;
      try {
        const ch = await joinChannel(`call:${callId}`, (c) => {
          c.on("broadcast", { event: "end" }, () => {
            toast.info("Appel terminé");
            cleanup();
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

      ringTimerRef.current = setTimeout(() => {
        if (stateRef.current === "incoming" && callIdRef.current === callId) {
          toast.info("Appel manqué");
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
        console.warn("[call] boîte indisponible", e);
      }
    })();

    return () => {
      disposed = true;
      if (inbox) void supabase.removeChannel(inbox);
    };
  }, [deviceId, cleanup, setCallState]);

  /* ---------- unload ---------- */
  useEffect(() => {
    const onUnload = () => {
      if (stateRef.current !== "idle") {
        sendOnCall("end", { from: getStoredIdentity()?.deviceId });
      }
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

  const upgradeToVideo = useCallback(async () => {
    const stream = localRef.current;
    if (!stream) return;
    if (stream.getVideoTracks().length > 0) {
      stream.getVideoTracks().forEach((t) => (t.enabled = true));
      setIsVideoOff(false);
      setCallType("video");
      return;
    }
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      const track = videoStream.getVideoTracks()[0];
      if (!track) return;
      stream.addTrack(track);
      setLocalStream(new MediaStream(stream.getTracks()));

      // Ajoute à toutes les connexions
      for (const [, entry] of peerConnsRef.current) {
        entry.pc.addTrack(track, stream);
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        sendOnCall("renegotiate", {
          from: getStoredIdentity()?.deviceId,
          description: offer,
        });
      }

      setIsVideoOff(false);
      setCallType("video");
    } catch (err) {
      toast.error(mediaErrorMessage(err));
    }
  }, [sendOnCall]);

  const downgradeToAudio = useCallback(async () => {
    const stream = localRef.current;
    if (!stream) return;

    stream.getVideoTracks().forEach((t) => {
      t.stop();
      stream.removeTrack(t);
    });

    for (const [, entry] of peerConnsRef.current) {
      entry.pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "video") {
          try {
            entry.pc.removeTrack(sender);
          } catch {}
        }
      });
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      sendOnCall("renegotiate", {
        from: getStoredIdentity()?.deviceId,
        description: offer,
      });
    }

    setLocalStream(new MediaStream(stream.getTracks()));
    setCallType("audio");
    setIsVideoOff(false);
  }, [sendOnCall]);

  const participantCount = peers.length + (callState !== "idle" ? 1 : 0);

  const value = useMemo<CallContextValue>(
    () => ({
      callState,
      callType,
      peerName,
      isMuted,
      isVideoOff,
      netQuality,
      localStream,
      peers,
      isRemoteVideoEnabled: peers.some((p) =>
        p.stream?.getVideoTracks().some((t) => t.enabled)
      ),
      durationSec,
      participantCount,
      startCall,
      startGroupCall,
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
      peers,
      durationSec,
      participantCount,
      startCall,
      startGroupCall,
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