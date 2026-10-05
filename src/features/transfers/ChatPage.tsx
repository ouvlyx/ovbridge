import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Download,
  Users,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import { getStoredIdentity } from "@/lib/device";
import {
  decryptTransfer,
  markAsRead,
  sendText,
  sendFile,
  sendTextToSpace,
  sendFileToSpace,
  getSentPlaintext,
  type ConversationMessage,
} from "@/lib/transfers";
import { useConversation } from "./useConversation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTransferAlerts } from "./useTransferAlerts";

type Kind = "space" | "device";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const { kind, id } = useParams<{ kind: Kind; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const scope = kind && id ? { kind, id } : undefined;
  const { messages, loading, refresh } = useConversation(scope);

  const [title, setTitle] = useState("Conversation");
  const [decrypted, setDecrypted] = useState<
    Record<string, { text?: string; url?: string; name?: string }>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  // Verrou SYNCHRONE anti-double-envoi
  const sendLock = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const me = getStoredIdentity();

  const currentChatKey = kind && id ? `${kind}:${id}` : null;
  useTransferAlerts({ currentChat: currentChatKey });

  const scopeKind = scope?.kind;
  const scopeId = scope?.id;

  useEffect(() => {
    if (!scopeKind || !scopeId) return;
    let active = true;

    (async () => {
      if (scopeKind === "space") {
        const { data } = await supabase
          .from("ovbridge_spaces")
          .select("name")
          .eq("id", scopeId)
          .maybeSingle();
        if (data && active) setTitle(data.name);
      } else {
        const { data } = await supabase
          .from("ovbridge_devices")
          .select("name")
          .eq("id", scopeId)
          .maybeSingle();
        if (data && active) setTitle(data.name);
      }
    })();

    return () => {
      active = false;
    };
  }, [scopeKind, scopeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Marque comme lu + déchiffre automatiquement les derniers messages reçus
  useEffect(() => {
    if (!me) return;

    messages
      .filter((m) => m.to_device_id === me.deviceId && !m.read_at)
      .forEach((m) => markAsRead(m.id));

    messages.slice(-20).forEach(async (m) => {
      if (decrypted[m.id]) return;
      if (m.kind === "file") return;
      if (m.is_mine) return;

      const { data } = await supabase
        .from("ovbridge_devices")
        .select("public_key")
        .eq("id", m.from_device_id)
        .maybeSingle();
      if (!data) return;

      try {
        const res = await decryptTransfer(m, me, data.public_key);
        if (res.text !== undefined) {
          setDecrypted((prev) => ({ ...prev, [m.id]: { text: res.text } }));
        }
      } catch {
        // silencieux
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, me?.deviceId]);

  const open = async (m: ConversationMessage) => {
    if (decrypted[m.id] || !me) return;
    const { data } = await supabase
      .from("ovbridge_devices")
      .select("public_key")
      .eq("id", m.from_device_id)
      .maybeSingle();
    if (!data) return toast.error("Clé indisponible");

    setBusyId(m.id);
    try {
      const res = await decryptTransfer(m, me, data.public_key);
      if (res.text !== undefined) {
        setDecrypted((d) => ({ ...d, [m.id]: { text: res.text } }));
      } else if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        setDecrypted((d) => ({
          ...d,
          [m.id]: { url, name: m.file_name ?? "fichier" },
        }));
      }
      if (m.to_device_id === me.deviceId && !m.read_at) {
        await markAsRead(m.id);
      }
    } catch (e: any) {
      toast.error(friendlyError(e) || "Déchiffrement impossible");
    } finally {
      setBusyId(null);
    }
  };

  const download = (m: ConversationMessage) => {
    const d = decrypted[m.id];
    if (!d?.url) return;
    const a = document.createElement("a");
    a.href = d.url;
    a.download = d.name ?? "fichier";
    a.click();
  };

  const send = async () => {
    // 1. Verrou synchrone : bloque tout 2ᵉ appel immédiat
    if (sendLock.current) return;
    if (!user || !me || !scope) return;
    if (!input.trim() && !file) return;

    if (file && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return toast.error(
        `Fichier trop volumineux. Taille maximale : ${MAX_FILE_SIZE_MB} Mo.`
      );
    }

    // 2. On verrouille TOUT DE SUITE
    sendLock.current = true;
    setSending(true);

    // 3. On capture les valeurs AVANT les await
    const textToSend = input;
    const fileToSend = file;

    // 4. On vide les champs immédiatement (empêche un 2ᵉ envoi visuel)
    if (!fileToSend) setInput("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      if (fileToSend) {
        if (scope.kind === "space") {
          await sendFileToSpace(user.id, me, scope.id, fileToSend);
        } else {
          const { data } = await supabase
            .from("ovbridge_devices")
            .select("id, name, public_key")
            .eq("id", scope.id)
            .maybeSingle();
          if (!data) throw new Error("Destinataire introuvable");
          await sendFile(user.id, me, data, fileToSend);
        }
      } else {
        if (scope.kind === "space") {
          await sendTextToSpace(user.id, me, scope.id, textToSend);
        } else {
          const { data } = await supabase
            .from("ovbridge_devices")
            .select("id, name, public_key")
            .eq("id", scope.id)
            .maybeSingle();
          if (!data) throw new Error("Destinataire introuvable");
          await sendText(user.id, me, data, textToSend);
        }
      }
      await refresh();
    } catch (e: any) {
      // En cas d'erreur, on restaure le contenu perdu
      if (!fileToSend) setInput(textToSend);
      else setFile(fileToSend);
      toast.error(friendlyError(e));
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-ov-bg">
      <header className="flex items-center gap-3 p-4 border-b border-ov-border bg-ov-surface sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/messages", { replace: true });
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {kind === "space" ? (
            <Users className="w-5 h-5 text-ov-primary shrink-0" />
          ) : (
            <Smartphone className="w-5 h-5 text-ov-accent shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{title}</p>
            <p className="text-[10px] text-ov-muted">
              {kind === "space" ? "Espace partagé" : "Conversation directe"}
            </p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-ov-muted text-center">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-ov-muted text-center py-8">
            Aucun message. Commencez la conversation.
          </p>
        ) : (
          messages.map((m) => {
            const d = decrypted[m.id];
            const isFile = m.kind === "file";
            const mine = m.is_mine;

            const myOwnText =
              mine && m.kind === "text" ? getSentPlaintext(m.id) : null;
            const displayText = d?.text ?? myOwnText;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  mine ? "self-end items-end ml-auto" : "items-start"
                )}
              >
                {!mine && (
                  <p className="text-[10px] text-ov-muted mb-0.5 px-2">
                    {m.sender_name}
                  </p>
                )}

                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm break-words",
                    mine
                      ? "bg-ov-primary text-white rounded-br-md"
                      : "bg-ov-surface border border-ov-border text-ov-text rounded-bl-md"
                  )}
                >
                  {isFile ? (
                    <div className="space-y-2 min-w-[180px]">
                      <p className="text-xs opacity-80">📄 {m.file_name}</p>
                      {!d ? (
                        <button
                          onClick={() => open(m)}
                          disabled={busyId === m.id}
                          className={cn(
                            "text-xs px-2 py-1 rounded-lg w-full",
                            mine
                              ? "bg-white/20 hover:bg-white/30"
                              : "bg-ov-bg hover:bg-ov-primary/10"
                          )}
                        >
                          {busyId === m.id ? "…" : "Ouvrir"}
                        </button>
                      ) : (
                        <button
                          onClick={() => download(m)}
                          className={cn(
                            "text-xs px-2 py-1 rounded-lg w-full flex items-center justify-center gap-1",
                            mine
                              ? "bg-white/20 hover:bg-white/30"
                              : "bg-ov-bg hover:bg-ov-primary/10"
                          )}
                        >
                          <Download className="w-3 h-3" /> Télécharger
                        </button>
                      )}
                    </div>
                  ) : displayText ? (
                    <p className="whitespace-pre-wrap">{displayText}</p>
                  ) : mine ? (
                    <p className="text-xs italic text-white/80">
                      Message envoyé (contenu local indisponible)
                    </p>
                  ) : (
                    <button
                      onClick={() => open(m)}
                      disabled={busyId === m.id}
                      className={cn(
                        "text-xs italic px-1",
                        mine ? "text-white/80" : "text-ov-muted"
                      )}
                    >
                      {busyId === m.id
                        ? "Déchiffrement…"
                        : "🔒 Ouvrir le message"}
                    </button>
                  )}
                </div>

                <div
                  className={cn(
                    "flex items-center gap-1 mt-0.5 px-2",
                    mine ? "flex-row-reverse" : ""
                  )}
                >
                  <span className="text-[10px] text-ov-muted">
                    {timeOf(m.created_at)}
                  </span>
                  {mine && (
                    <span className="text-[10px] text-ov-muted">
                      {m.read_at ? (
                        <CheckCheck className="w-3 h-3 text-ov-accent" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-ov-border bg-ov-surface sticky bottom-0">
        <p className="text-[10px] text-ov-muted mb-2">
          Fichier : {MAX_FILE_SIZE_MB} Mo maximum
        </p>
        {file && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-ov-bg rounded-lg">
            <Paperclip className="w-3 h-3 text-ov-muted" />
            <span className="text-xs truncate flex-1">{file.name}</span>
            <button
              aria-label="Retirer le fichier sélectionné"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="w-3 h-3 text-ov-muted" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Joindre un fichier"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (!sendLock.current && !sending) send();
              }
            }}
            rows={1}
            placeholder="Message…"
            className="flex-1 resize-none rounded-xl border border-ov-border bg-ov-bg px-3 py-2 text-sm text-ov-text focus:outline-none focus:ring-2 focus:ring-ov-primary max-h-32"
          />

          <Button
            size="icon"
            aria-label="Envoyer le message"
            onClick={send}
            disabled={sending || sendLock.current || (!input.trim() && !file)}
            className="bg-ov-primary hover:bg-ov-primaryHover shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
