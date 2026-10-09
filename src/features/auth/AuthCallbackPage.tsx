import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Authentification en cours…");

  useEffect(() => {
    let mounted = true;

    /** Redirige vers /join si un token est en attente, sinon /devices */
    const redirectAfterAuth = () => {
      const pendingJoin = sessionStorage.getItem("ovbridge_join_token");
      if (pendingJoin) {
        sessionStorage.removeItem("ovbridge_join_token");
        navigate(`/join?token=${pendingJoin}`, { replace: true });
        return true;
      }
      return false;
    };

    const processAuth = async () => {
      const queryParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.substring(1));

      const errorCode =
        queryParams.get("error_code") || hashParams.get("error_code");
      const errorDesc =
        queryParams.get("error_description") ||
        hashParams.get("error_description");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 1. Session déjà valide
      if (session) {
        if (!mounted) return;
        if (!redirectAfterAuth()) {
          toast.success("Connexion réussie ! Bienvenue sur OvBridge.");
          navigate("/devices", { replace: true });
        }
        return;
      }

      // 2. Erreur OAuth
      if (errorCode) {
        if (!mounted) return;

        if (
          errorCode === "flow_state_already_used" ||
          errorCode === "bad_oauth_state"
        ) {
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData.session) {
            if (!redirectAfterAuth()) {
              toast.success("Session authentifiée ! Redirection…");
              navigate("/devices", { replace: true });
            }
            return;
          }
        }

        toast.error(
          errorDesc
            ? `Authentification Google : ${decodeURIComponent(
                errorDesc
              ).replace(/\+/g, " ")}`
            : "Le lien de connexion a expiré ou a déjà été utilisé. Veuillez vous ré-authentifier."
        );
        setStatus("Redirection vers la page de connexion…");
        setTimeout(() => {
          if (mounted) navigate("/login", { replace: true });
        }, 2000);
        return;
      }

      // 3. Écoute l'arrivée de la session
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (newSession && mounted) {
            if (!redirectAfterAuth()) {
              toast.success("Connexion Google réussie !");
              navigate("/devices", { replace: true });
            }
          }
        }
      );

      // 4. Timeout de sécurité
      const timeout = setTimeout(async () => {
        if (!mounted) return;
        const { data: checkData } = await supabase.auth.getSession();
        if (checkData.session) {
          if (!redirectAfterAuth()) {
            navigate("/devices", { replace: true });
          }
        } else {
          toast.info("Veuillez vous connecter avec votre compte.");
          navigate("/login", { replace: true });
        }
      }, 3000);

      return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    processAuth();

    return () => {
      mounted = false;
    };
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ov-bg p-6 text-center text-ov-text">
      <div className="relative flex h-12 w-12 mb-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ov-primary opacity-60" />
        <span className="relative inline-flex rounded-full h-12 w-12 bg-ov-primary/20 border border-ov-primary/40 flex items-center justify-center font-bold text-ov-primary">
          OV
        </span>
      </div>
      <h2 className="text-xl font-bold text-ov-primary mb-1">OvBridge</h2>
      <p className="text-sm text-ov-muted animate-pulse">{status}</p>
    </div>
  );
}