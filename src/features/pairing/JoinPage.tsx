import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
import { ensureDeviceRegistered } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function JoinPage() {
  const { user, signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [token, setToken] = useState(params.get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "linking" | "done">("form");

  // Si déjà connecté, on saute direct à l'étape link
  useEffect(() => {
    if (user && step === "form") setStep("linking");
  }, [user, step]);

  const finalize = async (userId: string) => {
    // 1. Vérifier le token
    const { data: tok, error: tokErr } = await supabase
      .from("ovbridge_pairing_tokens")
      .select("id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (tokErr || !tok) throw new Error("Code introuvable");
    if (tok.used_at) throw new Error("Code déjà utilisé");
    if (new Date(tok.expires_at) < new Date()) throw new Error("Code expiré");

    // 2. Enregistrer cet appareil
    await ensureDeviceRegistered(userId);

    // 3. Marquer le token comme utilisé
    await supabase
      .from("ovbridge_pairing_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tok.id);

    setStep("done");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error("Entrez un code");
    setBusy(true);
    try {
      if (!user) {
        await signIn(email, password);
      }
      // after signIn, user state updates async — récupérer l'id via getSession
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) throw new Error("Session introuvable");
      setStep("linking");
      await finalize(uid);
    } catch (err: any) {
      toast.error(err.message ?? "Erreur");
      setStep("form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-ov-primary">Rejoindre un pont</h1>
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
              type="submit"
              disabled={busy || authLoading}
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