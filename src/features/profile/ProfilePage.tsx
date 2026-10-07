import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Bell,
  HardDrive,
  Laptop,
  FileText,
  Scale,
  Lock,
  LogOut,
  Palette,
} from "lucide-react";
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Champs de profil étendus
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Rôle et statistiques
  const [adminRole, setAdminRole] = useState<AdminRole>("none");
  const [devicesCount, setDevicesCount] = useState(0);

  // Personnalisation d'interface
  const [accentColor, setAccentColor] = useState("#6366F1");
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");

  // Notifications
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibeEnabled, setVibeEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const colorPresets = [
    { label: "Indigo", value: "#6366F1" },
    { label: "Cyan", value: "#22D3EE" },
    { label: "Émeraude", value: "#22C55E" },
    { label: "Rose", value: "#F43F5E" },
    { label: "Ambre", value: "#F59E0B" },
  ];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, role, { count }] = await Promise.all([
        supabase
          .from("ovbridge_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle(),
        fetchUserAdminRole(user.id),
        supabase
          .from("ovbridge_devices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      if (data) {
        setDisplayName(data.display_name ?? "");
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhoneNumber(data.phone_number ?? "");
        setAddress(data.address ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setAccentColor(data.accent_color ?? "#6366F1");
        setDensity(data.interface_density ?? "normal");
      }

      setAdminRole(role);
      setDevicesCount(count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("ovbridge_profiles")
      .update({
        display_name: displayName.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        address: address.trim(),
        avatar_url: avatarUrl,
        accent_color: accentColor,
        interface_density: density,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profil et préférences mis à jour ✅");
  };

  const syncGoogleData = () => {
    if (!user) return;
    const meta = user.user_metadata;
    if (!meta) {
      return toast.error("Aucune donnée Google détectée sur cette session.");
    }

    const fullName = meta.full_name || meta.name || "";
    const parts = fullName.split(" ");
    const gFirstName = parts[0] || "";
    const gLastName = parts.slice(1).join(" ") || "";
    const gAvatar = meta.avatar_url || meta.picture || null;

    if (gFirstName) setFirstName(gFirstName);
    if (gLastName) setLastName(gLastName);
    if (fullName) setDisplayName(fullName);
    if (gAvatar) setAvatarUrl(gAvatar);

    toast.success("Profil pré-rempli depuis votre compte Google ! Cliquez sur Enregistrer.");
  };

  const testSound = () => {
    playNotificationSound("message");
    if (vibeEnabled) vibrateDevice([100, 50, 100]);
    toast.info("Test sonore et haptique exécuté !");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto space-y-6 text-ov-text">
      <header className="flex items-center gap-3 border-b border-ov-border pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devices")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Mon Profil & Paramètres Avancés</h1>
          <p className="text-xs text-ov-muted">
            Personnalisation, coordonnées personnelles et données Google
          </p>
        </div>
      </header>

      {/* STATS APPAREILS & SÉCURITÉ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-3 border-ov-border bg-ov-surface text-center">
          <Laptop className="w-5 h-5 text-ov-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{devicesCount}</p>
          <p className="text-[10px] text-ov-muted uppercase tracking-wide">Appareils Liés</p>
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

      {/* DONNÉES PERSONNELLES & COMPTE */}
      <Card className="p-5 border-ov-border space-y-5 bg-ov-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ov-border pb-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-12 h-12 rounded-full border-2 border-ov-primary object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-ov-primary/20 text-ov-primary flex items-center justify-center font-bold text-lg">
                {(displayName || user?.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold">Données Personnelles</h2>
              <p className="text-xs text-ov-muted">Renseignez vos coordonnées de profil</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={syncGoogleData}
            className="text-xs border-ov-border hover:bg-white/5"
          >
            <GoogleIcon />
            Import Google Profile
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Adresse Email (Non modifiable)</Label>
            <Input
              value={user?.email ?? ""}
              disabled
              className="bg-ov-bg font-mono text-xs cursor-not-allowed opacity-80"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first-name">Prénom</Label>
              <Input
                id="first-name"
                value={loading ? "" : firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Jean"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nom de famille</Label>
              <Input
                id="last-name"
                value={loading ? "" : lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Dupont"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display">Nom d'affichage</Label>
            <Input
              id="display"
              value={loading ? "" : displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ton nom d'affichage"
              maxLength={40}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de Téléphone</Label>
              <Input
                id="phone"
                value={loading ? "" : phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse Postale</Label>
              <Input
                id="address"
                value={loading ? "" : address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: 12 Rue de la Paix, Paris"
              />
            </div>
          </div>
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
          onClick={saveProfile}
          disabled={busy || loading}
          className="w-full bg-ov-primary hover:bg-ov-primaryHover font-medium"
        >
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </Card>

      {/* PERSONNALISATION DE L'INTERFACE */}
      <Card className="p-5 border-ov-border space-y-4 bg-ov-surface">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Palette className="w-4 h-4 text-ov-accent" /> Personnalisation de l'Interface
        </h2>

        <div className="space-y-2">
          <Label>Couleur d'Accentuation du Thème</Label>
          <div className="flex flex-wrap gap-3 pt-1">
            {colorPresets.map((c) => (
              <button
                key={c.value}
                onClick={() => setAccentColor(c.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  accentColor === c.value
                    ? "border-white bg-white/10 text-white shadow-sm"
                    : "border-ov-border bg-ov-bg text-ov-muted hover:text-ov-text"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block"
                  style={{ backgroundColor: c.value }}
                />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label>Densité d'Affichage</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["compact", "normal", "comfortable"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`py-2 px-2 rounded-xl border text-xs font-medium capitalize transition-all ${
                  density === d
                    ? "border-ov-primary bg-ov-primary/20 text-ov-primary font-bold"
                    : "border-ov-border bg-ov-bg text-ov-muted"
                }`}
              >
                {d === "compact" ? "Compacte" : d === "normal" ? "Normale" : "Confortable"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* SÉCURITÉ ET CHANGER DE MOT DE PASSE */}
      <Card className="p-5 border-ov-border space-y-4 bg-ov-surface">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Lock className="w-4 h-4 text-ov-primary" /> Sécurité & Mot de passe
        </h2>
        <p className="text-xs text-ov-muted">
          Modifiez votre mot de passe d'accès au compte.
        </p>

        <Button
          variant="outline"
          onClick={() => navigate("/reset-password")}
          className="w-full border-ov-border hover:bg-ov-bg text-xs"
        >
          <Lock className="w-3.5 h-3.5 mr-2" /> Modifier mon mot de passe
        </Button>
      </Card>

      {/* PARAMÈTRES ET NOTIFICATIONS */}
      <Card className="p-5 border-ov-border space-y-4 bg-ov-surface">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Bell className="w-4 h-4 text-ov-accent" /> Préférences & Alertes
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
