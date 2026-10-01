import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

export default function ConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    (async () => {
      const token_hash = params.get("token_hash");
      const type = params.get("type");

      if (!token_hash || !type) {
        setStatus("error");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });

      if (error) {
        setStatus("error");
      } else {
        setStatus("ok");
        setTimeout(() => navigate("/devices", { replace: true }), 1500);
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border text-center space-y-3">
        {status === "loading" && <p>Confirmation en cours…</p>}
        {status === "ok" && (
          <>
            <p className="text-ov-success font-medium">Email confirmé ✅</p>
            <p className="text-sm text-ov-muted">Redirection…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-ov-danger font-medium">Lien invalide ou expiré</p>
            <button
              onClick={() => navigate("/login")}
              className="text-ov-accent underline text-sm"
            >
              Retour à la connexion
            </button>
          </>
        )}
      </Card>
    </div>
  );
}