import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flag, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import { fetchModerationReports, updateReportStatus } from "@/lib/admin";
import type { ModerationReport, AdminRole } from "@/types/admin";
import { friendlyError } from "@/lib/errors";

export default function SAdminSection({ myRole }: { myRole: AdminRole }) {
  const { user } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      const data = await fetchModerationReports();
      setReports(data);
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdate = async (
    rId: string,
    status: ModerationReport["status"],
    notes?: string
  ) => {
    if (!user) return;
    setBusyId(rId);
    try {
      await updateReportStatus(user.id, myRole, rId, status, notes);
      toast.success("Statut du signalement mis à jour");
      await loadReports();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Modération des Contenus (40/100)</h2>
          <p className="text-xs text-ov-muted">
            Inspectez et traitez les contenus ou espaces signalés.
          </p>
        </div>
        <Badge className="bg-ov-accent/20 text-ov-accent border-0">
          {reports.filter((r) => r.status === "pending").length} en attente
        </Badge>
      </div>

      {loading ? (
        <p className="text-sm text-ov-muted text-center py-6">Chargement des signalements…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-ov-muted text-center py-6">Aucun signalement en attente.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 border-ov-border bg-ov-surface space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-ov-accent" />
                  <span className="font-semibold text-sm capitalize">
                    {r.target_type} ({r.target_id.slice(0, 8)})
                  </span>
                </div>
                <Badge
                  variant={r.status === "pending" ? "destructive" : "default"}
                >
                  {r.status}
                </Badge>
              </div>

              <p className="text-xs text-ov-text bg-ov-bg p-2 rounded-lg border border-ov-border">
                <strong>Motif :</strong> {r.reason}
              </p>

              <div className="flex items-center justify-between text-xs text-ov-muted">
                <span>Signalé le {new Date(r.created_at).toLocaleString()}</span>
                {r.notes && <span className="italic">Note: {r.notes}</span>}
              </div>

              {r.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="bg-ov-success hover:bg-ov-success/80 text-white text-xs flex-1"
                    disabled={busyId === r.id}
                    onClick={() => handleUpdate(r.id, "action_taken", "Mesure prise par le modérateur")}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Sanctionner / Supprimer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-1"
                    disabled={busyId === r.id}
                    onClick={() => handleUpdate(r.id, "dismissed", "Classé sans suite")}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Classer sans suite
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
