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
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  busy?: boolean;
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  danger = false,
  onConfirm,
  busy = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline" className="flex-1">
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className={
              danger
                ? "flex-1 bg-ov-danger hover:opacity-90"
                : "flex-1 bg-ov-primary hover:bg-ov-primaryHover"
            }
          >
            {busy ? "…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}