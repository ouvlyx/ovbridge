import { createContext, useContext } from "react";

export type CallType = "audio" | "video";
export type CallState =
  | "idle"
  | "calling" // je compose, l'autre sonne
  | "incoming" // l'autre m'appelle
  | "connecting" // négociation WebRTC en cours
  | "connected";
export type NetQuality = "excellente" | "moyenne" | "faible";

export interface CallContextValue {
  callState: CallState;
  callType: CallType;
  peerName: string;
  isMuted: boolean;
  isVideoOff: boolean;
  netQuality: NetQuality;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (targetDeviceId: string, type: CallType, name?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

export const CallContext = createContext<CallContextValue | undefined>(undefined);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall doit être utilisé à l'intérieur d'un CallProvider");
  }
  return ctx;
}
