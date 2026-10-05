import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchUserAdminRole } from "@/lib/admin";
import { ADMIN_ROLE_LABELS, type AdminRole } from "@/types/admin";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("none");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, role] = await Promise.all([
        supabase
          .from("ovbridge_profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle(),
        fetchUserAdminRole(user.id),
      ]);
      setDisplayName(data?.display_name ?? "");
      setAdminRole(role);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("ovbridge_profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  };

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Mon profil</h1>
      </header>

      <Card className="p-5 border-ov-border space-y-5 bg-ov-surface">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display">Nom d'affichage</Label>
          <Input
            id="display"
            value={loading ? "" : displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDisplayName(e.target.value)
            }
            placeholder="Ton nom"
            maxLength={40}
          />
          <p className="text-xs text-ov-muted">
            Ce nom apparaîtra comme signature lors de l'envoi de fichiers.
          </p>
        </div>

        {adminRole !== "none" && (
          <div className="p-3 bg-ov-primary/10 border border-ov-primary/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ov-primary flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Rôle Administrateur
              </span>
              <Badge className="bg-ov-primary text-white border-0 text-[10px]">
                {adminRole.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-ov-muted">{ADMIN_ROLE_LABELS[adminRole]}</p>
            <Button
              size="sm"
              onClick={() => navigate("/admin")}
              className="w-full bg-ov-primary hover:bg-ov-primaryHover text-xs mt-1"
            >
              Ouvrir la Console Admin
            </Button>
          </div>
        )}

        <Button
          onClick={save}
          disabled={busy || loading}
          className="w-full bg-ov-primary hover:bg-ov-primaryHover"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </Card>
    </div>
  );
}
