import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { friendlyError } from "@/lib/errors";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

type FormValues = z.infer<typeof schema>;

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

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await signUp(values.email, values.password);

      // Vérifier si une session active est immédiatement disponible
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        toast.success("Compte créé et connecté avec succès !");
        navigate("/devices", { replace: true });
      } else {
        toast.success(
          "Compte créé avec succès ! Un e-mail de confirmation a été envoyé. Veuillez vérifier votre boîte de réception."
        );
        navigate("/login", { replace: true });
      }
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      toast.error(friendlyError(e));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <div className="space-y-2 text-center">
          <img
            src="/brandmark-bg.png"
            alt="OvBridge"
            className="mx-auto h-16 w-auto rounded-2xl shadow-lg border border-ov-border/40"
          />
          <h1 className="text-2xl font-bold text-ov-primary">Créer un compte</h1>
          <p className="text-sm text-ov-muted">Rejoins OvBridge</p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={googleLoading || loading}
          onClick={handleGoogleSignUp}
          className="w-full border-ov-border hover:bg-white/5 hover:border-ov-primary/50 text-ov-text"
        >
          <GoogleIcon />
          {googleLoading ? "Redirection Google…" : "S'inscrire avec Google"}
        </Button>

        {/* Séparateur */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-ov-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-ov-surface px-2 text-ov-muted">ou par email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-ov-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-ov-danger">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-ov-danger">{errors.confirm.message}</p>}
          </div>

          <Button type="submit" disabled={loading || googleLoading} className="w-full bg-ov-primary hover:bg-ov-primaryHover">
            {loading ? "Création…" : "Créer mon compte"}
          </Button>
        </form>

        <p className="text-sm text-center text-ov-muted">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-ov-accent hover:underline">Se connecter</Link>
        </p>
      </Card>
    </div>
  );
}
