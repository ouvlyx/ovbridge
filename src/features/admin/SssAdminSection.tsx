import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchAdminLogs } from "@/lib/admin";
import type { AdminLog } from "@/types/admin";
import { friendlyError } from "@/lib/errors";

export default function SssAdminSection() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminLogs()
      .then((data) => setLogs(data))
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4 border-ov-primary/30 bg-gradient-to-r from-ov-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-ov-primary shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-ov-text">Contrôle Absolu SSS Admin (100/100)</h2>
            <p className="text-xs text-ov-muted">
              Vous disposez des privilèges complets d'administration, de gouvernance globale et d'audit du système.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border-ov-border bg-ov-surface text-center">
          <p className="text-2xl font-bold text-ov-primary">100%</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wider">Accès Système</p>
        </Card>
        <Card className="p-3 border-ov-border bg-ov-surface text-center">
          <p className="text-2xl font-bold text-ov-success">Actif</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wider">Statut Nœud</p>
        </Card>
        <Card className="p-3 border-ov-border bg-ov-surface text-center">
          <p className="text-2xl font-bold text-ov-accent">{logs.length}</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wider">Actions Audité</p>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-ov-accent" /> Journal d'Audit Administrateurs
        </h3>

        {loading ? (
          <p className="text-sm text-ov-muted text-center py-6">Chargement des logs d'audit…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-ov-muted text-center py-6">Aucune action administrateur récente.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <Card key={l.id} className="p-3 border-ov-border bg-ov-surface text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-ov-primary">{l.action}</span>
                  <Badge className="bg-ov-primary/20 text-ov-primary border-0 text-[10px]">
                    {l.admin_role.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-ov-muted truncate">
                  Admin ID: {l.admin_id.slice(0, 8)} · Cible : {l.target_id ?? "N/A"}
                </p>
                <p className="text-[10px] text-ov-muted text-right">
                  {new Date(l.created_at).toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
