import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { ArrowLeft, Send, FileUp, Type, Users, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
import { getStoredIdentity } from "@/lib/device";
import {
  sendText,
  sendFile,
  sendTextToSpace,
  sendFileToSpace,
} from "@/lib/transfers";
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
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

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
          <Card className="p-4 border-ov-border space-y-2">
            <Label htmlFor="send-file">
              Fichier ({MAX_FILE_SIZE_MB} Mo maximum)
            </Label>
            <Input
              id="send-file"
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFile(e.target.files?.[0] ?? null)
              }
              className="bg-ov-bg"
            />
            {file && (
              <p className="text-xs text-ov-muted">
                {file.name} — {(file.size / 1024).toFixed(1)} Ko
              </p>
            )}
          </Card>
        )}

        <Button
          type="submit"
          disabled={busy || !selected}
          className={cn("w-full bg-ov-primary hover:bg-ov-primaryHover")}
        >
          <Send className="w-4 h-4 mr-2" />
          {busy ? "Envoi…" : "Envoyer chiffré"}
        </Button>
      </form>
    </div>
  );
}