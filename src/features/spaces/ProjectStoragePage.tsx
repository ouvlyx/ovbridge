import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Cloud,
  Download,
  File,
  Folder,
  HardDrive,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConfirmDialog from "@/features/devices/ConfirmDialog";
import { friendlyError } from "@/lib/errors";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { getStoredIdentity } from "@/lib/device";
import { supabase } from "@/lib/supabase";
import {
  deleteProjectFile,
  downloadProjectFile,
  getOrCreateProjectKey,
  listProjectFiles,
  syncProjectKeysToMemberDevices,
  uploadProjectFile,
  type ProjectFile,
} from "@/lib/projectWorkspace";
import type { Space } from "@/lib/spaces";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function ProjectStoragePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProjectFile | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    if (!user) throw new Error("Connectez-vous pour accéder au projet.");

    const [
      { data: project, error: projectError },
      projectFiles,
      { data: membership, error: membershipError },
    ] = await Promise.all([
      supabase.from("ovbridge_spaces").select("*").eq("id", id).maybeSingle(),
      listProjectFiles(id),
      supabase
        .from("ovbridge_space_members")
        .select("role")
        .eq("space_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (projectError) throw projectError;
    if (membershipError) throw membershipError;
    setSpace((project as Space | null) ?? null);
    setIsProjectAdmin(membership?.role === "admin");
    setFiles(projectFiles);
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    void (async () => {
      try {
        await refresh();
      } catch (error) {
        if (active) toast.error(friendlyError(error));
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`project_storage_${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "ovbridge",
          table: "ovbridge_project_files",
          filter: `space_id=eq.${id}`,
        },
        () => {
          void refresh().catch((error) =>
            console.error("[ProjectStoragePage] Refresh failed:", error)
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [id, refresh]);

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !id || !user) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Fichier trop volumineux. Max ${MAX_FILE_SIZE_MB} Mo.`);
      return;
    }

    const identity = getStoredIdentity();
    if (!identity) {
      toast.error("Identité de cet appareil introuvable.");
      return;
    }

    setBusy(true);
    try {
      await uploadProjectFile(id, user.id, identity, file);
      toast.success("Fichier ajouté au projet");
      await refresh();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (file: ProjectFile) => {
    const identity = getStoredIdentity();
    if (!identity) {
      toast.error("Identité de cet appareil introuvable.");
      return;
    }

    setBusyFileId(file.id);
    try {
      const blob = await downloadProjectFile(file, identity);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusyFileId(null);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusyFileId(deleting.id);
    try {
      await deleteProjectFile(deleting);
      setFiles((current) => current.filter((file) => file.id !== deleting.id));
      toast.success("Fichier supprimé du projet");
    } catch (error) {
      toast.error(friendlyError(error));
      await refresh().catch((refreshError) =>
        console.error("[ProjectStoragePage] Refresh after deletion failed:", refreshError)
      );
    } finally {
      setBusyFileId(null);
      setDeleting(null);
    }
  };

  const onSyncKeys = async () => {
    if (!id) return;
    const identity = getStoredIdentity();
    if (!identity) {
      toast.error("Identité de cet appareil introuvable.");
      return;
    }

    setBusy(true);
    try {
      await getOrCreateProjectKey(id, identity);
      const count = await syncProjectKeysToMemberDevices(id, identity);
      toast.success(
        count > 0
          ? `Clés partagées avec ${count} nouvel appareil${count > 1 ? "s" : ""}`
          : "Les appareils approuvés ont déjà accès aux clés du projet"
      );
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const usedBytes = Number(space?.storage_used_bytes ?? 0);
  const quotaBytes = Number(space?.storage_quota_bytes ?? 1024 * 1024 * 1024);
  const usedPercent = Math.min(100, (usedBytes / Math.max(1, quotaBytes)) * 100);

  if (loading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto text-sm text-ov-muted">
        Chargement du stockage du projet…
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-ov-muted">
          Projet introuvable ou accès réservé à ses membres.
        </p>
        <Button variant="outline" onClick={() => navigate("/spaces")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux projets
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
      <header className="flex items-center gap-3 border-b border-ov-border pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/spaces/${space.id}`)}
          aria-label="Retour au projet"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ov-muted truncate">{space.name}</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Folder className="w-5 h-5 text-ov-primary" />
            Fichiers du projet
          </h1>
        </div>
        {isProjectAdmin && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => void onSyncKeys()}
            disabled={busy}
            title="Partager les clés avec les appareils approuvés des membres"
            aria-label="Synchroniser les clés du projet"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </Button>
        )}
      </header>

      <Card className="p-4 sm:p-5 border-ov-primary/30 bg-gradient-to-r from-ov-primary/10 to-ov-surface space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-ov-primary/15 text-ov-primary flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">Espace partagé du projet</h2>
            <p className="text-xs text-ov-muted mt-1">
              Stockage distinct de « Mon espace ». Les membres du projet peuvent
              consulter, ajouter et supprimer ses fichiers chiffrés.
            </p>
            <p className="text-xs text-ov-muted mt-1">
              {isProjectAdmin
                ? "Après l'ajout d'un membre, synchronisez ses appareils approuvés pour leur donner accès aux fichiers."
                : "Un administrateur du projet doit synchroniser les clés avec les nouveaux appareils."}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-ov-muted">
            <span>{formatBytes(usedBytes)} utilisés</span>
            <span>{formatBytes(quotaBytes)} au total</span>
          </div>
          <div
            className="h-2 rounded-full bg-ov-bg overflow-hidden"
            role="progressbar"
            aria-label="Espace utilisé"
            aria-valuenow={Math.round(usedPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-ov-primary transition-all"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onUpload}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full sm:w-auto bg-ov-primary hover:bg-ov-primaryHover"
        >
          <Upload className="w-4 h-4 mr-2" />
          {busy ? "Traitement…" : "Ajouter un fichier"}
        </Button>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Fichiers ({files.length})</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh().catch((error) => toast.error(friendlyError(error)))}
            aria-label="Actualiser la liste"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {files.length === 0 ? (
          <Card className="p-8 text-center border-ov-border bg-ov-surface">
            <Cloud className="w-8 h-8 mx-auto text-ov-muted mb-3" />
            <p className="text-sm font-medium">Aucun fichier partagé</p>
            <p className="text-xs text-ov-muted mt-1">
              Ajoutez le premier fichier pour le rendre accessible aux membres.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id}>
                <Card className="p-3 sm:p-4 border-ov-border bg-ov-surface flex items-center gap-3">
                  <File className="w-5 h-5 text-ov-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-ov-muted">
                      {formatBytes(file.size_bytes)} ·{" "}
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void onDownload(file)}
                    disabled={busy || busyFileId === file.id}
                    aria-label={`Télécharger ${file.name}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(file)}
                    disabled={busy || busyFileId === file.id}
                    aria-label={`Supprimer ${file.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-ov-danger" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !busyFileId) setDeleting(null);
        }}
        title="Supprimer ce fichier du projet ?"
        description={`« ${deleting?.name ?? ""} » sera supprimé pour tous les membres du projet.`}
        confirmLabel="Supprimer"
        danger
        busy={busyFileId !== null}
        onConfirm={onDelete}
      />
    </div>
  );
}
