import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Authentification en cours…");

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
          if (mounted) {
            toast.success("Connexion réussie !");
            navigate("/devices", { replace: true });
          }
          return;
        }

        // On écoute les changements d'état d'auth au cas où Supabase traite le hash/code
        const { data: authSub } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (session && mounted) {
              toast.success("Connexion réussie !");
              navigate("/devices", { replace: true });
            }
          }
        );

        // Si après 4 secondes aucun token valide n'a été récupéré
        const timeout = setTimeout(() => {
          if (mounted) {
            setStatus("Échec de l'authentification.");
            toast.error("Impossible d'authentifier la session Google.");
            navigate("/login", { replace: true });
          }
        }, 4000);

        return () => {
          authSub.subscription.unsubscribe();
          clearTimeout(timeout);
        };
      } catch (err: any) {
        if (mounted) {
          toast.error(friendlyError(err));
          navigate("/login", { replace: true });
        }
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ov-bg p-4 text-center">
      <div className="relative flex h-10 w-10 mb-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ov-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-10 w-10 bg-ov-primary" />
      </div>
      <h2 className="text-xl font-semibold text-ov-text mb-2">OvBridge</h2>
      <p className="text-sm text-ov-muted animate-pulse">{status}</p>
    </div>
  );
}
