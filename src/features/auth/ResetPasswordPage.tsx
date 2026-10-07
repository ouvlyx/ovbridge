import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      return toast.error("Le mot de passe doit contenir au moins 6 caractères.");
    }

    if (password !== confirmPassword) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès !");
      navigate("/devices", { replace: true });
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ov-bg">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-ov-primary/10 flex items-center justify-center text-ov-primary border border-ov-primary/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-ov-primary">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-ov-muted">
            Choisissez un mot de passe sécurisé pour votre compte OvBridge.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Confirmer le nouveau mot de passe
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-ov-primary hover:bg-ov-primaryHover"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {loading ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        </form>

        <div className="pt-2 border-t border-ov-border text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-xs text-ov-muted hover:text-ov-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Retour à la connexion
          </Link>
        </div>
      </Card>
    </div>
  );
}
