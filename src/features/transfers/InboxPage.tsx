import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Inbox,
  Copy,
  Check,
  Users,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { getStoredIdentity } from "@/lib/device";
import { decryptTransfer, markAsRead, type Transfer } from "@/lib/transfers";
import { useTransfers } from "./useTransfers";
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

type SenderInfo = { name: string; platform: string | null };

export default function InboxPage() {
  const navigate = useNavigate();
  const { inbox, loading } = useTransfers();
  const [decrypted, setDecrypted] = useState<
    Record<string, { text?: string; url?: string; blob?: Blob; name?: string }>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [spaceNames, setSpaceNames] = useState<Record<string, string>>({});
  const [senders, setSenders] = useState<Record<string, SenderInfo>>({});
  const [senderKeys, setSenderKeys] = useState<Record<string, string>>({});

  // Récupère noms d'espaces
  useEffect(() => {
    const ids = Array.from(
      new Set(inbox.map((t) => t.to_space_id).filter(Boolean))
    ) as string[];
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("ovbridge_spaces")
        .select("id, name")
        .in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => (map[s.id] = s.name));
      setSpaceNames(map);
    })();
  }, [inbox]);

  // Récupère infos expéditeurs (nom + clé publique)
  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(inbox.map((t) => t.from_device_id)));
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("ovbridge_devices")
        .select("id, name, platform, public_key")
        .in("id", ids);

      const keyMap: Record<string, string> = {};
      const senderMap: Record<string, SenderInfo> = {};
      data?.forEach((d: any) => {
        keyMap[d.id] = d.public_key;
        senderMap[d.id] = { name: d.name, platform: d.platform };
      });
      setSenderKeys(keyMap);
      setSenders(senderMap);
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
        setDecrypted((d) => ({
          ...d,
          [tr.id]: { url, blob: res.blob, name: tr.file_name ?? "fichier" },
        }));
      }
      await markAsRead(tr.id);
    } catch (e: any) {
      toast.error(friendlyError(e));
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
            const sender = senders[tr.from_device_id];
            const viaSpace = tr.to_space_id ? spaceNames[tr.to_space_id] : null;

            return (
              <li key={tr.id}>
                <Card className="p-4 border-ov-border space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isFile ? (
                        <FileText className="w-4 h-4 text-ov-accent shrink-0" />
                      ) : (
                        <Inbox className="w-4 h-4 text-ov-accent shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {isFile ? tr.file_name ?? "fichier" : "Message"}
                      </span>
                    </div>
                    <span className="text-xs text-ov-muted shrink-0">
                      {timeAgo(tr.created_at)}
                    </span>
                  </div>

                  {/* Source : appareil ou espace */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {viaSpace ? (
                      <Badge className="bg-ov-accent/15 text-ov-accent border-0 text-[10px] px-2 py-0.5">
                        <Users className="w-3 h-3 mr-1" />
                        Via {viaSpace}
                      </Badge>
                    ) : (
                      <Badge className="bg-ov-primary/15 text-ov-primary border-0 text-[10px] px-2 py-0.5">
                        <Smartphone className="w-3 h-3 mr-1" />
                        Direct
                      </Badge>
                    )}

                    {sender && (
                      <span className="text-[11px] text-ov-muted truncate">
                        de <span className="text-ov-text">{sender.name}</span>
                      </span>
                    )}
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
                    <Button
                      size="sm"
                      onClick={() => download(tr)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger{" "}
                      {tr.file_size
                        ? `(${(tr.file_size / 1024).toFixed(1)} Ko)`
                        : ""}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <pre className="text-xs bg-ov-bg rounded-lg p-3 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                        {d.text}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyText(tr)}
                        className="w-full"
                      >
                        {copiedId === tr.id ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
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