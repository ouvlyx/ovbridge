import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "./AuthProvider";
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

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await signUp(values.email, values.password);
      toast.success("Compte créé. Vérifie ta boîte mail si confirmation activée.");
      navigate("/devices");
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-ov-primary">Créer un compte</h1>
          <p className="text-sm text-ov-muted">Rejoins OvBridge</p>
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

          <Button type="submit" disabled={loading} className="w-full bg-ov-primary hover:bg-ov-primaryHover">
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