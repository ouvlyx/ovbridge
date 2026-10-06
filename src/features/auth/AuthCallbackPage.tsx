import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { LoaderCircle, CheckCircle2, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Connexion en cours…");

  useEffect(() => {
    (async () => {
      try {
        // 1. Cas OAuth avec code (PKCE) : ?code=xxx
        const code = params.get("code");

        // 2. Cas magic link / OTP : ?token_hash=xxx&type=xxx
        const token_hash = params.get("token_hash");
        const type = params.get("type");

        // 3. Cas fragment (#access_token=...) — fallback
        const hash = window.location.hash;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("ok");
          setMessage("Connexion réussie");
          setTimeout(() => navigate("/devices", { replace: true }), 800);
          return;
        }

        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
          });
          if (error) throw error;
          setStatus("ok");
          setMessage("Email confirmé");
          setTimeout(() => navigate("/devices", { replace: true }), 800);
          return;
        }

        if (hash && hash.includes("access_token")) {
          // Supabase JS gère ça automatiquement via detectSessionInUrl
          // On attend juste que la session soit créée
          await new Promise((r) => setTimeout(r, 500));
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setStatus("ok");
            setMessage("Connexion réussie");
            setTimeout(() => navigate("/devices", { replace: true }), 800);
            return;
          }
        }

        throw new Error("Aucun paramètre d'authentification trouvé");
      } catch (e: any) {
        console.error("[AuthCallback]", e);
        setStatus("error");
        setMessage(e.message ?? "Erreur d'authentification");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border text-center space-y-4">
        {status === "loading" && (
          <>
            <LoaderCircle className="w-10 h-10 mx-auto text-ov-primary animate-spin" />
            <p className="font-medium">{message}</p>
          </>
        )}

        {status === "ok" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-ov-success" />
            <p className="font-medium text-ov-success">{message}</p>
            <p className="text-xs text-ov-muted">Redirection…</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 mx-auto text-ov-danger" />
            <p className="font-medium text-ov-danger">Erreur</p>
            <p className="text-xs text-ov-muted">{message}</p>
            <p className="text-xs text-ov-muted">Redirection vers la connexion…</p>
          </>
        )}
      </Card>
    </div>
  );
}