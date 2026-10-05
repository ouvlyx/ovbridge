import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clipboard, Check } from "lucide-react";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth";
import {
  sendToSharedClipboard,
  checkSensitivity,
  clipboardContentSizeBytes,
  readLocalClipboardText,
} from "@/lib/clipboard";
import { MAX_CLIPBOARD_SIZE_BYTES } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
  prefillContent?: string | null;
};

export default function ShareClipboardDialog({
  open,
  onOpenChange,
  onSent,
  prefillContent,
}: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<{
    sensitive: boolean;
    reason: string | null;
  }>({ sensitive: false, reason: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;

    (async () => {
      if (prefillContent) {
        if (!active) return;
        if (clipboardContentSizeBytes(prefillContent) > MAX_CLIPBOARD_SIZE_BYTES) {
          setError("Le contenu est trop volumineux. La limite est de 512 Kio.");
          return;
        }
        setContent(prefillContent);
        setSensitivity(checkSensitivity(prefillContent));
        return;
      }

      try {
        const text = await readLocalClipboardText();
        if (!active) return;
        if (!text) {
          setError("Le presse-papiers est vide.");
          return;
        }
        if (clipboardContentSizeBytes(text) > MAX_CLIPBOARD_SIZE_BYTES) {
          setError("Le contenu est trop volumineux. La limite est de 512 Kio.");
          return;
        }
        setContent(text);
        setSensitivity(checkSensitivity(text));
      } catch (readError) {
        if (active) {
          setError(friendlyError(readError));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open, prefillContent]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setContent("");
      setError(null);
      setSensitivity({ sensitive: false, reason: null });
    }
    onOpenChange(isOpen);
  };

  const submit = async () => {
    if (!user || !content.trim()) return;
    if (clipboardContentSizeBytes(content) > MAX_CLIPBOARD_SIZE_BYTES) {
      setError("Le contenu est trop volumineux. La limite est de 512 Kio.");
      return;
    }
    const me = getStoredIdentity();
    if (!me) return;

    setBusy(true);
    try {
      await sendToSharedClipboard(user.id, me, content);
      toast.success("Contenu partagé");
      handleOpenChange(false);
      onSent();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-ov-accent" />
            Partager dans le presse-papiers
          </DialogTitle>
          <DialogDescription>
            Ce contenu sera visible depuis vos autres appareils.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-ov-danger/10 text-ov-danger text-xs p-3">
              {error}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => {
              const nextContent = e.target.value;
              if (clipboardContentSizeBytes(nextContent) > MAX_CLIPBOARD_SIZE_BYTES) {
                setError("Le contenu est trop volumineux. La limite est de 512 Kio.");
                return;
              }
              setError(null);
              setContent(nextContent);
              setSensitivity(checkSensitivity(nextContent));
            }}
            rows={5}
            placeholder="Collez ici… (512 Kio maximum)"
            className="w-full rounded-xl border border-ov-border bg-ov-bg p-3 text-sm text-ov-text focus:outline-none focus:ring-2 focus:ring-ov-primary"
          />

          {content.length > 0 && (
            <p className="text-[10px] text-ov-muted">
              {content.length} caractère{content.length > 1 ? "s" : ""}
            </p>
          )}

          {sensitivity.sensitive && (
            <div className="rounded-lg bg-ov-danger/10 border border-ov-danger/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-ov-danger shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-ov-danger">
                  Contenu sensible détecté
                </p>
                <p className="text-ov-muted mt-1">{sensitivity.reason}</p>
                <p className="text-ov-muted mt-1">
                  Voulez-vous vraiment le partager ? Il sera stocké chiffré,
                  mais visible depuis vos autres appareils.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">
                Annuler
              </Button>
            </DialogClose>
            <Button
              onClick={submit}
              disabled={busy || !content.trim() || !!error}
              className={
                sensitivity.sensitive
                  ? "flex-1 bg-ov-danger hover:opacity-90"
                  : "flex-1 bg-ov-primary hover:bg-ov-primaryHover"
              }
            >
              {busy ? (
                "Envoi…"
              ) : sensitivity.sensitive ? (
                <>
                  <Check className="w-4 h-4 mr-2" /> Partager quand même
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" /> Partager
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
