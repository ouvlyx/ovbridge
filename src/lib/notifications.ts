import { toast } from "sonner";

export type NotificationType = "message" | "transfer" | "device" | "alert" | "system";

/**
 * Demande la permission pour les notifications système du navigateur/bureau.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

/**
 * Synthétiseur Audio Web Audio API (ne nécessite aucun fichier MP3 externe).
 */
export function playNotificationSound(type: NotificationType = "message") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "message" || type === "transfer") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "device" || type === "alert") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn("[playNotificationSound]", e);
  }
}

/**
 * Vibration tactile haptique (Android / Mobile PWA).
 */
export function vibrateDevice(pattern: number[] = [100, 50, 100]) {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignoré si non supporté
    }
  }
}

/**
 * Affiche une notification universelle (Système Push + Toast in-app + Son + Haptique).
 */
export async function sendUniversalNotification(params: {
  title: string;
  body: string;
  type?: NotificationType;
  onClick?: () => void;
  icon?: string;
}) {
  const { title, body, type = "message", onClick, icon = "/brandmark-transparent.png" } = params;

  playNotificationSound(type);
  vibrateDevice([100, 50, 100]);

  toast(title, {
    description: body,
    action: onClick
      ? {
          label: "Ouvrir",
          onClick: onClick,
        }
      : undefined,
  });

  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        tag: `ovbridge-${type}-${Date.now()}`,
      });
      if (onClick) {
        notif.onclick = () => {
          window.focus();
          onClick();
          notif.close();
        };
      }
    } catch (e) {
      console.warn("[sendUniversalNotification]", e);
    }
  }
}
