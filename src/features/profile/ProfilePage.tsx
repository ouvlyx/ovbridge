import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Bell, HardDrive, Laptop, FileText, Scale, Lock, LogOut } from "lucide-react";
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
import { playNotificationSound, vibrateDevice } from "@/lib/notifications";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("none");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Statistiques compte
  const [devicesCount, setDevicesCount] = useState(0);

  // Paramètres notifications
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibeEnabled, setVibeEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, role, { count }] = await Promise.all([
        supabase
          .from("ovbridge_profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle(),
        fetchUserAdminRole(user.id),
        supabase
          .from("ovbridge_devices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      setDisplayName(data?.display_name ?? "");
      setAdminRole(role);
      setDevicesCount(count ?? 0);
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

  const testSound = () => {
    playNotificationSound("message");
    if (vibeEnabled) vibrateDevice([100, 50, 100]);
    toast.info("Test de notification sonore et haptique réussi !");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto space-y-6 text-ov-text">
      <header className="flex items-center gap-3 border-b border-ov-border pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Mon Profil & Paramètres</h1>
          <p className="text-xs text-ov-muted">Gérez vos données personnelles et vos préférences</p>
        </div>
      </header>

      {/* STATS APPAREILS & SÉCURITÉ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-3 border-ov-border bg-ov-surface text-center">
          <Laptop className="w-5 h-5 text-ov-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{devicesCount}</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wide">Appareils Lient</p>
        </Card>
        <Card className="p-3 border-ov-border bg-ov-surface text-center">
          <Lock className="w-5 h-5 text-ov-success mx-auto mb-1" />
          <p className="text-xl font-bold">E2E</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wide">Chiffrement Actif</p>
        </Card>
        <Card className="p-3 border-ov-border bg-ov-surface text-center col-span-2 sm:col-span-1">
          <HardDrive className="w-5 h-5 text-ov-accent mx-auto mb-1" />
          <p className="text-xl font-bold">100 Mo</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wide">Espace Inclus</p>
        </Card>
      </div>

      {/* INFORMATIONS PERSONNELLES */}
      <Card className="p-5 border-ov-border space-y-5 bg-ov-surface">
        <h2 className="text-base font-bold flex items-center gap-2">
          Informations du Compte
        </h2>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="bg-ov-bg font-mono text-xs" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display">Nom d'affichage</Label>
          <Input
            id="display"
            value={loading ? "" : displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDisplayName(e.target.value)
            }
            placeholder="Ton nom d'affichage"
            maxLength={40}
          />
          <p className="text-xs text-ov-muted">
            Ce nom apparaîtra comme signature lors de vos envois de fichiers.
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
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </Card>

      {/* PARAMÈTRES ET NOTIFICATIONS */}
      <Card className="p-5 border-ov-border space-y-4 bg-ov-surface">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Bell className="w-4 h-4 text-ov-accent" /> Préférences & Alerts
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sons de Notification</p>
            <p className="text-xs text-ov-muted">Jouer un carillon sonore lors des messages reçus</p>
          </div>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="w-4 h-4 accent-ov-primary"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Vibration Tactile</p>
            <p className="text-xs text-ov-muted">Activer les retours haptiques sur appareil mobile</p>
          </div>
          <input
            type="checkbox"
            checked={vibeEnabled}
            onChange={(e) => setVibeEnabled(e.target.checked)}
            className="w-4 h-4 accent-ov-primary"
          />
        </div>

        <Button size="sm" variant="outline" onClick={testSound} className="w-full text-xs">
          Tester le son et la vibration
        </Button>
      </Card>

      {/* JURIDIQUE ET DÉCONNEXION */}
      <Card className="p-5 border-ov-border space-y-3 bg-ov-surface">
        <h2 className="text-base font-bold">Informations Légales & Aide</h2>
        <div className="flex flex-col gap-2 pt-1 text-sm">
          <Link to="/privacy" className="text-ov-primary hover:underline flex items-center gap-2">
            <FileText className="w-4 h-4" /> Politique de Confidentialité (Zero-Knowledge)
          </Link>
          <Link to="/terms" className="text-ov-primary hover:underline flex items-center gap-2">
            <Scale className="w-4 h-4" /> Conditions Générales d'Utilisation (CGU)
          </Link>
        </div>

        <div className="pt-3 border-t border-ov-border">
          <Button
            variant="danger"
            onClick={signOut}
            className="w-full text-xs"
          >
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion du Compte
          </Button>
        </div>
      </Card>
    </div>
  );
}
