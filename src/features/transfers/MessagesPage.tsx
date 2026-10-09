import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Smartphone,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth";
import {
  getConversationSummaries,
  type ConversationSummary,
} from "@/lib/transfers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTransferAlerts } from "./useTransferAlerts";
import { cn } from "@/lib/utils";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "à l'instant";
  if (d < 60) return `${d} min`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useTransferAlerts({ currentChat: null });

  useEffect(() => {
    if (!user) return;
    const me = getStoredIdentity();
    if (!me) return;

    const load = async () => {
      try {
        const list = await getConversationSummaries({
          myDeviceId: me.deviceId,
        });
        setConvs(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [user]);

  const filtered = query.trim()
    ? convs.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase().trim())
      )
    : convs;

  const totalUnread = convs.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-ov-bg relative">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-ov-bg/80 backdrop-blur-md border-b border-ov-border">
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/devices")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Messages</h1>
              {totalUnread > 0 && (
                <Badge className="bg-ov-primary text-white border-0 text-[10px] px-2 py-0">
                  {totalUnread} non-lu{totalUnread > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-ov-muted">
              Conversations chiffrées de bout en bout
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ov-muted pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une conversation…"
              className="pl-9 h-9 text-sm bg-ov-surface border-ov-border"
            />
          </div>
        </div>
      </header>

      {/* Liste */}
      <div className="p-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="p-4 border-ov-border animate-pulse h-[76px]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 border-ov-border text-center space-y-3 mt-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-ov-primary/10 flex items-center justify-center">
              {query ? (
                <Search className="w-8 h-8 text-ov-muted" />
              ) : (
                <MessageSquare className="w-8 h-8 text-ov-primary" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {query ? "Aucun résultat" : "Aucune conversation"}
              </p>
              <p className="text-xs text-ov-muted">
                {query
                  ? `Aucune conversation ne contient « ${query} »`
                  : "Démarrez une conversation avec un appareil ou un espace"}
              </p>
            </div>
            {!query && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/send")}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle conversation
              </Button>
            )}
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li key={`${c.kind}-${c.id}`}>
                <Card
                  className={cn(
                    "p-4 border-ov-border transition-all cursor-pointer",
                    "hover:border-ov-primary/50 hover:bg-ov-surface/50",
                    "active:scale-[0.98]",
                    c.unreadCount > 0 && "border-ov-primary/30 bg-ov-primary/[0.03]"
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(
                      c.kind === "space"
                        ? `/messages/space/${c.id}`
                        : `/messages/device/${c.id}`
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(
                        c.kind === "space"
                          ? `/messages/space/${c.id}`
                          : `/messages/device/${c.id}`
                      );
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar avec point unread */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          c.kind === "space"
                            ? "bg-gradient-to-br from-ov-primary/20 to-ov-primary/5 text-ov-primary"
                            : "bg-gradient-to-br from-ov-accent/20 to-ov-accent/5 text-ov-accent"
                        )}
                      >
                        {c.kind === "space" ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          <Smartphone className="w-5 h-5" />
                        )}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-ov-primary text-white text-[10px] font-semibold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 border-2 border-ov-bg">
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p
                          className={cn(
                            "truncate",
                            c.unreadCount > 0
                              ? "font-semibold text-ov-text"
                              : "font-medium text-ov-text/90"
                          )}
                        >
                          {c.name}
                        </p>
                        <span className="text-[10px] text-ov-muted shrink-0">
                          {timeAgo(c.lastMessageAt)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs truncate",
                          c.unreadCount > 0
                            ? "text-ov-text/80"
                            : "text-ov-muted"
                        )}
                      >
                        {c.lastMessagePreview ?? (
                          <span className="italic opacity-60">
                            Aucun message
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/send")}
        aria-label="Nouvelle conversation"
        className={cn(
          "fixed bottom-6 right-6 z-30",
          "w-14 h-14 rounded-2xl",
          "bg-gradient-to-br from-ov-primary to-ov-primaryHover",
          "text-white shadow-lg shadow-ov-primary/40",
          "flex items-center justify-center",
          "transition-all hover:scale-105 active:scale-95",
          "hover:shadow-xl hover:shadow-ov-primary/50"
        )}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Hint discret si aucune conversation */}
      {!loading && convs.length === 0 && (
        <div className="fixed bottom-24 right-6 z-10 pointer-events-none">
          <div className="bg-ov-surface border border-ov-border rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 animate-pulse">
            <Sparkles className="w-3 h-3 text-ov-accent" />
            <span className="text-[10px] text-ov-muted whitespace-nowrap">
              Commencez ici
            </span>
          </div>
        </div>
      )}
    </div>
  );
}