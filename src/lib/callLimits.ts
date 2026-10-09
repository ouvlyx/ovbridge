import type { CallType } from "@/features/calls/CallContext";

export const MAX_PARTICIPANTS: Record<CallType, number> = {
  audio: 6,
  video: 4,
};

export const SOFT_LIMIT_VIDEO = 3;

export function getMaxParticipants(type: CallType): number {
  return MAX_PARTICIPANTS[type];
}

export function canAddParticipant(
  type: CallType,
  currentCount: number
): { ok: boolean; reason?: string } {
  const max = MAX_PARTICIPANTS[type];
  if (currentCount >= max) {
    return {
      ok: false,
      reason:
        type === "video"
          ? `Appel vidéo complet (${max}/${max}). Passe en audio pour accueillir plus de monde.`
          : `Appel audio complet (${max}/${max}).`,
    };
  }
  return { ok: true };
}

export function suggestDowngrade(type: CallType, currentCount: number): boolean {
  return type === "video" && currentCount >= SOFT_LIMIT_VIDEO;
}