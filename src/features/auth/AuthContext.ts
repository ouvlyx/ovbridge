import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Alias pour compat (ancien nom utilisé ailleurs)
export type AuthContextType = AuthContextValue;

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);