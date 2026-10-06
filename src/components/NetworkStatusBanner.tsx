import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Send } from "lucide-react";
import { useNetworkStatus } from "@/lib/network";
import { getOfflineQueue, flushOfflineQueue } from "@/lib/offlineQueue";
import { Button } from "./ui/button";

export default function NetworkStatusBanner() {
  const { isOffline } = useNetworkStatus();
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateCount = () => setQueuedCount(getOfflineQueue().length);
    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await flushOfflineQueue();
    setQueuedCount(getOfflineQueue().length);
    setSyncing(false);
  };

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-ov-danger text-white text-xs py-2 px-4 flex flex-wrap items-center justify-between gap-2 text-center sticky top-0 z-50 shadow-md"
      >
        <div className="flex items-center gap-2 mx-auto">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            Mode hors-ligne : connexion Internet interrompue.
            {queuedCount > 0 && ` (${queuedCount} envoi(s) conservé(s) localement)`}
          </span>
        </div>
      </div>
    );
  }

  if (queuedCount > 0) {
    return (
      <div
        role="status"
        className="bg-ov-primary text-white text-xs py-2 px-4 flex items-center justify-between gap-2 sticky top-0 z-50 shadow-md"
      >
        <span className="flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" />
          {queuedCount} envoi(s) hors-ligne prêt(s) à être transmis.
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSync}
          disabled={syncing}
          className="text-xs text-white hover:bg-white/20 h-6 px-2"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
          Transmettre
        </Button>
      </div>
    );
  }

  return null;
}
