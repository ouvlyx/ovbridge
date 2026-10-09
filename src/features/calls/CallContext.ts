import { createContext, useContext } from "react";

export type CallType = "audio" | "video";
export type CallState =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected";
export type NetQuality = "excellente" | "moyenne" | "faible";

export interface CallPeer {
  deviceId: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface CallContextValue {
  callState: CallState;
  callType: CallType;
  peerName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  netQuality: NetQuality;
  localStream: MediaStream | null;
  peers: CallPeer[];
  isRemoteVideoEnabled: boolean;
  durationSec: number;
  participantCount: number;
  startCall: (targetDeviceId: string, type: CallType, name?: string) => Promise<void>;
  startGroupCall: (roomId: string, type: CallType, name?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  upgradeToVideo: () => Promise<void>;
  downgradeToAudio: () => Promise<void>;
}

export const CallContext = createContext<CallContextValue | undefined>(undefined);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall doit être utilisé dans CallProvider");
  return ctx;
}