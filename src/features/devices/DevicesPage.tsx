import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Laptop,
  Smartphone,
  Monitor,
  QrCode,
  LogOut,
  Send,
  Inbox,
  Pencil,
  User,
  Ban,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
import { ensureDeviceRegistered } from "@/lib/device";
import { useDevices, type Device } from "./useDevices";
import RenameDeviceDialog from "./RenameDeviceDialog";
import ConfirmDialog from "./ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function PlatformIcon({ platform }: { platform: string | null }) {
  if (platform === "android" || platform === "ios")
    return <Smartphone className="w-5 h-5" />;
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
  const { devices, loading, refresh } = useDevices();
  const navigate = useNavigate();
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(true);

  const [renaming, setRenaming] = useState<Device | null>(null);
  const [revoking, setRevoking] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);

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

  const handleRevoke = async () => {
    if (!revoking) return;
    setBusy(true);
    const { error } = await supabase
      .from("ovbridge_devices")
      .update({ revoked: true })
      .eq("id", revoking.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Appareil révoqué");
    setRevoking(null);
    await refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase
      .from("ovbridge_devices")
      .delete()
      .eq("id", deleting.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Appareil supprimé");
    setDeleting(null);
    await refresh();
  };

  return (
    <div className="min-h-screen p-6 space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ov-primary">OvBridge</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            title="Mon profil"
          >
            <User className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </header>

      <section className="space-y-1">
        <h2 className="text-lg font-semibold">Mes appareils</h2>
        <p className="text-sm text-ov-muted">{user?.email}</p>
      </section>

      {registering && (
        <p className="text-sm text-ov-muted">
          Enregistrement de cet appareil…
        </p>
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
                    "p-4 flex items-center gap-3 border-ov-border",
                    isMe && "ring-2 ring-ov-primary/40",
                    d.revoked && "opacity-60"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-ov-bg flex items-center justify-center text-ov-accent shrink-0">
                    <PlatformIcon platform={d.platform} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {d.name}
                        {isMe && (
                          <span className="text-ov-muted"> (cet appareil)</span>
                        )}
                      </p>
                      {d.revoked && (
                        <Badge variant="destructive">révoqué</Badge>
                      )}
                    </div>
                    <p className="text-xs text-ov-muted truncate">
                      Vu {timeAgo(d.last_seen)} · empreinte{" "}
                      {d.fingerprint?.slice(0, 8) ?? "—"}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5 text-ov-muted" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setRenaming(d)}>
                        <Pencil className="w-4 h-4" />
                        {isMe ? "Renommer cet appareil" : "Renommer"}
                      </DropdownMenuItem>

                      {!isMe && (
                        <>
                          <DropdownMenuSeparator />

                          {!d.revoked && (
                            <DropdownMenuItem
                              onClick={() => setRevoking(d)}
                              variant="danger"
                            >
                              <Ban className="w-4 h-4" />
                              Révoquer l'accès
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setDeleting(d)}
                            variant="danger"
                          >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
        <Button variant="outline" onClick={() => navigate("/inbox")}>
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

      {renaming && (
        <RenameDeviceDialog
          open={!!renaming}
          onOpenChange={(open) => !open && setRenaming(null)}
          deviceId={renaming.id}
          currentName={renaming.name}
          onRenamed={refresh}
        />
      )}

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(v) => !v && setRevoking(null)}
        title="Révoquer cet appareil ?"
        description={`"${revoking?.name}" ne pourra plus envoyer ni recevoir de transferts.`}
        confirmLabel="Révoquer"
        danger
        busy={busy}
        onConfirm={handleRevoke}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Supprimer définitivement ?"
        description={`"${deleting?.name}" sera retiré. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}