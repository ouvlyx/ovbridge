import { friendlyError } from "@/lib/errors";
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
  Pencil,
  User,
  Ban,
  Trash2,
  MoreVertical,
  Users,
  MessageSquare,
  HardDrive,
  Clipboard,
  Shield,
} from "lucide-react";
import SpacesPage from "@/features/spaces/SpacesPage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
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
import { useDeviceAlerts } from "./useDeviceAlerts";
import { useTransferAlerts } from "@/features/transfers/useTransferAlerts";
import { useUnreadCount } from "@/features/transfers/useUnreadCount";
import { fetchUserAdminRole } from "@/lib/admin";
import type { AdminRole } from "@/types/admin";

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
  const [adminRole, setAdminRole] = useState<AdminRole>("none");

  useDeviceAlerts(myDeviceId);
  useTransferAlerts({ currentChat: null });
  const unread = useUnreadCount();

  const [tab, setTab] = useState<"devices" | "spaces">("devices");

  const [renaming, setRenaming] = useState<Device | null>(null);
  const [revoking, setRevoking] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [identity, role] = await Promise.all([
          ensureDeviceRegistered(user.id),
          fetchUserAdminRole(user.id),
        ]);
        setMyDeviceId(identity.deviceId);
        setAdminRole(role);
      } catch (e: any) {
        toast.error(friendlyError(e));
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
    if (error) return toast.error(friendlyError(error));
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
    if (error) return toast.error(friendlyError(error));
    toast.success("Appareil supprimé");
    setDeleting(null);
    await refresh();
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 w-full max-w-4xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ov-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ov-success" />
          </span>
          <div className="flex items-center gap-2">
            <img
              src="/brandmark-transparent.png"
              alt=""
              className="h-7 w-auto shrink-0"
            />
            <h1 className="text-2xl font-bold text-ov-primary">OvBridge</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {adminRole !== "none" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="border-ov-primary/40 text-ov-primary hover:bg-ov-primary/10 text-xs mr-1"
            >
              <Shield className="w-4 h-4 mr-1" /> Console Admin
            </Button>
          )}
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

      {/* TABS */}
      <div className="flex gap-2 p-1 rounded-xl bg-ov-surface border border-ov-border">
        <button
          onClick={() => setTab("devices")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            tab === "devices"
              ? "bg-ov-primary text-white"
              : "text-ov-muted hover:text-ov-text"
          )}
        >
          <Laptop className="w-4 h-4" /> Mes appareils
        </button>
        <button
          onClick={() => setTab("spaces")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            tab === "spaces"
              ? "bg-ov-primary text-white"
              : "text-ov-muted hover:text-ov-text"
          )}
        >
          <Users className="w-4 h-4" /> Mes collaborateurs
        </button>
      </div>

      {tab === "spaces" ? (
        <SpacesPage />
      ) : (
        <>
          <section className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes appareils</h2>
              {!loading && devices.length > 0 && (
                <Badge className="bg-ov-primary/15 text-ov-primary border-0">
                  {devices.length} appareil{devices.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
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
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {devices.map((d: Device) => {
                const isMe = d.id === myDeviceId;
                return (
                  <li key={d.id}>
                    <Card
                      className={cn(
                        "relative p-4 flex items-center gap-3 border transition-all h-full",
                        isMe
                          ? "border-ov-success/70 bg-gradient-to-br from-ov-success/[0.08] to-transparent shadow-md"
                          : "border-ov-border bg-ov-surface hover:border-ov-border/80",
                        d.revoked && "opacity-50 border-ov-danger/30"
                      )}
                    >
                      {isMe && (
                        <span className="absolute top-0 left-0 h-full w-1 rounded-l-2xl bg-ov-success" />
                      )}

                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          isMe
                            ? "bg-ov-success/15 text-ov-success"
                            : "bg-ov-bg text-ov-accent"
                        )}
                      >
                        <PlatformIcon platform={d.platform} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{d.name}</p>
                          {isMe && (
                            <Badge className="bg-ov-success/20 text-ov-success border-0 text-[10px] px-1.5 py-0">
                              actif
                            </Badge>
                          )}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              className="bg-ov-primary hover:bg-ov-primaryHover shadow-lg shadow-ov-primary/20"
              onClick={() => navigate("/send")}
            >
              <Send className="w-4 h-4 mr-2" /> Envoyer
            </Button>
            <Button
              variant="outline"
              className="border-ov-border hover:bg-ov-surface relative"
              onClick={() => navigate("/messages")}
            >
              <MessageSquare className="w-4 h-4 mr-2" /> Messages
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-ov-primary text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="border-ov-border hover:bg-ov-surface"
              onClick={() => navigate("/workspace")}
            >
              <HardDrive className="w-4 h-4 mr-2" /> Mon espace
            </Button>

            <Button
              variant="outline"
              className="border-ov-border hover:bg-ov-surface"
              onClick={() => navigate("/clipboard")}
            >
              <Clipboard className="w-4 h-4 mr-2" /> Presse-papiers
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full border-dashed border-ov-border text-ov-muted hover:text-ov-text hover:border-ov-primary/50 hover:bg-ov-primary/5 transition-colors"
            onClick={() => navigate("/pair")}
          >
            <QrCode className="w-4 h-4 mr-2" /> Lier un nouvel appareil
          </Button>
        </>
      )}

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
