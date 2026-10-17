import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { QuickStartCard } from "./QuickStartCard";
import { useAuth } from "./useAuth";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";

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

export default function QuickSignupPage() {
  const { signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-ov-bg text-ov-text">
      <div className="w-full max-w-md space-y-6">
        {/* Brand logo header */}
        <div className="flex justify-center mb-2">
          <Link to="/" className="inline-block">
            <img
              src="/brandmark-bg.png"
              alt="OvBridge"
              className="h-14 w-auto rounded-2xl shadow-xl border border-ov-border/50 hover:scale-105 transition-transform"
            />
          </Link>
        </div>

        {/* QuickStart Card component */}
        <QuickStartCard />

        {/* Google OAuth & Alternate Options */}
        <div className="w-full max-w-md space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-ov-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-ov-bg px-2 text-ov-muted font-medium">
                Autre méthode
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={googleLoading}
            onClick={handleGoogleSignUp}
            className="w-full bg-ov-surface/80 border-ov-border/80 hover:bg-white/5 hover:border-ov-primary/50 text-ov-text font-medium h-11 rounded-xl"
          >
            <GoogleIcon />
            {googleLoading ? "Redirection Google..." : "Continuer avec Google"}
          </Button>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-ov-muted gap-2 pt-2 px-1">
            <Link
              to="/login"
              className="text-ov-accent hover:text-ov-primary transition-colors underline-offset-4 hover:underline font-medium"
            >
              Déjà un compte ? Se connecter
            </Link>

            <Link
              to="/recover"
              className="text-ov-muted hover:text-ov-text transition-colors underline-offset-4 hover:underline"
            >
              Récupérer mon compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
