import { friendlyError } from "@/lib/errors";
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
import {
  Link2,
  // UserRound 
} from "lucide-react";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { 
    signIn, 
    // signInAnonymously 
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // const [anonLoading, setAnonLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast.success("Connexion réussie");
      navigate("/devices");
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  // const onAnonymous = async () => {
  //   setAnonLoading(true);
  //   try {
  //     await signInAnonymously();
  //     toast.success("Mode invité activé");
  //     navigate("/devices");
  //   } catch (e: any) {
  //     toast.error(friendlyError(e));
  //   } finally {
  //     setAnonLoading(false);
  //   }
  // };

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
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-ov-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-ov-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-ov-primary hover:bg-ov-primaryHover"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        {/* Séparateur */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-ov-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-ov-surface px-2 text-ov-muted">ou</span>
          </div>
        </div>

        {/* Mode invité */}
        {/*        
        <Button
          type="button"
          variant="outline"
          disabled={anonLoading}
          onClick={onAnonymous}
          className="w-full border-ov-accent/40 text-ov-accent hover:bg-ov-accent/10 hover:border-ov-accent"
        >
          <UserRound className="w-4 h-4 mr-2" />
          {anonLoading ? "Activation…" : "Utiliser sans compte"}
        </Button> */}

        {/* Rejoindre avec un code */}
        <Button
          type="button"
          variant="outline"
          className="w-full border-ov-border hover:bg-ov-bg hover:border-ov-primary/50"
          onClick={() => navigate("/join")}
        >
          <Link2 className="w-4 h-4 mr-2" />
          J'ai un code d'appairage
        </Button>

        <p className="text-sm text-center text-ov-muted">
          Pas de compte ?{" "}
          <Link to="/signup" className="text-ov-accent hover:underline">
            Créer un compte
          </Link>
        </p>
      </Card>
    </div>
  );
}