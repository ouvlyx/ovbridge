import { createContext, useContext } from "react";

export type Density = "compact" | "normal" | "comfortable";

export type AppPreferencesValue = {
  accentColor: string;
  density: Density;
  setAppearance: (accentColor: string, density: Density) => void;
};

export const AppPreferencesContext =
  createContext<AppPreferencesValue | null>(null);

export function useAppPreferences(): AppPreferencesValue {
  const value = useContext(AppPreferencesContext);
  if (!value) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return value;
}
