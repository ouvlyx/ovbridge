import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Traitement immédiat des retours OAuth quel que soit le pathname ("/" ou "/auth/callback")
    const handleAuthRedirect = async () => {
      const href = window.location.href;
      const hasOAuthParams =
        href.includes("access_token=") ||
        href.includes("code=") ||
        href.includes("error=") ||
        href.includes("error_code=");

      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }

      // Si des paramètres OAuth sont présents sur la racine "/" ou sur une autre page
      if (hasOAuthParams) {
        if (data.session) {
          // L'utilisateur est connecté, nettoyer les paramètres de l'URL
          window.history.replaceState({}, document.title, "/devices");
        } else if (window.location.pathname === "/") {
          // Si non connecté mais des params OAuth existent sur "/", basculer vers /auth/callback
          window.history.replaceState(
            {},
            document.title,
            "/auth/callback" + window.location.search + window.location.hash
          );
        }
      }
    };

    handleAuthRedirect();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    // Rediriger vers /auth/callback (ou origin) pour capter le retour Google OAuth
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
