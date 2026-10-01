import { friendlyError } from "@/lib/errors";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthProvider";
import { createSpace } from "@/lib/spaces";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

export default function CreateSpaceDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Nom requis");
    setBusy(true);
    try {
      await createSpace(user.id, name, description);
      toast.success("Espace créé");
      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel espace</DialogTitle>
          <DialogDescription>
            Un espace regroupe plusieurs utilisateurs. Idéal pour un projet, une
            équipe ou un partage entre amis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Nom</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="Projet Alpha, Famille, Équipe dev…"
              autoFocus
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="space-desc">Description (optionnel)</Label>
            <Input
              id="space-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDescription(e.target.value)
              }
              placeholder="À quoi sert cet espace ?"
              maxLength={200}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">
                Annuler
              </Button>
            </DialogClose>
            <Button
              onClick={submit}
              disabled={busy}
              className="flex-1 bg-ov-primary hover:bg-ov-primaryHover"
            >
              {busy ? "Création…" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}