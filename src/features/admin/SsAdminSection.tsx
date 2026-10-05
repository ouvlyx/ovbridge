import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertOctagon, Check, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import {
  fetchErrorLogs,
  resolveErrorLog,
  fetchSystemRules,
  createOrUpdateSystemRule,
} from "@/lib/admin";
import type { ErrorLog, SystemRule, AdminRole } from "@/types/admin";
import { friendlyError } from "@/lib/errors";

export default function SsAdminSection({ myRole }: { myRole: AdminRole }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"errors" | "rules">("errors");

  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [rules, setRules] = useState<SystemRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire nouvelle règle
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleKey, setRuleKey] = useState("");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleCategory] = useState<SystemRule["category"]>("general");
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, rData] = await Promise.all([
        fetchErrorLogs(),
        fetchSystemRules(),
      ]);
      setErrors(eData);
      setRules(rData);
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (errId: string) => {
    if (!user) return;
    try {
      await resolveErrorLog(user.id, myRole, errId);
      toast.success("Erreur marquée comme résolue");
      await loadData();
    } catch (e: any) {
      toast.error(friendlyError(e));
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ruleTitle || !ruleKey || !ruleValue) return;
    setBusy(true);
    try {
      await createOrUpdateSystemRule(user.id, myRole, {
        title: ruleTitle,
        rule_key: ruleKey.trim().toLowerCase(),
        rule_value: ruleValue,
        category: ruleCategory,
        is_active: true,
      });
      toast.success(`Règle "${ruleTitle}" enregistrée avec succès`);
      setRuleTitle("");
      setRuleKey("");
      setRuleValue("");
      await loadData();
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Gestion des Erreurs & Règles Système (70/100)</h2>
          <p className="text-xs text-ov-muted">
            Monitorez les dysfonctionnements et ajustez les paramètres globaux.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-ov-surface border border-ov-border">
        <button
          onClick={() => setTab("errors")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            tab === "errors" ? "bg-ov-primary text-white" : "text-ov-muted"
          }`}
        >
          Journaux d'Erreurs ({errors.filter((e) => !e.resolved).length})
        </button>
        <button
          onClick={() => setTab("rules")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            tab === "rules" ? "bg-ov-primary text-white" : "text-ov-muted"
          }`}
        >
          Règles Système ({rules.length})
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ov-muted text-center py-6">Chargement…</p>
      ) : tab === "errors" ? (
        <div className="space-y-3">
          {errors.length === 0 ? (
            <p className="text-sm text-ov-muted text-center py-6">Aucune erreur signalée.</p>
          ) : (
            errors.map((e) => (
              <Card
                key={e.id}
                className="p-3 border-ov-border bg-ov-surface space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-ov-danger" />
                    <span className="font-mono font-bold">{e.error_code}</span>
                  </div>
                  <Badge variant={e.resolved ? "default" : "destructive"}>
                    {e.resolved ? "Résolu" : e.severity}
                  </Badge>
                </div>
                <p className="text-ov-text">{e.message}</p>
                {e.stack && (
                  <pre className="bg-ov-bg p-2 rounded text-[10px] text-ov-muted overflow-x-auto max-h-24">
                    {e.stack}
                  </pre>
                )}
                <div className="flex items-center justify-between text-[10px] text-ov-muted pt-1">
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                  {!e.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px]"
                      onClick={() => handleResolve(e.id)}
                    >
                      <Check className="w-3 h-3 mr-1" /> Marquer Résolu
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 border-ov-border bg-ov-surface space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-ov-primary" /> Créer / Modifier une Règle
            </h3>
            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <Label htmlFor="r-title">Titre de la règle</Label>
                <Input
                  id="r-title"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="Ex: Taille max upload fichier"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="r-key">Clé unique (rule_key)</Label>
                  <Input
                    id="r-key"
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                    placeholder="max_file_size_mb"
                  />
                </div>
                <div>
                  <Label htmlFor="r-val">Valeur (rule_value)</Label>
                  <Input
                    id="r-val"
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy} size="sm" className="w-full">
                Enregistrer la règle
              </Button>
            </form>
          </Card>

          <div className="space-y-2">
            {rules.map((r) => (
              <Card key={r.id} className="p-3 border-ov-border bg-ov-surface text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{r.title}</p>
                  <Badge className="bg-ov-primary/20 text-ov-primary border-0">
                    {r.rule_key}
                  </Badge>
                </div>
                <p className="font-mono text-ov-accent">Valeur : {r.rule_value}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
