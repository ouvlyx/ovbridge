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

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast.success("Connexion réussie");
      navigate("/devices");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-ov-primary">OvBridge</h1>
          <p className="text-sm text-ov-muted">Connexion à votre pont</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-ov-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p className="text-xs text-ov-danger">{errors.password.message}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-ov-primary hover:bg-ov-primaryHover">
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="text-sm text-center text-ov-muted">
          Pas de compte ?{" "}
          <Link to="/signup" className="text-ov-accent hover:underline">Créer un compte</Link>
        </p>
      </Card>
    </div>
  );
}