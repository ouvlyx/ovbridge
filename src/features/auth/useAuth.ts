import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}