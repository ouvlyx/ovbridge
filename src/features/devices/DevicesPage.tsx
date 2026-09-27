import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Laptop, Smartphone, Monitor, QrCode, LogOut, Send, Inbox } from "lucide-react";
import { ensureDeviceRegistered } from "@/lib/device";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDevices, type Device } from "./useDevices";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";




function PlatformIcon({ platform }: { platform: string | null }) {
  if (platform === "android" || platform === "ios") return <Smartphone className="w-5 h-5" />;
  if (platform === "desktop") return <Monitor className="w-5 h-5" />;
  return <Laptop className="w-5 h-5" />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export default function DevicesPage() {
  const { user, signOut } = useAuth();
  const { devices, loading } = useDevices();
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const identity = await ensureDeviceRegistered(user.id);
        setMyDeviceId(identity.deviceId);
      } catch (e: any) {
        toast.error("Impossible d'enregistrer cet appareil : " + e.message);
      } finally {
        setRegistering(false);
      }
    })();
  }, [user]);

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ov-primary">OvBridge</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
        </Button>
      </header>

      <section className="space-y-1">
        <h2 className="text-lg font-semibold">Mes appareils</h2>
        <p className="text-sm text-ov-muted">{user?.email}</p>
      </section>

      {registering && (
        <p className="text-sm text-ov-muted">Enregistrement de cet appareil…</p>
      )}

      {loading ? (
        <p className="text-sm text-ov-muted">Chargement…</p>
      ) : (
        <ul className="space-y-3">
          {devices.map((d: Device) => {
            const isMe = d.id === myDeviceId;
            return (
              <li key={d.id}>
                <Card
                  className={cn(
                    "p-4 flex items-center gap-4 border-ov-border",
                    isMe && "ring-2 ring-ov-primary/40"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-ov-bg flex items-center justify-center text-ov-accent">
                    <PlatformIcon platform={d.platform} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {d.name}
                        {isMe && <span className="text-ov-muted"> (cet appareil)</span>}
                      </p>
                      {d.revoked && <Badge variant="destructive">révoqué</Badge>}
                    </div>
                    <p className="text-xs text-ov-muted">
                      Vu {timeAgo(d.last_seen)} · empreinte {d.fingerprint?.slice(0, 8) ?? "—"}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          className="bg-ov-primary hover:bg-ov-primaryHover"
          onClick={() => navigate("/send")}
        >
          <Send className="w-4 h-4 mr-2" /> Envoyer
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/inbox")}
        >
          <Inbox className="w-4 h-4 mr-2" /> Réception
        </Button>
      </div>
      
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate("/pair")}
      >
        <QrCode className="w-4 h-4 mr-2" /> Lier un nouvel appareil
      </Button>
    </div>
  );
}