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

    const processAuth = async () => {
      // 1. Analyser les paramètres de la requête et les hash fragments (#access_token ou ?error=)
      const queryParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash.substring(1));

      const errorCode = queryParams.get("error_code") || hashParams.get("error_code");
      const errorDesc = queryParams.get("error_description") || hashParams.get("error_description");

      // 2. Vérifier s'il existe déjà une session active dans le navigateur
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        if (mounted) {
          toast.success("Connexion réussie ! Bienvenue sur OvBridge.");
          navigate("/devices", { replace: true });
        }
        return;
      }

      // 3. Si une erreur d'état OAuth est renvoyée (ex: flow_state_already_used ou bad_oauth_state)
      if (errorCode) {
        if (mounted) {
          if (errorCode === "flow_state_already_used" || errorCode === "bad_oauth_state") {
            // L'utilisateur est peut-être déjà inscrit/connecté, retenter de récupérer la session
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData.session) {
              toast.success("Session authentifiée ! Redirecting…");
              navigate("/devices", { replace: true });
              return;
            }
          }

          toast.error(
            errorDesc
              ? `Authentification Google : ${decodeURIComponent(errorDesc).replace(/\+/g, " ")}`
              : "Le lien de connexion a expiré ou a déjà été utilisé. Veuillez vous ré-authentifier."
          );
          setStatus("Redirection vers la page de connexion…");
          setTimeout(() => {
            if (mounted) navigate("/login", { replace: true });
          }, 2000);
        }
        return;
      }

      // 4. Écouter l'événement Supabase onAuthStateChange
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (newSession && mounted) {
          toast.success("Connexion Google réussie !");
          navigate("/devices", { replace: true });
        }
      });

      // Timeout de précaution si aucune session n'est détectée après 3 secondes
      const timeout = setTimeout(async () => {
        if (mounted) {
          const { data: checkData } = await supabase.auth.getSession();
          if (checkData.session) {
            navigate("/devices", { replace: true });
          } else {
            toast.info("Veuillez vous connecter avec votre compte.");
            navigate("/login", { replace: true });
          }
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
