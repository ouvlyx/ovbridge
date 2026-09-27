import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Send, FileUp, Type } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
import { getStoredIdentity } from "@/lib/device";
import { sendText, sendFile } from "@/lib/transfers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Target = { id: string; name: string; public_key: string };

export default function SendPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const me = getStoredIdentity();
      if (!me) return;
      const { data } = await supabase
        .from("ovbridge_devices")
        .select("id, name, public_key, revoked")
        .neq("id", me.deviceId)
        .eq("revoked", false);
      setTargets((data ?? []) as Target[]);
      if (data && data[0]) setTargetId(data[0].id);
    })();
  }, [user]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetId) return;
    const me = getStoredIdentity();
    if (!me) return;

    const recipient = targets.find((t) => t.id === targetId);
    if (!recipient) return;

    setBusy(true);
    try {
      if (mode === "text") {
        if (!text.trim()) throw new Error("Texte vide");
        await sendText(user.id, me, recipient, text);
        setText("");
      } else {
        if (!file) throw new Error("Aucun fichier");
        await sendFile(user.id, me, recipient, file);
        setFile(null);
      }
      toast.success("Envoyé ✅");
      navigate("/devices");
    } catch (err: any) {
      toast.error(err.message ?? "Erreur d'envoi");
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
        <h1 className="text-lg font-semibold">Nouvel envoi</h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>Destinataire</Label>
          <select
            value={targetId ?? ""}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full h-10 rounded-xl border border-ov-border bg-ov-bg px-3 text-sm text-ov-text"
          >
            {targets.length === 0 && <option value="">Aucun appareil</option>}
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
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
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
          disabled={busy || !targetId}
          className={cn("w-full bg-ov-primary hover:bg-ov-primaryHover")}
        >
          <Send className="w-4 h-4 mr-2" />
          {busy ? "Envoi…" : "Envoyer chiffré"}
        </Button>
      </form>
    </div>
  );
}