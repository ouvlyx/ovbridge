import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  HardDrive,
  Upload,
  Folder,
  Trash2,
  FileText,
  Image as ImageIcon,
  File as LucideFile,
  LoaderCircle,
  Share2,
  Check,
  CloudDownload,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "./useWorkspace";
import { useWorkspaceFiles } from "./useWorkspaceFiles";
import {
  uploadWorkspaceFile,
  downloadWorkspaceFile,
  deleteWorkspaceFile,
  type WorkspaceFile,
} from "@/lib/workspace";
import {
  cacheBlob,
  isCached,
  exportFile,
  uncacheFile,
} from "@/lib/localCache";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ConfirmDialog from "@/features/devices/ConfirmDialog";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "à l'instant";
  if (d < 60) return `il y a ${d} min`;
  const h = Math.floor(d / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function FileKindIcon({ mime }: { mime: string | null }) {
  if (!mime) return <LucideFile className="w-5 h-5" />;
  if (mime.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace, loading, refresh: refreshWorkspace } = useWorkspace();
  const {
    files,
    loading: filesLoading,
    refresh: refreshFiles,
  } = useWorkspaceFiles(workspace?.id);

  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceFile | null>(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vérifie quels fichiers sont déjà en cache local
  useEffect(() => {
    (async () => {
      const set = new Set<string>();
      for (const f of files) {
        if (await isCached(f.id)) set.add(f.id);
      }
      setCachedIds(set);
    })();
  }, [files]);

  // Téléchargement auto des fichiers (cache local en arrière-plan)
  useEffect(() => {
    if (!files.length) return;
    const me = getStoredIdentity();
    if (!me) return;

    (async () => {
      for (const f of files) {
        if (cachedIds.has(f.id)) continue;
        // auto-cache uniquement les fichiers < 10 Mo pour ne pas saturer
        if (f.size_bytes > 10 * 1024 * 1024) continue;
        try {
          const blob = await downloadWorkspaceFile(f, me);
          await cacheBlob(f.id, f.name, f.mime_type, blob);
          setCachedIds((prev) => new Set([...prev, f.id]));
        } catch {
          // silencieux
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!f || !workspace || !user) return;

    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return toast.error(
        `Fichier trop volumineux. Max ${MAX_FILE_SIZE_MB} Mo.`
      );
    }

    const me = getStoredIdentity();
    if (!me) return toast.error("Identité introuvable");

    setUploading(true);
    try {
      const wf = await uploadWorkspaceFile(user.id, workspace.id, me, f);
      // Ajoute direct au cache local (on a déjà le clair)
      await cacheBlob(wf.id, f.name, f.type, f);
      setCachedIds((prev) => new Set([...prev, wf.id]));
      toast.success("Fichier ajouté");
      await refreshFiles();
      await refreshWorkspace();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setUploading(false);
    }
  };

  const onExport = async (wf: WorkspaceFile) => {
    setBusyId(wf.id);
    try {
      if (!(await isCached(wf.id))) {
        const me = getStoredIdentity();
        if (!me) throw new Error("Identité introuvable");
        const blob = await downloadWorkspaceFile(wf, me);
        await cacheBlob(wf.id, wf.name, wf.mime_type, blob);
        setCachedIds((prev) => new Set([...prev, wf.id]));
      }
      await exportFile(wf.id, wf.name);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteWorkspaceFile(deleting);
      await uncacheFile(deleting.id);
      setCachedIds((prev) => {
        const s = new Set(prev);
        s.delete(deleting.id);
        return s;
      });
      toast.success("Fichier supprimé");
      setDeleting(null);
      await refreshFiles();
      await refreshWorkspace();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto">
        <p className="text-sm text-ov-muted">Chargement…</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto">
        <p className="text-sm text-ov-danger">Workspace introuvable.</p>
      </div>
    );
  }

  const pct = Math.min(
    100,
    (workspace.used_bytes / workspace.quota_bytes) * 100
  );

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/devices")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{workspace.name}</h1>
          <p className="text-xs text-ov-muted">Espace perso</p>
        </div>
      </header>

      <Card className="p-5 border-ov-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ov-primary/15 text-ov-primary flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Stockage</p>
            <p className="text-xs text-ov-muted">
              {formatBytes(workspace.used_bytes)} sur{" "}
              {formatBytes(workspace.quota_bytes)}
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-ov-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ov-primary to-ov-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onUpload}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full bg-ov-primary hover:bg-ov-primaryHover"
      >
        {uploading ? (
          <>
            <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> Envoi…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" /> Ajouter un fichier
          </>
        )}
      </Button>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ov-muted uppercase tracking-wide">
          Fichiers ({files.length})
        </h2>

        {filesLoading ? (
          <p className="text-sm text-ov-muted">Chargement…</p>
        ) : files.length === 0 ? (
          <Card className="p-8 border-ov-border text-center space-y-3">
            <Folder className="w-8 h-8 mx-auto text-ov-muted" />
            <p className="text-sm text-ov-muted">
              Aucun fichier. Ajoutez-en un ci-dessus.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => {
              const cached = cachedIds.has(f.id);
              return (
                <li key={f.id}>
                  <Card className="p-3 border-ov-border flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        cached
                          ? "bg-ov-success/15 text-ov-success"
                          : "bg-ov-bg text-ov-accent"
                      )}
                    >
                      <FileKindIcon mime={f.mime_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-[10px] text-ov-muted flex items-center gap-1">
                        {formatBytes(f.size_bytes)} · {timeAgo(f.created_at)}
                        {cached && (
                          <>
                            {" · "}
                            <Check className="w-3 h-3 text-ov-success" />
                            <span className="text-ov-success">local</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Exporter"
                        disabled={busyId === f.id}
                        onClick={() => onExport(f)}
                        title="Exporter"
                      >
                        {busyId === f.id ? (
                          <LoaderCircle className="w-4 h-4 animate-spin text-ov-muted" />
                        ) : cached ? (
                          <Share2 className="w-4 h-4 text-ov-success" />
                        ) : (
                          <CloudDownload className="w-4 h-4 text-ov-muted" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        onClick={() => setDeleting(f)}
                      >
                        <Trash2 className="w-4 h-4 text-ov-danger" />
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Supprimer ce fichier ?"
        description={`"${deleting?.name}" sera supprimé définitivement.`}
        confirmLabel="Supprimer"
        danger
        busy={busyId === deleting?.id}
        onConfirm={onDelete}
      />
    </div>
  );
}

