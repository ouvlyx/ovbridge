import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clipboard as ClipIcon,
  Share2,
  Copy,
  Check,
  Trash2,
  Link as LinkIcon,
  Lock,
  Code,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useClipboard } from "./useClipboard";
import ShareClipboardDialog from "./ShareClipboardDialog";
import {
  deleteClipboardItem,
  clearClipboardHistory,
  quickShareFromLocalClipboard,
  type DecryptedClipboard,
} from "@/lib/clipboard";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/AuthProvider";
import { friendlyError } from "@/lib/errors";
import ConfirmDialog from "@/features/devices/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "à l'instant";
  if (d < 60) return `il y a ${d} min`;
  const h = Math.floor(d / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function KindIcon({ kind }: { kind: DecryptedClipboard["kind"] }) {
  if (kind === "url") return <LinkIcon className="w-4 h-4" />;
  if (kind === "password") return <Lock className="w-4 h-4" />;
  if (kind === "code") return <Code className="w-4 h-4" />;
  return <ClipIcon className="w-4 h-4" />;
}

export default function ClipboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading, refresh } = useClipboard();

  const [sharing, setSharing] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [prefillContent, setPrefillContent] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DecryptedClipboard | null>(null);
  const [clearing, setClearing] = useState(false);
  const [busy, setBusy] = useState(false);

  const copy = async (item: DecryptedClipboard) => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("Copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const onQuickShare = async () => {
    if (!user) return;
    const me = getStoredIdentity();
    if (!me) return;

    setQuickBusy(true);
    try {
      const result = await quickShareFromLocalClipboard(user.id, me);

      if (result.status === "sent") {
        toast.success("Presse-papiers partagé ✅");
        await refresh();
      } else if (result.status === "empty") {
        toast.error("Le presse-papiers est vide");
      } else if (result.status === "denied") {
        toast.error("Accès au presse-papiers refusé");
      } else if (result.status === "sensitive") {
        setPrefillContent(result.content);
        setSharing(true);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setQuickBusy(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteClipboardItem(deleting.id);
      toast.success("Élément supprimé");
      setDeleting(null);
      await refresh();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const onClearAll = async () => {
    setBusy(true);
    try {
      await clearClipboardHistory();
      toast.success("Historique vidé");
      setClearing(false);
      await refresh();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold">Presse-papiers partagé</h1>
          <p className="text-xs text-ov-muted">
            Accessible sur tous vos appareils
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setClearing(true)}
            title="Tout effacer"
          >
            <Trash2 className="w-4 h-4 text-ov-muted" />
          </Button>
        )}
      </header>

      {/* 2 boutons principaux */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onQuickShare}
          disabled={quickBusy}
          className="bg-ov-primary hover:bg-ov-primaryHover"
        >
          <Zap className="w-4 h-4 mr-2" />
          {quickBusy ? "Envoi…" : "Copier maintenant"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPrefillContent(null);
            setSharing(true);
          }}
        >
          <Share2 className="w-4 h-4 mr-2" /> Saisir
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ov-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 border-ov-border text-center space-y-3">
          <ClipIcon className="w-8 h-8 mx-auto text-ov-muted" />
          <p className="text-sm text-ov-muted">
            Aucun contenu partagé pour l'instant.
          </p>
          <p className="text-xs text-ov-muted">
            Copiez quelque chose puis cliquez sur "Copier maintenant".
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="p-3 border-ov-border space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-ov-bg text-ov-accent flex items-center justify-center shrink-0">
                      <KindIcon kind={item.kind} />
                    </div>
                    <Badge className="bg-ov-primary/15 text-ov-primary border-0 text-[10px]">
                      {item.kind}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-ov-muted shrink-0">
                    {timeAgo(item.created_at)}
                  </span>
                </div>

                <pre className="text-xs bg-ov-bg rounded-lg p-2 whitespace-pre-wrap break-all max-h-24 overflow-auto">
                  {item.preview ?? item.content}
                </pre>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(item)}
                    className="flex-1"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    {copiedId === item.id ? "Copié" : "Copier"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(item)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3 h-3 text-ov-danger" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Dialogue de partage */}
      <ShareClipboardDialog
        open={sharing}
        onOpenChange={(v) => {
            setSharing(v);
            if (!v) setPrefillContent(null);
        }}
        onSent={refresh}
        prefillContent={prefillContent}
        />

      {/* Confirmation suppression */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Supprimer cet élément ?"
        description="Il sera retiré de tous vos appareils."
        confirmLabel="Supprimer"
        danger
        busy={busy}
        onConfirm={onDelete}
      />

      {/* Confirmation clear all */}
      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title="Vider tout l'historique ?"
        description="Tous les contenus partagés seront supprimés définitivement."
        confirmLabel="Tout effacer"
        danger
        busy={busy}
        onConfirm={onClearAll}
      />
    </div>
  );
}