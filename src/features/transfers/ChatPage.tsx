import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Users,
  Smartphone,
  X,
  Phone,
  Video,
  MoreVertical,
  Smile,
} from "lucide-react";
import { useCall } from "@/features/calls/CallContext";
import { AudioRecorder } from "./AudioRecorder";
import { MessageMedia } from "./MessageMedia";
import { MediaViewer, type MediaItem } from "./MediaViewer";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { getMediaKind } from "@/lib/mediaType";
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

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Viewer média
  const [viewerItems, setViewerItems] = useState<MediaItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const sendLock = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const me = getStoredIdentity();

  const currentChatKey = kind && id ? `${kind}:${id}` : null;
  useTransferAlerts({ currentChat: currentChatKey });

  const scopeKind = scope?.kind;
  const scopeId = scope?.id;
  const call = useCall();

  const placeCall = (type: "audio" | "video") => {
    if (!scopeId) return;
    if (scopeKind === "space") {
      toast.info(
        "Les appels de groupe ne sont pas encore disponibles ici. Ouvre une conversation avec un appareil."
      );
      return;
    }
    void call.startCall(scopeId, type, title);
  };

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

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [input]);

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
        /* silencieux */
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
      if (m.to_device_id === me.deviceId) {
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

  const openViewer = (currentId: string) => {
    const items: MediaItem[] = [];
    let idx = 0;
    messages.forEach((m) => {
      const d = decrypted[m.id];
      if (!d?.url || !d.name) return;
      const kind = getMediaKind(m.mime_type, m.file_name);
      if (kind === "audio" || kind === "other") return;
      if (m.id === currentId) idx = items.length;
      items.push({
        id: m.id,
        url: d.url,
        name: d.name,
        mimeType: m.mime_type,
        sizeBytes: m.file_size,
      });
    });
    if (items.length === 0) return;
    setViewerItems(items);
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const send = async () => {
    if (sendLock.current) return;
    if (!user || !me || !scope) return;
    if (!input.trim() && !file) return;

    if (file && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return toast.error(
        `Fichier trop volumineux. Taille maximale : ${MAX_FILE_SIZE_MB} Mo.`
      );
    }

    sendLock.current = true;
    setSending(true);

    const textToSend = input;
    const fileToSend = file;

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
      if (!fileToSend) setInput(textToSend);
      else setFile(fileToSend);
      toast.error(friendlyError(e));
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const grouped: { day: string; items: ConversationMessage[] }[] = [];
  messages.forEach((m) => {
    const day = dayLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (!last || last.day !== day) grouped.push({ day, items: [m] });
    else last.items.push(m);
  });

  return (
    <div className="h-screen flex flex-col bg-[#0a0e1a]">
      {/* ============ HEADER ============ */}
      <header className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-ov-surface/95 backdrop-blur-md border-b border-ov-border sticky top-0 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/messages", { replace: true });
          }}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              kind === "space"
                ? "bg-gradient-to-br from-ov-primary to-ov-primaryHover text-white"
                : "bg-gradient-to-br from-ov-accent to-ov-primary text-white"
            )}
          >
            {kind === "space" ? (
              <Users className="w-5 h-5" />
            ) : (
              <Smartphone className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate text-[15px]">{title}</p>
            <p className="text-[11px] text-ov-muted truncate">
              {kind === "space"
                ? "Espace partagé · chiffré E2E"
                : "Appareil lié · chiffré E2E"}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => placeCall("audio")}
            title="Appel audio chiffré"
          >
            <Phone className="w-5 h-5 text-ov-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => placeCall("video")}
            title="Appel vidéo chiffré"
          >
            <Video className="w-5 h-5 text-ov-primary" />
          </Button>
        </div>

        <div className="sm:hidden relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-40 bg-ov-surface border border-ov-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                <button
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-ov-bg"
                  onClick={() => {
                    setMenuOpen(false);
                    placeCall("audio");
                  }}
                >
                  <Phone className="w-4 h-4 text-ov-primary" /> Appel audio
                </button>
                <button
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 hover:bg-ov-bg border-t border-ov-border"
                  onClick={() => {
                    setMenuOpen(false);
                    placeCall("video");
                  }}
                >
                  <Video className="w-4 h-4 text-ov-primary" /> Appel vidéo
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ============ MESSAGES ============ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1 scroll-smooth"
      >
        {loading ? (
          <p className="text-sm text-ov-muted text-center py-8">Chargement…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-ov-primary/10 flex items-center justify-center mx-auto">
              <Smile className="w-8 h-8 text-ov-primary" />
            </div>
            <p className="text-sm text-ov-muted">
              Aucun message. Commencez la conversation.
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-1">
              <div className="flex justify-center my-4">
                <span className="bg-ov-surface border border-ov-border text-ov-muted text-[11px] px-3 py-1 rounded-full">
                  {group.day}
                </span>
              </div>

              {group.items.map((m) => {
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
                      "flex flex-col max-w-[85%] sm:max-w-[65%]",
                      mine ? "self-end items-end ml-auto" : "items-start"
                    )}
                  >
                    {!mine && kind === "space" && (
                      <p className="text-[10px] text-ov-accent font-medium mb-1 px-2">
                        {m.sender_name}
                      </p>
                    )}

                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm break-words shadow-sm relative",
                        mine
                          ? "bg-gradient-to-br from-ov-primary to-ov-primaryHover text-white rounded-br-sm"
                          : "bg-ov-surface border border-ov-border text-ov-text rounded-bl-sm"
                      )}
                    >
                      {isFile ? (
                        <MessageMedia
                          name={m.file_name ?? "fichier"}
                          mimeType={m.mime_type}
                          sizeBytes={m.file_size}
                          url={d?.url ?? null}
                          mine={mine}
                          busy={busyId === m.id}
                          onOpen={() => {
                            if (d?.url) openViewer(m.id);
                            else open(m);
                          }}
                          onDownload={() => download(m)}
                        />
                      ) : displayText ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {displayText}
                        </p>
                      ) : mine ? (
                        <p className="text-xs italic opacity-70">
                          Message envoyé
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

                      <div
                        className={cn(
                          "flex items-center gap-1 justify-end mt-1",
                          mine ? "text-white/70" : "text-ov-muted"
                        )}
                      >
                        <span className="text-[10px]">
                          {timeOf(m.created_at)}
                        </span>
                        {mine && (
                          <>
                            {m.opened_at || m.read_at ? (
                              <CheckCheck className="w-3.5 h-3.5 text-ov-accent" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* ============ BARRE D'ENVOI ============ */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-ov-surface/95 backdrop-blur-md border-t border-ov-border sticky bottom-0 z-10">
        {file && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-ov-bg rounded-xl border border-ov-border">
            <Paperclip className="w-4 h-4 text-ov-primary" />
            <span className="text-xs truncate flex-1">{file.name}</span>
            <button
              aria-label="Retirer"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-ov-muted hover:text-ov-danger"
            >
              <X className="w-4 h-4" />
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
            className="shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <AudioRecorder
            disabled={sending || sendLock.current}
            onRecorded={async (vocalFile) => {
              if (!user || !me || !scope) return;
              try {
                if (scope.kind === "space") {
                  await sendFileToSpace(user.id, me, scope.id, vocalFile);
                } else {
                  const { data } = await supabase
                    .from("ovbridge_devices")
                    .select("id, name, public_key")
                    .eq("id", scope.id)
                    .maybeSingle();
                  if (!data) throw new Error("Destinataire introuvable");
                  await sendFile(user.id, me, data, vocalFile);
                }
                await refresh();
                toast.success("Message vocal envoyé ✅");
              } catch (e: any) {
                toast.error(friendlyError(e));
              }
            }}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sendLock.current && !sending) send();
              }
            }}
            rows={1}
            placeholder="Message…"
            className="flex-1 resize-none rounded-2xl border border-ov-border bg-ov-bg px-4 py-2.5 text-sm text-ov-text focus:outline-none focus:ring-2 focus:ring-ov-primary max-h-32 min-h-[44px]"
          />

          <Button
            size="icon"
            aria-label="Envoyer"
            onClick={send}
            disabled={sending || sendLock.current || (!input.trim() && !file)}
            className="bg-ov-primary hover:bg-ov-primaryHover shrink-0 w-11 h-11 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ============ VIEWER MÉDIA ============ */}
      {viewerOpen && viewerItems.length > 0 && (
        <MediaViewer
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}