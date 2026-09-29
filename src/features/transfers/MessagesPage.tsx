import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Smartphone,
  Plus,
} from "lucide-react";
import { getStoredIdentity } from "@/lib/device";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getConversationSummaries,
  type ConversationSummary,
} from "@/lib/transfers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/devices")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/send")}
          title="Nouveau message"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-ov-muted">Chargement…</p>
      ) : convs.length === 0 ? (
        <Card className="p-8 border-ov-border text-center space-y-3">
          <MessageSquare className="w-8 h-8 mx-auto text-ov-muted" />
          <p className="text-sm text-ov-muted">
            Aucune conversation pour l'instant.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/send")}>
            Démarrer une conversation
          </Button>
        </Card>
      ) : (
        <ul className="space-y-2">
          {convs.map((c) => (
            <li key={`${c.kind}-${c.id}`}>
              <Card
                className="p-4 border-ov-border hover:border-ov-primary/50 transition-colors cursor-pointer"
                onClick={() =>
                  navigate(
                    c.kind === "space"
                      ? `/messages/space/${c.id}`
                      : `/messages/device/${c.id}`
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      c.kind === "space"
                        ? "bg-ov-primary/15 text-ov-primary"
                        : "bg-ov-accent/15 text-ov-accent"
                    }`}
                  >
                    {c.kind === "space" ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.name}</p>
                      {c.unreadCount > 0 && (
                        <Badge className="bg-ov-primary text-white border-0 text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                          {c.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ov-muted truncate">
                      {c.lastMessagePreview ?? "Aucun message"}
                    </p>
                  </div>

                  <span className="text-[10px] text-ov-muted shrink-0">
                    {timeAgo(c.lastMessageAt)}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}