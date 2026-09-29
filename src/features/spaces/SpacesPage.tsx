import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Shield, ChevronRight } from "lucide-react";
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
          <h2 className="text-lg font-semibold">Mes collaborateurs</h2>
          <p className="text-sm text-ov-muted">
            Espaces partagés avec d'autres utilisateurs
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          className="bg-ov-primary hover:bg-ov-primaryHover"
        >
          <Plus className="w-4 h-4 mr-1" /> Nouvel espace
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-ov-muted">Chargement…</p>
      ) : spaces.length === 0 ? (
        <Card className="p-8 border-ov-border text-center space-y-3">
          <Users className="w-8 h-8 mx-auto text-ov-muted" />
          <p className="text-sm text-ov-muted">
            Aucun espace pour l'instant. Créez-en un ou rejoignez-en un avec un
            code.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/join-space")}
          >
            J'ai un code d'invitation
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {spaces.map((s) => (
            <li key={s.id}>
              <Card
                className="p-4 border-ov-border hover:border-ov-primary/50 transition-colors cursor-pointer"
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