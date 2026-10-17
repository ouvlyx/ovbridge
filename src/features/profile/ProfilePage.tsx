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
  UserRound,
  Mail,
  Phone,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Globe,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { fetchUserAdminRole } from "@/lib/admin";
import { ADMIN_ROLE_LABELS, type AdminRole } from "@/types/admin";
import {
  getNotificationPreferences,
  playNotificationSound,
  saveNotificationPreferences,
  vibrateDevice,
} from "@/lib/notifications";
import {
  getSavedCredentials,
  regeneratePassword,
  clearSavedCredentials,
  SavedCredentials,
} from "@/lib/quickAuth";
import { useAppPreferences } from "./AppPreferencesContext";

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
  const { accentColor, density, setAppearance } = useAppPreferences();

  // Profile data
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  // Role and stats
  const [adminRole, setAdminRole] = useState<AdminRole>("none");
  const [devicesCount, setDevicesCount] = useState(0);

  // Credentials and Security
  const [savedCreds, setSavedCreds] = useState<SavedCredentials | null>(null);
  const [showCreds, setShowCreds] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Email update modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Account deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notifications & Language
  const [language, setLanguage] = useState("fr");
  const [soundEnabled, setSoundEnabled] = useState(
    () => getNotificationPreferences().soundEnabled,
  );
  const [vibeEnabled, setVibeEnabled] = useState(
    () => getNotificationPreferences().vibrationEnabled,
  );

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
    // Load local saved credentials if available
    const creds = getSavedCredentials();
    if (creds) {
      setSavedCreds(creds);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ data, error }, role, { count }] = await Promise.all([
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

        if (error) throw error;

        if (data) {
          setDisplayName(data.display_name ?? "");
          setFirstName(data.first_name ?? "");
          setLastName(data.last_name ?? "");
          setPhoneNumber(data.phone_number ?? "");
          setAddress(data.address ?? "");
          if (data.language) setLanguage(data.language);
          setAppearance(
            data.accent_color ?? "#6366F1",
            data.interface_density ?? "normal",
          );
        }

        setAdminRole(role);
        setDevicesCount(count ?? 0);
      } catch (error) {
        console.error("[ProfilePage] Unable to load profile:", error);
        toast.error("Impossible de charger votre profil. Réessayez plus tard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, setAppearance]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("ovbridge_profiles")
        .update({
          display_name: displayName.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          address: address.trim(),
          accent_color: accentColor,
          interface_density: density,
          language: language,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profil et préférences mis à jour ✅");
    } catch (error) {
      console.error("[ProfilePage] Unable to save profile:", error);
      toast.error("Impossible d'enregistrer le profil. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text: string, type: "login" | "pass") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "login") {
        setCopiedLogin(true);
        setTimeout(() => setCopiedLogin(false), 2000);
      } else {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
      }
      toast.success("Copié dans le presse-papier !");
    } catch {
      toast.error("Impossible de copier.");
    }
  };

  const handleRegeneratePassword = async () => {
    setIsRegenerating(true);
    try {
      const { newPassword } = await regeneratePassword();
      toast.success("Nouveau mot de passe généré avec succès !");
      const updatedCreds = getSavedCredentials();
      if (updatedCreds) {
        setSavedCreds(updatedCreds);
      } else if (user?.email) {
        setSavedCreds({
          pseudo: displayName || "OvBridge",
          login: user.email,
          pass: newPassword,
          createdAt: new Date().toISOString(),
        });
      }
      setShowCreds(true);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération du mot de passe.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }

    setUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success(
        "Un e-mail de confirmation a été envoyé à la nouvelle adresse !"
      );
      setShowEmailModal(false);
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message || "Impossible de mettre à jour l'email.");
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      clearSavedCredentials();
      await signOut();
      toast.success("Compte déconnecté et données locales effacées.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error("Erreur lors de la suppression du compte.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
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

    if (gFirstName) setFirstName(gFirstName);
    if (gLastName) setLastName(gLastName);
    if (fullName) setDisplayName(fullName);

    toast.success("Profil pré-rempli depuis Google ! Cliquez sur Enregistrer.");
  };

  const testSound = () => {
    if (soundEnabled) playNotificationSound("message");
    if (vibeEnabled) vibrateDevice([100, 50, 100]);
    toast.info("Test sonore et haptique exécuté !");
  };

  const updateNotificationPreferences = (
    nextSoundEnabled: boolean,
    nextVibrationEnabled: boolean,
  ) => {
    try {
      saveNotificationPreferences({
        soundEnabled: nextSoundEnabled,
        vibrationEnabled: nextVibrationEnabled,
      });
      setSoundEnabled(nextSoundEnabled);
      setVibeEnabled(nextVibrationEnabled);
    } catch {
      toast.error("Impossible d'enregistrer les préférences.");
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 text-ov-text">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/devices")}
          className="rounded-xl border border-ov-border bg-ov-surface"
          aria-label="Retour aux appareils"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ov-primary">
            Votre espace
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Profil & paramètres
          </h1>
          <p className="mt-1 text-sm text-ov-muted">
            Gère tes identifiants, ta sécurité et personnalise OvBridge.
          </p>
        </div>
      </header>

      {/* Main Avatar Banner */}
      <Card className="relative overflow-hidden border-ov-border bg-gradient-to-br from-ov-primary/20 via-ov-surface to-ov-accent/10 p-5 sm:p-7 shadow-xl">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-ov-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar pseudo={displayName || user?.email || "OvBridge"} size={80} className="shadow-2xl ring-4 ring-ov-primary/30 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-bold">
                {displayName || [firstName, lastName].filter(Boolean).join(" ") || "Espace OvBridge"}
              </h2>
              <Badge className="border-0 bg-ov-success/15 text-ov-success font-medium">
                <Lock className="mr-1 h-3 w-3" /> Chiffré de bout en bout
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-ov-muted">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ov-muted">
              Tes informations sont sécurisées et ton espace est protégé par le chiffrement ZK.
            </p>
          </div>
        </div>
      </Card>

      {/* SECTION MES IDENTIFIANTS */}
      <Card className="space-y-4 border-ov-border bg-ov-surface p-5 sm:p-6 shadow-md">
        <div className="flex items-center justify-between gap-3 border-b border-ov-border/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-primary/15 text-ov-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Mes identifiants</h2>
              <p className="text-xs text-ov-muted">Accès d'authentification pour cet appareil.</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreds(!showCreds)}
            className="rounded-xl border-ov-border text-xs gap-1.5"
          >
            {showCreds ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Masquer</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Afficher</span>
              </>
            )}
          </Button>
        </div>

        {savedCreds || user?.email ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-ov-muted">Identifiant interne (Login / Email)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showCreds ? "text" : "password"}
                  readOnly
                  value={savedCreds?.login || user?.email || ""}
                  className="bg-ov-bg border-ov-border/60 font-mono text-xs select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(savedCreds?.login || user?.email || "", "login")}
                  className="shrink-0 border-ov-border rounded-xl"
                  title="Copier le login"
                >
                  {copiedLogin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {savedCreds?.pass && (
              <div className="space-y-2">
                <Label className="text-xs text-ov-muted">Mot de passe automatique</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showCreds ? "text" : "password"}
                    readOnly
                    value={savedCreds.pass}
                    className="bg-ov-bg border-ov-border/60 font-mono text-xs select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(savedCreds.pass, "pass")}
                    className="shrink-0 border-ov-border rounded-xl"
                    title="Copier le mot de passe"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-ov-muted italic pt-1">
              🔒 Tes identifiants sont stockés uniquement sur cet appareil dans la mémoire locale.
            </p>
          </div>
        ) : (
          <p className="text-xs text-ov-muted">
            Aucun identifiant sauvegardé localement sur cet appareil.
          </p>
        )}
      </Card>

      {/* SECTION SÉCURITÉ */}
      <Card className="space-y-4 border-ov-border bg-ov-surface p-5 sm:p-6 shadow-md">
        <div className="flex items-center gap-3 border-b border-ov-border/60 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-primary/15 text-ov-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-base">Sécurité du compte</h2>
            <p className="text-xs text-ov-muted">Gère l'accès et les options de récupération.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleRegeneratePassword}
            disabled={isRegenerating}
            className="w-full justify-start rounded-xl border-ov-border hover:bg-ov-bg text-xs h-11"
          >
            <RefreshCw className={`w-4 h-4 mr-2 text-ov-primary ${isRegenerating ? "animate-spin" : ""}`} />
            <span>Générer un nouveau mot de passe</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowEmailModal(true)}
            className="w-full justify-start rounded-xl border-ov-border hover:bg-ov-bg text-xs h-11"
          >
            <Mail className="w-4 h-4 mr-2 text-ov-accent" />
            <span>Ajouter un vrai email</span>
          </Button>
        </div>
      </Card>

      {/* DONNÉES PERSONNELLES & COMPTE */}
      <Card className="space-y-5 border-ov-border bg-ov-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ov-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-primary/15 text-ov-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Données personnelles</h2>
              <p className="text-xs text-ov-muted">Mets à jour ton profil et tes informations.</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={syncGoogleData}
            className="rounded-xl border-ov-border text-xs hover:bg-white/5"
          >
            <GoogleIcon />
            Import Google Profile
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display">Pseudo / Nom d'affichage</Label>
            <Input
              id="display"
              value={loading ? "" : displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Nova-Xyl"
              maxLength={40}
              className="rounded-xl border-ov-border bg-ov-bg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-name">Prénom</Label>
            <Input
              id="first-name"
              value={loading ? "" : firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex: Alex"
              className="rounded-xl border-ov-border bg-ov-bg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name">Nom de famille</Label>
            <Input
              id="last-name"
              value={loading ? "" : lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex: Morgan"
              className="rounded-xl border-ov-border bg-ov-bg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-ov-muted" /> Téléphone
            </Label>
            <Input
              id="phone"
              value={loading ? "" : phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="rounded-xl border-ov-border bg-ov-bg"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-ov-muted" /> Adresse
            </Label>
            <Input
              id="address"
              value={loading ? "" : address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Paris, France"
              className="rounded-xl border-ov-border bg-ov-bg"
            />
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
          className="w-full bg-ov-primary hover:bg-ov-primaryHover font-medium h-11 rounded-xl"
        >
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </Card>

      {/* PRÉFÉRENCES (LANGUE ET THÈME) */}
      <Card className="space-y-5 border-ov-border bg-ov-surface p-5 sm:p-6">
        <div className="flex items-start gap-3 border-b border-ov-border/60 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-accent/15 text-ov-accent">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-base">Préférences & Apparence</h2>
            <p className="text-xs text-ov-muted">Langue, thèmes et densité d'affichage.</p>
          </div>
        </div>

        {/* Langue */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-ov-muted">
            <Globe className="w-3.5 h-3.5" /> Langue de l'interface
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                language === "fr"
                  ? "border-ov-primary bg-ov-primary/15 text-ov-primary"
                  : "border-ov-border bg-ov-bg text-ov-muted hover:border-ov-primary/40"
              }`}
            >
              🇫🇷 Français
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                language === "en"
                  ? "border-ov-primary bg-ov-primary/15 text-ov-primary"
                  : "border-ov-border bg-ov-bg text-ov-muted hover:border-ov-primary/40"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-ov-muted">Couleur d’accentuation</Label>
          <div className="flex flex-wrap gap-3 pt-1">
            {colorPresets.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setAppearance(c.value, density)}
                aria-pressed={accentColor === c.value}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                  accentColor === c.value
                    ? "border-ov-primary bg-ov-primary/10 text-ov-text ring-1 ring-ov-primary/40"
                    : "border-ov-border bg-ov-bg text-ov-muted hover:border-ov-primary/50 hover:text-ov-text"
                }`}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full ring-2 ring-white/10"
                  style={{ backgroundColor: c.value }}
                />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="space-y-3 border-t border-ov-border/60 pt-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-ov-muted" />
            <Label className="text-xs font-semibold text-ov-muted">Densité d’affichage</Label>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["compact", "normal", "comfortable"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAppearance(accentColor, d)}
                aria-pressed={density === d}
                className={`rounded-xl border px-3 py-3 text-left text-xs transition-all ${
                  density === d
                    ? "border-ov-primary bg-ov-primary/10 text-ov-text ring-1 ring-ov-primary/40"
                    : "border-ov-border bg-ov-bg text-ov-muted hover:border-ov-primary/50"
                }`}
              >
                <span className="block font-semibold">
                  {d === "compact" ? "Compacte" : d === "normal" ? "Équilibrée" : "Confortable"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* NOTIFICATIONS */}
      <Card className="space-y-4 border-ov-border bg-ov-surface p-5 sm:p-6">
        <h2 className="flex items-center gap-3 font-bold text-base">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-accent/15 text-ov-accent">
            <Bell className="h-5 w-5" />
          </div>
          Alertes & notifications
        </h2>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-ov-border bg-ov-bg/60 p-4">
          <div>
            <p className="text-sm font-medium">Sons de notification</p>
            <p className="mt-1 text-xs text-ov-muted">Carillon lors des messages et transferts reçus</p>
          </div>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) =>
              updateNotificationPreferences(e.target.checked, vibeEnabled)
            }
            aria-label="Activer les sons de notification"
            className="h-5 w-5 shrink-0 accent-ov-primary"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-ov-border bg-ov-bg/60 p-4">
          <div>
            <p className="text-sm font-medium">Vibration tactile</p>
            <p className="mt-1 text-xs text-ov-muted">Retour haptique sur appareil mobile</p>
          </div>
          <input
            type="checkbox"
            checked={vibeEnabled}
            onChange={(e) =>
              updateNotificationPreferences(soundEnabled, e.target.checked)
            }
            aria-label="Activer la vibration tactile"
            className="h-5 w-5 shrink-0 accent-ov-primary"
          />
        </div>

        <Button size="sm" variant="outline" onClick={testSound} className="w-full rounded-xl text-xs">
          <Sparkles className="mr-2 h-4 w-4 text-ov-accent" />
          Tester le son et la vibration
        </Button>
      </Card>

      {/* STATS & APPAREILS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 border-ov-border bg-ov-surface p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-primary/15 text-ov-primary">
            <Laptop className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold">{devicesCount}</p>
            <p className="text-xs text-ov-muted">Appareils liés</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-ov-border bg-ov-surface p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-success/15 text-ov-success">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold">E2E</p>
            <p className="text-xs text-ov-muted">Chiffrement actif</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-ov-border bg-ov-surface p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-accent/15 text-ov-accent">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold">100 Mo</p>
            <p className="text-xs text-ov-muted">Espace inclus</p>
          </div>
        </Card>
      </div>

      {/* DÉCONNEXION & SUPPRESSION COMPTE */}
      <Card className="space-y-4 border-ov-border bg-ov-surface p-5 sm:p-6">
        <h2 className="font-bold text-base">Compte & Légal</h2>
        <div className="flex flex-col gap-2 pt-1 text-sm">
          <Link to="/privacy" className="text-ov-primary hover:underline flex items-center gap-2">
            <FileText className="w-4 h-4" /> Politique de Confidentialité
          </Link>
          <Link to="/terms" className="text-ov-primary hover:underline flex items-center gap-2">
            <Scale className="w-4 h-4" /> Conditions Générales d'Utilisation
          </Link>
        </div>

        <div className="pt-3 border-t border-ov-border flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={signOut}
            className="flex-1 rounded-xl text-xs h-11"
          >
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>

          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 rounded-xl text-xs h-11"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer mon compte
          </Button>
        </div>
      </Card>

      {/* EMAIL UPDATE MODAL */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="bg-ov-surface border-ov-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ov-primary font-bold text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" /> Ajouter un vrai e-mail
            </DialogTitle>
            <DialogDescription className="text-ov-muted text-xs">
              Associe une vraie adresse e-mail pour sécuriser et pouvoir récupérer ton compte en toutes circonstances.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateEmail} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-email" className="text-xs">Nouvelle adresse email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="ton.email@domaine.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoFocus
                className="bg-ov-bg border-ov-border"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailModal(false)}
                className="border-ov-border"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updatingEmail || !newEmail.trim()}
                className="bg-ov-primary hover:bg-ov-primaryHover text-white"
              >
                {updatingEmail ? "Envoi du lien..." : "Associer l'email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ACCOUNT MODAL */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-ov-surface border-ov-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-400 font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> Supprimer mon compte
            </DialogTitle>
            <DialogDescription className="text-ov-muted text-xs">
              Es-tu sûr(e) de vouloir supprimer ou réinitialiser l'accès local à ce compte ? Cette action effacera tes identifiants sauvegardés sur cet appareil.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-ov-border"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deletingAccount}
              onClick={handleDeleteAccount}
            >
              {deletingAccount ? (
                <div className="flex items-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Suppression...</span>
                </div>
              ) : (
                <span>Confirmer la suppression</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
