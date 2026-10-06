import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { ArrowLeft, Send, FileUp, Type, Users, Smartphone, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import { getStoredIdentity } from "@/lib/device";
import {
  sendText,
  sendFile,
  sendTextToSpace,
  sendFileToSpace,
} from "@/lib/transfers";
import { queueOfflineTransfer, fileToBase64 } from "@/lib/offlineQueue";
import { useSpaces } from "@/features/spaces/useSpaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DeviceTarget = {
  id: string;
  name: string;
  public_key: string;
  kind: "device";
};

type SpaceTarget = {
  id: string;
  name: string;
  members: number;
  kind: "space";
};

type Target = DeviceTarget | SpaceTarget;

export default function SendPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { spaces } = useSpaces();

  const [devices, setDevices] = useState<DeviceTarget[]>([]);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  // Charge mes autres appareils
  useEffect(() => {
    if (!user) return;
    (async () => {
      const me = getStoredIdentity();
      if (!me) return;
      const { data } = await supabase
        .from("ovbridge_devices")
        .select("id, name, public_key, revoked")
        .eq("user_id", user.id)
        .neq("id", me.deviceId)
        .eq("revoked", false);

      setDevices(
        (data ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          public_key: d.public_key,
          kind: "device" as const,
        }))
      );
    })();
  }, [user]);

  // Construit la liste unifiée des cibles
  const targets: Target[] = [
    ...devices,
    ...spaces.map((s) => ({
      id: s.id,
      name: s.name,
      members: s.members.length,
      kind: "space" as const,
    })),
  ];

  // Sélection par défaut
  useEffect(() => {
    if (!targetKey && targets.length > 0) {
      setTargetKey(`${targets[0].kind}:${targets[0].id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.length]);

  const selected = targets.find(
    (t) => `${t.kind}:${t.id}` === targetKey
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setMode("file");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selected) return;
    if (file && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return toast.error(
        `Fichier trop volumineux. Taille maximale : ${MAX_FILE_SIZE_MB} Mo.`
      );
    }
    const me = getStoredIdentity();
    if (!me) return;

    setBusy(true);

    // Envoi hors-ligne immédiat si le navigateur signale hors-ligne
    if (!navigator.onLine) {
      let b64: string | undefined;
      if (mode === "file" && file) {
        b64 = await fileToBase64(file);
      }
      queueOfflineTransfer({
        userId: user.id,
        kind: mode,
        targetKind: selected.kind,
        targetId: selected.id,
        targetPublicKey: selected.kind === "device" ? selected.public_key : undefined,
        content: mode === "text" ? text : undefined,
        fileName: file?.name,
        fileMime: file?.type,
        fileBase64: b64,
      });
      setText("");
      setFile(null);
      setBusy(false);
      navigate("/devices");
      return;
    }

    try {
      if (selected.kind === "device") {
        if (mode === "text") {
          if (!text.trim()) throw new Error("Texte vide");
          await sendText(user.id, me, selected, text);
          setText("");
        } else {
          if (!file) throw new Error("Aucun fichier");
          await sendFile(user.id, me, selected, file);
          setFile(null);
        }
        toast.success("Envoyé ✅");
      } else {
        if (mode === "text") {
          if (!text.trim()) throw new Error("Texte vide");
          const r = await sendTextToSpace(user.id, me, selected.id, text);
          toast.success(
            `Envoyé à ${r.sent} appareil${r.sent > 1 ? "s" : ""}` +
              (r.failed ? ` (${r.failed} échec)` : "")
          );
          setText("");
        } else {
          if (!file) throw new Error("Aucun fichier");
          const r = await sendFileToSpace(user.id, me, selected.id, file);
          toast.success(
            `Envoyé à ${r.sent} appareil${r.sent > 1 ? "s" : ""}` +
              (r.failed ? ` (${r.failed} échec)` : "")
          );
          setFile(null);
        }
      }
      navigate("/devices");
    } catch (_err: any) {
      // Si une erreur de réseau survient pendant l'envoi, basculer dans la file hors-ligne
      let b64: string | undefined;
      if (mode === "file" && file) {
        b64 = await fileToBase64(file);
      }
      queueOfflineTransfer({
        userId: user.id,
        kind: mode,
        targetKind: selected.kind,
        targetId: selected.id,
        targetPublicKey: selected.kind === "device" ? selected.public_key : undefined,
        content: mode === "text" ? text : undefined,
        fileName: file?.name,
        fileMime: file?.type,
        fileBase64: b64,
      });
      toast.info("Stocké dans la file hors-ligne suite à un souci réseau.");
      navigate("/devices");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "min-h-screen p-6 max-w-md mx-auto space-y-6 transition-colors",
        isDragging && "bg-ov-primary/10 border-2 border-dashed border-ov-primary rounded-2xl"
      )}
    >
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/devices")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Nouvel envoi</h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Destinataire</Label>
          <select
            value={targetKey ?? ""}
            onChange={(e) => setTargetKey(e.target.value)}
            className="w-full h-10 rounded-xl border border-ov-border bg-ov-bg px-3 text-sm text-ov-text"
          >
            {targets.length === 0 && <option value="">Aucune cible</option>}
            {devices.length > 0 && (
              <optgroup label="Mes appareils">
                {devices.map((d) => (
                  <option key={`device:${d.id}`} value={`device:${d.id}`}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            )}
            {spaces.length > 0 && (
              <optgroup label="Mes espaces">
                {spaces.map((s) => (
                  <option key={`space:${s.id}`} value={`space:${s.id}`}>
                    {s.name} ({s.members.length})
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {selected && (
            <p className="text-xs text-ov-muted flex items-center gap-1.5">
              {selected.kind === "space" ? (
                <>
                  <Users className="w-3.5 h-3.5" />
                  Envoi à tous les appareils des membres de cet espace
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  Envoi chiffré à cet appareil uniquement
                </>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "text" ? "default" : "outline"}
            onClick={() => setMode("text")}
          >
            <Type className="w-4 h-4 mr-2" /> Texte
          </Button>
          <Button
            type="button"
            variant={mode === "file" ? "default" : "outline"}
            onClick={() => setMode("file")}
          >
            <FileUp className="w-4 h-4 mr-2" /> Fichier
          </Button>
        </div>

        {mode === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Collez ou tapez votre texte chiffré…"
            rows={8}
            className="w-full rounded-xl border border-ov-border bg-ov-bg p-3 text-sm text-ov-text focus:outline-none focus:ring-2 focus:ring-ov-primary"
          />
        ) : (
          <Card
            className={cn(
              "p-6 border-2 border-dashed border-ov-border space-y-3 text-center transition-colors",
              isDragging && "border-ov-primary bg-ov-primary/5"
            )}
          >
            <UploadCloud className="w-10 h-10 text-ov-primary mx-auto" />
            <div className="space-y-1">
              <Label htmlFor="send-file" className="cursor-pointer font-medium text-ov-text">
                Glissez-déposez ou cliquez pour sélectionner
              </Label>
              <p className="text-xs text-ov-muted">
                Taille maximale : {MAX_FILE_SIZE_MB} Mo
              </p>
            </div>
            <Input
              id="send-file"
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFile(e.target.files?.[0] ?? null)
              }
              className="hidden"
            />
            {file && (
              <div className="p-2 bg-ov-bg rounded-lg text-xs font-mono text-ov-accent">
                {file.name} — {(file.size / 1024).toFixed(1)} Ko
              </div>
            )}
          </Card>
        )}

        <Button
          type="submit"
          disabled={busy || !selected}
          className={cn("w-full bg-ov-primary hover:bg-ov-primaryHover")}
        >
          <Send className="w-4 h-4 mr-2" />
          {busy
            ? "Envoi…"
            : !navigator.onLine
            ? "Mettre en file d'attente hors-ligne"
            : "Envoyer chiffré"}
        </Button>
      </form>
    </div>
  );
}
