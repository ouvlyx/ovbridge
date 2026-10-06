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
  Pencil,
  User,
  Ban,
  Trash2,
  MoreVertical,
  Users,
  Shield,
  HardDrive,
  Clipboard,
  Activity,
  Zap,
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
import { fetchUserAdminRole } from "@/lib/admin";
import type { AdminRole } from "@/types/admin";
import { ensureWorkspace, type Workspace } from "@/lib/workspace";

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
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useDeviceAlerts(myDeviceId);
  useTransferAlerts({ currentChat: null });

  const [tab, setTab] = useState<"devices" | "spaces">("devices");

  const [renaming, setRenaming] = useState<Device | null>(null);
  const [revoking, setRevoking] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [identity, role, ws] = await Promise.all([
          ensureDeviceRegistered(user.id),
          fetchUserAdminRole(user.id),
          ensureWorkspace(user.id).catch(() => null),
        ]);
        setMyDeviceId(identity.deviceId);
        setAdminRole(role);
        setWorkspace(ws);
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

  const quotaPercent = workspace
    ? Math.min(100, Math.round((workspace.used_bytes / workspace.quota_bytes) * 100))
    : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 w-full max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-y-2 border-b border-ov-border pb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ov-success opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ov-success" />
          </span>
          <div className="flex items-center gap-2">
            <img
              src="/brandmark-transparent.png"
              alt=""
              className="h-8 w-auto shrink-0"
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

      {/* TABS SELECTOR */}
      <div className="flex gap-2 p-1 rounded-xl bg-ov-surface border border-ov-border">
        <button
          onClick={() => setTab("devices")}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            tab === "devices"
              ? "bg-ov-primary text-white shadow-md shadow-ov-primary/20"
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
              ? "bg-ov-primary text-white shadow-md shadow-ov-primary/20"
              : "text-ov-muted hover:text-ov-text"
          )}
        >
          <Users className="w-4 h-4" /> Mes collaborateurs
        </button>
      </div>

      {tab === "spaces" ? (
        <SpacesPage />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLONNE GAUCHE / PRINCIPALE (2 cols sur desktop) : Appareils & Bouton de Liaison */}
          <div className="lg:col-span-2 space-y-4">
            <section className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Appareils Lient</h2>
                {!loading && devices.length > 0 && (
                  <Badge className="bg-ov-primary/15 text-ov-primary border-0 font-mono">
                    {devices.length} appareil{devices.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ov-muted">{user?.email}</p>
            </section>

            {registering && (
              <p className="text-xs text-ov-muted">
                Enregistrement de cet appareil…
              </p>
            )}

            {loading ? (
              <p className="text-sm text-ov-muted">Chargement de vos appareils…</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <p className="font-medium truncate text-sm">{d.name}</p>
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

            {/* SEUL BOUTON DE LIAISON DÉSORMAIS CONSERVÉ */}
            <Button
              variant="outline"
              className="w-full py-6 border-2 border-dashed border-ov-primary/40 text-ov-primary hover:text-white hover:border-ov-primary hover:bg-ov-primary/10 transition-all font-semibold rounded-2xl shadow-sm"
              onClick={() => navigate("/pair")}
            >
              <QrCode className="w-5 h-5 mr-2 animate-pulse" /> Lier un nouvel appareil (QR Code / Clé)
            </Button>
          </div>

          {/* COLONNE DROITE SUR DESKTOP / TABLETTE : Widget d'Activité & Statistiques Système */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-ov-accent" /> Aperçu Système & Stockage
            </h2>

            {/* Carte Quota Espace */}
            <Card className="p-4 border-ov-border bg-ov-surface space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-ov-text">
                  <HardDrive className="w-4 h-4 text-ov-primary" /> Espace Personnel
                </span>
                <span className="text-xs font-mono text-ov-accent">{quotaPercent}%</span>
              </div>
              <div className="w-full bg-ov-bg rounded-full h-2 overflow-hidden border border-ov-border">
                <div
                  className="bg-ov-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-ov-muted flex justify-between">
                <span>
                  {workspace ? (workspace.used_bytes / (1024 * 1024)).toFixed(1) : 0} Mo utilisés
                </span>
                <span>
                  {workspace ? (workspace.quota_bytes / (1024 * 1024)).toFixed(0) : 100} Mo total
                </span>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/workspace")}
                className="w-full text-xs"
              >
                Gérer mes fichiers
              </Button>
            </Card>

            {/* Raccourci Presse-papiers Rapide */}
            <Card className="p-4 border-ov-border bg-ov-surface space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-ov-text">
                  <Clipboard className="w-4 h-4 text-ov-accent" /> Presse-papiers Synchronisé
                </span>
                <Badge className="bg-ov-accent/15 text-ov-accent border-0 text-[10px]">
                  Instantané
                </Badge>
              </div>
              <p className="text-xs text-ov-muted">
                Partagez du texte ou des liens chiffrés directement entre vos appareils.
              </p>
              <Button
                size="sm"
                onClick={() => navigate("/clipboard")}
                className="w-full bg-ov-primary hover:bg-ov-primaryHover text-xs"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" /> Ouvrir le Presse-papiers
              </Button>
            </Card>

            {/* Statut Sécurité */}
            <Card className="p-4 border-ov-success/30 bg-gradient-to-br from-ov-success/10 to-transparent space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-ov-success" />
                <span className="text-xs font-bold text-ov-success">Sécurité Chiffrement E2E</span>
              </div>
              <p className="text-[11px] text-ov-muted leading-relaxed">
                Toutes vos transmissions réseau sont chiffrées de bout en bout avec Curve25519 (libsodium).
              </p>
            </Card>
          </div>
        </div>
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
