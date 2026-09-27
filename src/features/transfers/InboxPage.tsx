import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Inbox, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { decryptTransfer, markAsRead, type Transfer } from "@/lib/transfers";
import { useTransfers } from "./useTransfers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "à l'instant";
  if (d < 60) return `il y a ${d} min`;
  const h = Math.floor(d / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { inbox, loading } = useTransfers();
  const [decrypted, setDecrypted] = useState<Record<string, { text?: string; url?: string; blob?: Blob; name?: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Récupère les clés publiques des expéditeurs
  const [senderKeys, setSenderKeys] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(inbox.map((t) => t.from_device_id)));
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("ovbridge_devices")
        .select("id, public_key")
        .in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((d: any) => (map[d.id] = d.public_key));
      setSenderKeys(map);
    })();
  }, [inbox]);

  const open = async (tr: Transfer) => {
    const me = getStoredIdentity();
    const senderKey = senderKeys[tr.from_device_id];
    if (!me || !senderKey) return toast.error("Clés indisponibles");
    setBusyId(tr.id);
    try {
      const res = await decryptTransfer(tr, me, senderKey);
      if (res.text !== undefined) {
        setDecrypted((d) => ({ ...d, [tr.id]: { text: res.text } }));
      } else if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        setDecrypted((d) => ({ ...d, [tr.id]: { url, blob: res.blob, name: tr.file_name ?? "fichier" } }));
      }
      await markAsRead(tr.id);
    } catch (e: any) {
      toast.error("Déchiffrement impossible : " + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const download = (tr: Transfer) => {
    const d = decrypted[tr.id];
    if (!d?.url) return;
    const a = document.createElement("a");
    a.href = d.url;
    a.download = d.name ?? "fichier";
    a.click();
  };

  const copyText = async (tr: Transfer) => {
    const d = decrypted[tr.id];
    if (!d?.text) return;
    await navigator.clipboard.writeText(d.text);
    setCopiedId(tr.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Boîte de réception</h1>
      </header>

      {loading ? (
        <p className="text-sm text-ov-muted">Chargement…</p>
      ) : inbox.length === 0 ? (
        <Card className="p-8 border-ov-border text-center space-y-2">
          <Inbox className="w-8 h-8 mx-auto text-ov-muted" />
          <p className="text-sm text-ov-muted">Aucun transfert reçu</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {inbox.map((tr) => {
            const d = decrypted[tr.id];
            const isFile = tr.kind === "file";
            return (
              <li key={tr.id}>
                <Card className="p-4 border-ov-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isFile ? <FileText className="w-4 h-4 text-ov-accent" /> : <Inbox className="w-4 h-4 text-ov-accent" />}
                      <span className="text-sm font-medium">
                        {isFile ? tr.file_name ?? "fichier" : "Texte"}
                      </span>
                    </div>
                    <span className="text-xs text-ov-muted">{timeAgo(tr.created_at)}</span>
                  </div>

                  {!d ? (
                    <Button
                      size="sm"
                      disabled={busyId === tr.id}
                      onClick={() => open(tr)}
                      className="w-full"
                    >
                      {busyId === tr.id ? "Déchiffrement…" : "Ouvrir"}
                    </Button>
                  ) : isFile ? (
                    <Button size="sm" onClick={() => download(tr)} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger {tr.file_size ? `(${(tr.file_size / 1024).toFixed(1)} Ko)` : ""}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <pre className="text-xs bg-ov-bg rounded-lg p-3 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                        {d.text}
                      </pre>
                      <Button size="sm" variant="outline" onClick={() => copyText(tr)} className="w-full">
                        {copiedId === tr.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copiedId === tr.id ? "Copié" : "Copier"}
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}