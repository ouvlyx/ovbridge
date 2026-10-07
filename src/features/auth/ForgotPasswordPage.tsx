import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { KeyRound, ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Veuillez saisir votre adresse email.");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(
        "Email de réinitialisation envoyé ! Vérifiez votre boîte mail (lien ou code 6 chiffres)."
      );
      setStep("verify");
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      return toast.error("Veuillez saisir le code à 6 chiffres reçu par email.");
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "recovery",
      });

      if (error) throw error;

      if (data.session) {
        toast.success("Code vérifié avec succès ! Définissez votre nouveau mot de passe.");
        navigate("/reset-password");
      } else {
        toast.error("Vérification échouée. Veuillez réessayer.");
      }
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
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-ov-primary">Mot de passe oublié</h1>
          <p className="text-sm text-ov-muted">
            {step === "request"
              ? "Entrez votre email pour recevoir un lien ou un code de réinitialisation."
              : `Code envoyé à ${email}. Saisissez-le ou cliquez sur le lien reçu dans votre email.`}
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleSendResetEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Adresse Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ov-primary hover:bg-ov-primaryHover"
            >
              <Mail className="w-4 h-4 mr-2" />
              {loading ? "Envoi en cours…" : "Envoyer le lien & le code"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Code de vérification (6 chiffres)</Label>
                <Input
                  id="otp-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="text-center tracking-widest text-lg font-mono"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-ov-primary hover:bg-ov-primaryHover"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {loading ? "Vérification…" : "Valider le code"}
              </Button>
            </form>

            <div className="p-3 rounded-lg bg-ov-bg border border-ov-border text-xs text-ov-muted space-y-1">
              <p className="font-semibold text-ov-text">Vous pouvez aussi :</p>
              <p>• Cliquer directement sur le bouton "Réinitialiser" dans l'e-mail reçu.</p>
              <p>• Demander un nouveau code si vous ne l'avez pas reçu.</p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("request")}
              className="w-full border-ov-border text-xs"
            >
              Changer d'adresse email
            </Button>
          </div>
        )}

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
