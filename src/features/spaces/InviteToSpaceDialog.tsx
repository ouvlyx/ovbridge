import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/features/auth";
import { inviteToSpace, type SpaceInvite } from "@/lib/spaces";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spaceId: string;
  spaceName: string;
};

export default function InviteToSpaceDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
}: Props) {
  const { user } = useAuth();
  const [invite, setInvite] = useState<SpaceInvite | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const inv = await inviteToSpace(spaceId, user.id);
      setInvite(inv);
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !invite) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const joinUrl = invite
    ? `${window.location.origin}/join-space?code=${invite.code}`
    : "";

  const copy = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Lien copié");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter dans « {spaceName} »</DialogTitle>
          <DialogDescription>
            Partagez ce lien ou ce code. Valable 24h, une seule utilisation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {invite ? (
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={joinUrl} size={200} level="M" />
            </div>
          ) : (
            <div className="w-[200px] h-[200px] bg-ov-bg rounded-xl flex items-center justify-center text-ov-muted text-sm">
              {loading ? "Génération…" : "—"}
            </div>
          )}

          <div className="text-center space-y-1">
            <p className="text-xs text-ov-muted uppercase tracking-wide">
              Code d'invitation
            </p>
            <p className="text-2xl font-mono font-bold tracking-widest text-ov-accent">
              {invite?.code ?? "····-····"}
            </p>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={generate}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Nouveau
            </Button>
            <Button onClick={copy} disabled={!invite} className="flex-1">
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
