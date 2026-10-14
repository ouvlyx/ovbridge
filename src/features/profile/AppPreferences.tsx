import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth";
import { supabase } from "@/lib/supabase";
import {
  AppPreferencesContext,
  type Density,
} from "./AppPreferencesContext";

const DEFAULT_ACCENT = "#6366F1";
const DEFAULT_DENSITY = "normal";

type StoredAppearance = {
  userId: string | null;
  accentColor: string;
  density: Density;
};

function getAccentHover(color: string): string {
  const channel = (start: number) =>
    Math.max(0, Math.round(parseInt(color.slice(start, start + 2), 16) * 0.82))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [storedAppearance, setStoredAppearance] = useState<StoredAppearance>({
    userId: null,
    accentColor: DEFAULT_ACCENT,
    density: DEFAULT_DENSITY,
  });
  const isCurrentUser = storedAppearance.userId === (user?.id ?? null);
  const accentColor = isCurrentUser
    ? storedAppearance.accentColor
    : DEFAULT_ACCENT;
  const density = isCurrentUser ? storedAppearance.density : DEFAULT_DENSITY;

  useEffect(() => {
    let active = true;

    if (!user) return;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("ovbridge_profiles")
          .select("accent_color, interface_density")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          console.error("[AppPreferences] Unable to load appearance settings:", error);
        }
        if (!active) return;

        setStoredAppearance({
          userId: user.id,
          accentColor: data?.accent_color ?? DEFAULT_ACCENT,
          density:
            data?.interface_density === "compact" ||
            data?.interface_density === "comfortable"
              ? data.interface_density
              : DEFAULT_DENSITY,
        });
      } catch (error) {
        console.error("[AppPreferences] Unable to load appearance settings:", error);
        if (!active) return;
        setStoredAppearance({
          userId: user.id,
          accentColor: DEFAULT_ACCENT,
          density: DEFAULT_DENSITY,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const validAccent = /^#[0-9a-f]{6}$/i.test(accentColor)
      ? accentColor
      : DEFAULT_ACCENT;
    root.style.setProperty("--color-ov-primary", validAccent);
    root.style.setProperty("--color-ov-primaryHover", getAccentHover(validAccent));
    root.dataset.density = density;
    root.style.setProperty(
      "--spacing",
      `calc(0.25rem * ${
        density === "compact" ? "0.85" : density === "comfortable" ? "1.1" : "1"
      })`,
    );

    return () => {
      root.style.removeProperty("--color-ov-primary");
      root.style.removeProperty("--color-ov-primaryHover");
      root.style.removeProperty("--spacing");
      delete root.dataset.density;
    };
  }, [accentColor, density]);

  const setAppearance = useCallback(
    (nextAccentColor: string, nextDensity: Density) => {
      setStoredAppearance({
        userId: user?.id ?? null,
        accentColor: nextAccentColor,
        density: nextDensity,
      });
    },
    [user?.id],
  );

  const value = useMemo(
    () => ({
      accentColor,
      density,
      setAppearance,
    }),
    [accentColor, density, setAppearance],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}
