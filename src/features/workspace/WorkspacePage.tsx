import { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  X,
  CheckSquare,
  Square,
  Download,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "./useWorkspace";
import { useWorkspaceFiles } from "./useWorkspaceFiles";
import {
  uploadWorkspaceFile,
  downloadWorkspaceFile,
  deleteWorkspaceFile,
  toggleBlockFile,
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
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/features/devices/ConfirmDialog";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Utils                                                              */
/* ------------------------------------------------------------------ */

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

type FilterKind = "all" | "image" | "video" | "doc";

function matchFilter(mime: string | null, kind: FilterKind): boolean {
  if (kind === "all") return true;
  if (!mime) return false;
  if (kind === "image") return mime.startsWith("image/");
  if (kind === "video") return mime.startsWith("video/");
  return (
    mime.startsWith("text/") ||
    mime === "application/pdf" ||
    mime.includes("document") ||
    mime.includes("sheet") ||
    mime.includes("presentation")
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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
  const [blocking, setBlocking] = useState<WorkspaceFile | null>(null);
  const [bulkAction, setBulkAction] = useState<
    "delete" | "block" | "download" | null
  >(null);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastClickedRef = useRef<string | null>(null);

  /* ---------- filtrage + recherche ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => {
      if (!matchFilter(f.mime_type, filter)) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [files, query, filter]);

  const selectedFiles = useMemo(
    () => files.filter((f) => selected.has(f.id)),
    [files, selected]
  );

  const allSelected =
    filtered.length > 0 && filtered.every((f) => selected.has(f.id));

  /* ---------- cache local ---------- */
  useEffect(() => {
    (async () => {
      const set = new Set<string>();
      for (const f of files) {
        if (await isCached(f.id)) set.add(f.id);
      }
      setCachedIds(set);
    })();
  }, [files]);

  /* ---------- auto-cache des petits fichiers ---------- */
  useEffect(() => {
    if (!files.length) return;
    const me = getStoredIdentity();
    if (!me) return;

    let active = true;
    (async () => {
      for (const f of files) {
        if (!active) break;
        if (cachedIds.has(f.id)) continue;
        if (f.size_bytes > 10 * 1024 * 1024) continue;
        if (f.is_blocked) continue;
        try {
          const blob = await downloadWorkspaceFile(f, me);
          if (active) {
            await cacheBlob(f.id, f.name, f.mime_type, blob);
            setCachedIds((prev) => new Set([...prev, f.id]));
          }
        } catch {
          /* silencieux */
        }
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  /* ---------- sélection ---------- */
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const handleRowClick = (e: React.MouseEvent, id: string) => {
    if (e.shiftKey && lastClickedRef.current) {
      const fromIdx = filtered.findIndex((f) => f.id === lastClickedRef.current);
      const toIdx = filtered.findIndex((f) => f.id === id);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        setSelected((prev) => {
          const s = new Set(prev);
          for (let i = start; i <= end; i++) s.add(filtered[i].id);
          return s;
        });
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      toggleOne(id);
    } else {
      setSelected(new Set([id]));
    }
    lastClickedRef.current = id;
  };

  const selectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((f) => f.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  /* ---------- upload ---------- */
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

  /* ---------- export individuel ---------- */
  const onExport = async (wf: WorkspaceFile) => {
    if (wf.is_blocked) {
      return toast.error("Ce fichier est bloqué.");
    }
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

  /* ---------- suppression individuelle ---------- */
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
      await refreshFiles();
      await refreshWorkspace();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  /* ---------- blocage individuel ---------- */
  const onBlock = async () => {
    if (!blocking) return;
    setBusyId(blocking.id);
    try {
      await toggleBlockFile(blocking, !blocking.is_blocked);
      toast.success(blocking.is_blocked ? "Fichier débloqué" : "Fichier bloqué");
      await refreshFiles();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
      setBlocking(null);
    }
  };

  /* ---------- actions en groupe ---------- */
  const onBulkDelete = async () => {
    const list = selectedFiles.filter((f) => !f.is_blocked);
    setBusyId("__bulk__");
    try {
      for (const f of list) {
        await deleteWorkspaceFile(f);
        await uncacheFile(f.id);
      }
      setCachedIds((prev) => {
        const s = new Set(prev);
        list.forEach((f) => s.delete(f.id));
        return s;
      });
      toast.success(`${list.length} fichier(s) supprimé(s)`);
      clearSelection();
      await refreshFiles();
      await refreshWorkspace();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
      setBulkAction(null);
    }
  };

  const onBulkBlock = async () => {
    const list = selectedFiles;
    setBusyId("__bulk__");
    try {
      // Bascule : si tous bloqués → débloquer, sinon bloquer
      const allBlocked = list.every((f) => f.is_blocked);
      for (const f of list) {
        await toggleBlockFile(f, !allBlocked);
      }
      toast.success(
        allBlocked
          ? `${list.length} fichier(s) débloqué(s)`
          : `${list.length} fichier(s) bloqué(s)`
      );
      clearSelection();
      await refreshFiles();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
      setBulkAction(null);
    }
  };

  const onBulkDownload = async () => {
    const list = selectedFiles.filter((f) => !f.is_blocked);
    setBusyId("__bulk__");
    try {
      const me = getStoredIdentity();
      if (!me) throw new Error("Identité introuvable");
      for (const f of list) {
        try {
          if (!(await isCached(f.id))) {
            const blob = await downloadWorkspaceFile(f, me);
            await cacheBlob(f.id, f.name, f.mime_type, blob);
            setCachedIds((prev) => new Set([...prev, f.id]));
          }
          await exportFile(f.id, f.name);
          await new Promise((r) => setTimeout(r, 300));
        } catch (e) {
          console.warn("[bulk download]", f.name, e);
        }
      }
      toast.success(`${list.length} fichier(s) exporté(s)`);
      clearSelection();
      setBulkAction(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  /* ---------- loading ---------- */
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

  const isSelecting = selected.size > 0;

  return (
    <div className="min-h-screen max-w-2xl mx-auto bg-ov-bg pb-24">
      {/* ---------- Header sticky ---------- */}
      <header className="sticky top-0 z-20 bg-ov-bg/95 backdrop-blur-md border-b border-ov-border">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isSelecting) clearSelection();
              else navigate("/devices");
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {isSelecting
                ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}`
                : workspace.name}
            </h1>
            <p className="text-[11px] text-ov-muted truncate">
              {isSelecting
                ? "Touchez pour désélectionner"
                : `${files.length} fichier${files.length > 1 ? "s" : ""} · ${formatBytes(
                    workspace.used_bytes
                  )} / ${formatBytes(workspace.quota_bytes)}`}
            </p>
          </div>
          {isSelecting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              {allSelected ? "Aucun" : "Tout"}
            </Button>
          )}
        </div>

        {/* Barre de recherche + filtre */}
        {!isSelecting && files.length > 0 && (
          <div className="px-4 sm:px-6 pb-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ov-muted pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un fichier…"
                className="pl-9 h-9 text-sm bg-ov-surface border-ov-border"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ov-muted hover:text-ov-text"
                  aria-label="Effacer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {(
                [
                  { k: "all", label: "Tout" },
                  { k: "image", label: "Images" },
                  { k: "video", label: "Vidéos" },
                  { k: "doc", label: "Documents" },
                ] as { k: FilterKind; label: string }[]
              ).map((f) => (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  className={cn(
                    "text-[11px] px-3 py-1 rounded-full whitespace-nowrap transition-colors",
                    filter === f.k
                      ? "bg-ov-primary text-white"
                      : "bg-ov-surface text-ov-muted hover:text-ov-text border border-ov-border"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ---------- Quota + Upload ---------- */}
      <div className="px-4 sm:px-6 pt-4 space-y-4">
        <Card className="p-4 border-ov-border space-y-3">
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
            <span className="text-xs font-medium text-ov-muted">
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 bg-ov-bg rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                pct > 90
                  ? "bg-ov-danger"
                  : pct > 70
                  ? "bg-ov-warning"
                  : "bg-gradient-to-r from-ov-primary to-ov-accent"
              )}
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
      </div>

      {/* ---------- Liste ---------- */}
      <section className="px-4 sm:px-6 pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ov-muted uppercase tracking-wide">
            Fichiers
          </h2>
          {filtered.length > 0 && !isSelecting && (
            <button
              onClick={selectAll}
              className="text-[11px] text-ov-primary hover:underline"
            >
              Tout sélectionner
            </button>
          )}
        </div>

        {filesLoading ? (
          <p className="text-sm text-ov-muted">Chargement…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 border-ov-border text-center space-y-3">
            <Folder className="w-8 h-8 mx-auto text-ov-muted" />
            <p className="text-sm text-ov-muted">
              {files.length === 0
                ? "Aucun fichier. Ajoutez-en un ci-dessus."
                : "Aucun fichier ne correspond à votre recherche."}
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((f) => {
              const cached = cachedIds.has(f.id);
              const isSelected = selected.has(f.id);
              const isBusy = busyId === f.id || busyId === "__bulk__";

              return (
                <li key={f.id}>
                  <Card
                    onClick={(e) => handleRowClick(e, f.id)}
                    className={cn(
                      "p-3 border-ov-border flex items-center gap-3 cursor-pointer transition-all",
                      "hover:border-ov-primary/40",
                      isSelected && "border-ov-primary bg-ov-primary/[0.04]",
                      f.is_blocked && "opacity-60"
                    )}
                  >
                    {/* Checkbox de sélection */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOne(f.id);
                      }}
                      className="shrink-0"
                      aria-label={isSelected ? "Désélectionner" : "Sélectionner"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-ov-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-ov-muted" />
                      )}
                    </button>

                    {/* Icône type */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        f.is_blocked
                          ? "bg-ov-danger/15 text-ov-danger"
                          : cached
                          ? "bg-ov-success/15 text-ov-success"
                          : "bg-ov-bg text-ov-accent"
                      )}
                    >
                      <FileKindIcon mime={f.mime_type} />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {f.name}
                        {f.is_blocked && (
                          <Lock className="w-3 h-3 text-ov-danger shrink-0" />
                        )}
                      </p>
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

                    {/* Actions individuelles */}
                    {!isSelecting && (
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          aria-label="Exporter"
                          disabled={isBusy || f.is_blocked}
                          onClick={() => onExport(f)}
                          title={f.is_blocked ? "Bloqué" : "Exporter"}
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
                          className="w-8 h-8"
                          aria-label={f.is_blocked ? "Débloquer" : "Bloquer"}
                          onClick={() => setBlocking(f)}
                          title={f.is_blocked ? "Débloquer" : "Bloquer"}
                        >
                          {f.is_blocked ? (
                            <Unlock className="w-4 h-4 text-ov-warning" />
                          ) : (
                            <Lock className="w-4 h-4 text-ov-muted" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8"
                          aria-label="Supprimer"
                          onClick={() => setDeleting(f)}
                        >
                          <Trash2 className="w-4 h-4 text-ov-danger" />
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Barre d'actions flottante (sélection) ---------- */}
      {isSelecting && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 bg-gradient-to-t from-ov-bg via-ov-bg to-transparent">
          <Card className="p-2 border-ov-border bg-ov-surface shadow-2xl flex items-center gap-1">
            <button
              onClick={() => setBulkAction("download")}
              disabled={busyId === "__bulk__"}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-ov-bg transition-colors disabled:opacity-40"
            >
              {busyId === "__bulk__" ? (
                <LoaderCircle className="w-4 h-4 text-ov-primary animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-ov-primary" />
              )}
              <span className="text-[10px]">Exporter</span>
            </button>

            <div className="w-px h-8 bg-ov-border" />

            <button
              onClick={() => setBulkAction("block")}
              disabled={busyId === "__bulk__"}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-ov-bg transition-colors disabled:opacity-40"
            >
              {busyId === "__bulk__" ? (
                <LoaderCircle className="w-4 h-4 text-ov-warning animate-spin" />
              ) : (
                <Lock className="w-4 h-4 text-ov-warning" />
              )}
              <span className="text-[10px]">Bloquer</span>
            </button>

            <div className="w-px h-8 bg-ov-border" />

            <button
              onClick={() => setBulkAction("delete")}
              disabled={busyId === "__bulk__"}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-ov-danger/10 transition-colors disabled:opacity-40"
            >
              {busyId === "__bulk__" ? (
                <LoaderCircle className="w-4 h-4 text-ov-danger animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-ov-danger" />
              )}
              <span className="text-[10px]">Supprimer</span>
            </button>

            <div className="w-px h-8 bg-ov-border" />

            <button
              onClick={clearSelection}
              className="w-10 flex items-center justify-center py-2 rounded-lg hover:bg-ov-bg transition-colors"
              aria-label="Annuler la sélection"
            >
              <X className="w-4 h-4 text-ov-muted" />
            </button>
          </Card>
        </div>
      )}

      {/* ---------- Dialogues ---------- */}
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

      <ConfirmDialog
        open={!!blocking}
        onOpenChange={(v) => !v && setBlocking(null)}
        title={blocking?.is_blocked ? "Débloquer ce fichier ?" : "Bloquer ce fichier ?"}
        description={
          blocking?.is_blocked
            ? "Il sera de nouveau téléchargeable."
            : "Il ne sera plus téléchargeable depuis les autres appareils."
        }
        confirmLabel={blocking?.is_blocked ? "Débloquer" : "Bloquer"}
        danger={!blocking?.is_blocked}
        busy={busyId === blocking?.id}
        onConfirm={onBlock}
      />

      <ConfirmDialog
        open={bulkAction === "delete"}
        onOpenChange={(v) => !v && setBulkAction(null)}
        title={`Supprimer ${selectedFiles.length} fichier(s) ?`}
        description="Cette action est irréversible. Les fichiers bloqués seront ignorés."
        confirmLabel="Supprimer"
        danger
        busy={busyId === "__bulk__"}
        onConfirm={onBulkDelete}
      />

      <ConfirmDialog
        open={bulkAction === "block"}
        onOpenChange={(v) => !v && setBulkAction(null)}
        title={
          selectedFiles.every((f) => f.is_blocked)
            ? `Débloquer ${selectedFiles.length} fichier(s) ?`
            : `Bloquer ${selectedFiles.length} fichier(s) ?`
        }
        description={
          selectedFiles.every((f) => f.is_blocked)
            ? "Ils seront de nouveau téléchargeables."
            : "Ils ne seront plus téléchargeables depuis les autres appareils."
        }
        confirmLabel={
          selectedFiles.every((f) => f.is_blocked) ? "Débloquer" : "Bloquer"
        }
        danger={!selectedFiles.every((f) => f.is_blocked)}
        busy={busyId === "__bulk__"}
        onConfirm={onBulkBlock}
      />

      <ConfirmDialog
        open={bulkAction === "download"}
        onOpenChange={(v) => !v && setBulkAction(null)}
        title={`Exporter ${selectedFiles.length} fichier(s) ?`}
        description="Chaque fichier sera ouvert dans le partage natif. Les fichiers bloqués seront ignorés."
        confirmLabel="Exporter"
        busy={busyId === "__bulk__"}
        onConfirm={onBulkDownload}
      />
    </div>
  );
}