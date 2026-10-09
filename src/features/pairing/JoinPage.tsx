import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/useAuth";
import {
  ensureDeviceRegistered,
  getStoredIdentity,
} from "@/lib/device";
import { getOrCreateWorkspaceKey, 
  shareWorkspaceKeyWithNewDevice } from "@/lib/workspaceKey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { friendlyError, PairingError, AuthError } from "@/lib/errors";
import { formatPairingToken } from "@/lib/qr";

type Step = "form" | "linking" | "done";

export default function JoinPage() {
  const { user, signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [token, setToken] = useState(params.get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [stepOverride, setStepOverride] = useState<Step | null>(null);

  const step: Step = stepOverride ?? (user ? "linking" : "form");

  /* ---------- après authentification, on finalise ---------- */
  const finalize = async (userId: string) => {
    const normalized = formatPairingToken(token);

    // 1. Vérifier le token
    const { data: tok, error: tokErr } = await supabase
      .from("ovbridge_pairing_tokens")
      .select("id, expires_at, used_at")
      .eq("token", normalized)
      .maybeSingle();

    if (tokErr) throw new Error("Erreur de vérification : " + tokErr.message);
    if (!tok) throw PairingError.notFound();
    if (tok.used_at) throw PairingError.alreadyUsed();
    if (new Date(tok.expires_at) < new Date()) throw PairingError.expired();

    // 2. Enregistrer cet appareil
    const me = await ensureDeviceRegistered(userId);
    const myIdentity = getStoredIdentity();
    if (!myIdentity) throw new Error("Identité locale introuvable");

    // 3. Partage de la clé symétrique du workspace
    const { data: ws } = await supabase
      .from("ovbridge_workspaces")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (ws) {
      try {
        const symKey = await getOrCreateWorkspaceKey(ws.id, userId, myIdentity);
        await shareWorkspaceKeyWithNewDevice(
          ws.id,
          me.deviceId,
          symKey,
          myIdentity
        );
      } catch (e) {
        console.warn("[JoinPage] workspace key share failed", e);
      }
    }

    // 4. Marquer le token comme utilisé
    const { data: consumed, error: consumeErr } = await supabase.rpc(
      "ovbridge_consume_pairing_token",
      { p_token: normalized }
    );
    if (consumeErr) {
      throw new Error("Impossible de marquer le code : " + consumeErr.message);
    }
    if (!consumed) throw PairingError.alreadyUsed();

    setStepOverride("done");
  };

  /* ---------- soumission email/mdp ---------- */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error("Entrez un code");
    setBusy(true);
    try {
      if (!user) {
        await signIn(email, password);
      }
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) throw AuthError.sessionExpired();
      setStepOverride("linking");
      await finalize(uid);
    } catch (err: any) {
      toast.error(friendlyError(err));
      setStepOverride("form");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- soumission Google ---------- */
  const onGoogleSignIn = async () => {
    if (!token) return toast.error("Entrez un code d'abord");
    setGoogleBusy(true);
    try {
      // Sauvegarde le token pour le récupérer après le retour OAuth
      sessionStorage.setItem("ovbridge_join_token", formatPairingToken(token));
      await signInWithGoogle("/auth/callback");
    } catch (err: any) {
      toast.error(friendlyError(err));
      setGoogleBusy(false);
    }
  };

  /* ---------- si déjà connecté, on finalise direct ---------- */
  // (déclenché à l'arrivée sur la page si user existe déjà)
  // Note : géré par le composant côté parent — laisse tel quel

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-ov-primary">
            Rejoindre un pont
          </h1>
          <p className="text-sm text-ov-muted">
            Connectez-vous avec le même compte que sur l'autre appareil.
          </p>
        </div>

        {step === "done" ? (
          <div className="text-center space-y-3">
            <p className="font-medium text-ov-success">Appareil lié ✅</p>
            <Button onClick={() => navigate("/devices")} className="w-full">
              Voir mes appareils
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Code d'appairage</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="font-mono tracking-widest text-center"
              />
            </div>

            {!user && (
              <>
                {/* Séparateur — méthode de connexion */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-ov-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-ov-surface px-2 text-ov-muted">
                      Connexion avec
                    </span>
                  </div>
                </div>

                {/* Google */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={googleBusy || busy}
                  onClick={onGoogleSignIn}
                  className="w-full border-ov-border"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
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
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {googleBusy ? "Redirection…" : "Continuer avec Google"}
                </Button>

                {/* Séparateur "ou" */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-ov-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-ov-surface px-2 text-ov-muted">ou</span>
                  </div>
                </div>

                {/* Email + mdp */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/scan")}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" /> Scanner avec la caméra
            </Button>

            <Button
              type="submit"
              disabled={busy || authLoading || googleBusy}
              className="w-full bg-ov-primary hover:bg-ov-primaryHover"
            >
              {busy ? "Liaison…" : "Lier cet appareil"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}