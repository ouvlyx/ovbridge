import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus, Shield, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSpaceDetail } from "./useSpaceDetail";
import InviteToSpaceDialog from "./InviteToSpaceDialog";
import ConfirmDialog from "@/features/devices/ConfirmDialog";
import { removeMember, deleteSpace } from "@/lib/spaces";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SpaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { space, members, loading, refresh } = useSpaceDetail(id);

  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [deletingSpace, setDeletingSpace] = useState(false);
  const [busy, setBusy] = useState(false);

  const me = members.find((m) => m.user_id === user?.id);
  const isAdmin = me?.role === "admin";
  const isOwner = space?.owner_id === user?.id;

  const handleRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await removeMember(removing);
      toast.success("Membre retiré");
      setRemoving(null);
      await refresh();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!space) return;
    setBusy(true);
    try {
      await deleteSpace(space.id);
      toast.success("Espace supprimé");
      navigate("/devices");
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!me) return;
    setBusy(true);
    try {
      await removeMember(me.id);
      toast.success("Vous avez quitté l'espace");
      navigate("/devices");
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !space) {
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto">
        <p className="text-sm text-ov-muted">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{space.name}</h1>
          {space.description && (
            <p className="text-xs text-ov-muted truncate">{space.description}</p>
          )}
        </div>
      </header>

      <div className="flex gap-2">
        <Button
          onClick={() => setInviting(true)}
          className="flex-1 bg-ov-primary hover:bg-ov-primaryHover"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Inviter
        </Button>
        {isOwner ? (
          <Button
            variant="outline"
            className="border-ov-danger/40 text-ov-danger hover:bg-ov-danger/10"
            onClick={() => setDeletingSpace(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="border-ov-border hover:bg-ov-bg"
            onClick={handleLeave}
          >
            <LogOut className="w-4 h-4 mr-2" /> Quitter
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-ov-muted">
          Membres ({members.length})
        </h2>

        <ul className="space-y-2">
          {members.map((m) => {
            const isMe = m.user_id === user?.id;
            const isOwnerRow = m.user_id === space.owner_id;

            return (
              <li key={m.id}>
                <Card className="p-3 border-ov-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-ov-bg text-ov-accent flex items-center justify-center text-sm font-semibold shrink-0">
                    {(m.display_name || m.email).slice(0, 1).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {m.display_name || m.email}
                        {isMe && (
                          <span className="text-ov-muted"> (vous)</span>
                        )}
                      </p>
                      {m.role === "admin" && (
                        <Badge className="bg-ov-primary/15 text-ov-primary border-0 text-[10px] px-1.5 py-0">
                          <Shield className="w-3 h-3 mr-0.5" /> admin
                        </Badge>
                      )}
                      {isOwnerRow && (
                        <Badge className="bg-ov-success/15 text-ov-success border-0 text-[10px] px-1.5 py-0">
                          owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ov-muted truncate">{m.email}</p>
                  </div>

                  {isAdmin && !isMe && !isOwnerRow && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemoving(m.id)}
                      title="Retirer"
                    >
                      <Trash2 className="w-4 h-4 text-ov-danger" />
                    </Button>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <InviteToSpaceDialog
        open={inviting}
        onOpenChange={setInviting}
        spaceId={space.id}
        spaceName={space.name}
      />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Retirer ce membre ?"
        description="Il perdra l'accès à cet espace et à tous les transferts associés."
        confirmLabel="Retirer"
        danger
        busy={busy}
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={deletingSpace}
        onOpenChange={setDeletingSpace}
        title="Supprimer cet espace ?"
        description="Tous les membres perdront l'accès. Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
        busy={busy}
        onConfirm={handleDeleteSpace}
      />
    </div>
  );
}