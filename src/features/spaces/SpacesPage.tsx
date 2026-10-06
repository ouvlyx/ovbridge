import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Shield, ChevronRight, Globe, Clipboard, MessageSquare } from "lucide-react";
import { useSpaces } from "./useSpaces";
import CreateSpaceDialog from "./CreateSpaceDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SpacesPage() {
  const navigate = useNavigate();
  const { spaces, loading, refresh } = useSpaces();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Espaces Collaboratifs</h2>
          <p className="text-xs text-ov-muted">
            Partagez fichiers, conversations et presse-papiers avec vos collaborateurs
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-ov-primary hover:bg-ov-primaryHover text-xs"
        >
          <Plus className="w-4 h-4 mr-1" /> Nouvel espace
        </Button>
      </div>

      {/* BANNIÈRE ESPACE COMMUN */}
      <Card className="p-4 border-ov-primary/40 bg-gradient-to-r from-ov-primary/15 via-ov-surface to-ov-surface space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ov-primary text-white flex items-center justify-center shrink-0 shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Espace Commun Hub</h3>
                <Badge className="bg-ov-primary/20 text-ov-primary border-0 text-[10px]">
                  Public / Global
                </Badge>
              </div>
              <p className="text-xs text-ov-muted">
                Dépôt rapide et presse-papiers partagé avec tous vos collaborateurs
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => navigate("/clipboard")}
            className="flex-1 text-xs bg-ov-bg hover:bg-ov-surface border border-ov-border text-ov-text"
          >
            <Clipboard className="w-3.5 h-3.5 mr-1.5 text-ov-accent" /> Presse-papiers Commun
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/send")}
            className="flex-1 text-xs bg-ov-primary hover:bg-ov-primaryHover"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Envoi Général
          </Button>
        </div>
      </Card>

      {/* LISTE DES ESPACES DE GROUPES */}
      {loading ? (
        <p className="text-sm text-ov-muted">Chargement de vos espaces…</p>
      ) : spaces.length === 0 ? (
        <Card className="p-8 border-ov-border text-center space-y-3 bg-ov-surface">
          <Users className="w-8 h-8 mx-auto text-ov-muted" />
          <p className="text-sm text-ov-muted">
            Aucun groupe collaboratif spécifique pour l'instant.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/join-space")}
            className="text-xs"
          >
            J'ai un code d'invitation
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {spaces.map((s) => (
            <li key={s.id}>
              <Card
                className="p-4 border-ov-border bg-ov-surface hover:border-ov-primary/50 transition-colors cursor-pointer"
                role="link"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigate(`/spaces/${s.id}`);
                }}
                onClick={() => navigate(`/spaces/${s.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ov-primary/15 text-ov-primary flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{s.name}</p>
                      {s.myRole === "admin" && (
                        <Badge className="bg-ov-primary/15 text-ov-primary border-0 text-[10px] px-1.5 py-0">
                          <Shield className="w-3 h-3 mr-0.5" /> admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ov-muted truncate">
                      {s.members.length} membre
                      {s.members.length > 1 ? "s" : ""}
                      {s.description ? ` · ${s.description}` : ""}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-ov-muted" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <CreateSpaceDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={refresh}
      />
    </div>
  );
}
