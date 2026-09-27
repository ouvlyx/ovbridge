import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
  deviceId: string;
  currentName: string;
  onRenamed?: () => void;   // ← NOUVEAU
};

export default function RenameDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  currentName,
  onRenamed,
}: Props) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Nom vide");
    if (trimmed === currentName) return onOpenChange(false);

    setBusy(true);
    const { error } = await supabase
      .from("ovbridge_devices")
      .update({ name: trimmed })
      .eq("id", deviceId);

    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Appareil renommé");
    onOpenChange(false);
    onRenamed?.();   // ← NOUVEAU
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setName(currentName);
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer l'appareil</DialogTitle>
          <DialogDescription>
            Ce nom sera visible depuis vos autres appareils.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Nom</Label>
            <Input
              id="device-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              autoFocus
              maxLength={40}
            />
          </div>

          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">
                Annuler
              </Button>
            </DialogClose>
            <Button
              onClick={save}
              disabled={busy}
              className="flex-1 bg-ov-primary hover:bg-ov-primaryHover"
            >
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}