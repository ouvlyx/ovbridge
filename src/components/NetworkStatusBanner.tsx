import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/network";

export default function NetworkStatusBanner() {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-ov-danger text-white text-xs py-2 px-4 flex items-center justify-center gap-2 text-center sticky top-0 z-50 shadow-md transition-all animate-in fade-in slide-in-from-top-2"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        Mode hors-ligne : connexion Internet interrompue. Les échanges reprendront automatiquement.
      </span>
    </div>
  );
}
