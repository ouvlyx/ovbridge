import { supabase } from "./supabase";

export interface SavedCredentials {
  pseudo: string;
  login: string;
  pass: string;
  createdAt: string;
}

export interface QuickSignupResult {
  pseudo: string;
  internalEmail: string;
  autoPassword: string;
  userId: string;
}

const STORAGE_KEY = "ovbridge_saved_credentials";

const FALLBACK_PREFIXES = [
  "Nova", "Pixel", "Astra", "Cosmo", "Cyber", "Hyper", "Orion", "Pulse",
  "Chrono", "Vortex", "Apex", "Zenith", "Krypton", "Lyra", "Stellar",
  "Aether", "Nexus", "Solar", "Lunar", "Echo"
];

const FALLBACK_SUFFIXES = [
  "Xyl", "Orion", "Vortex", "Pulse", "Zen", "Flux", "Nova", "Rift",
  "Spark", "Wave", "Core", "Link", "Shift", "Beat", "Drift", "Storm"
];

/**
 * Generates or retrieves a list of suggested pseudos available for registration.
 */
export async function getSuggestedPseudos(count: number = 4): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc("generate_available_pseudos", {
      p_count: count,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((item: { pseudo: string } | string) =>
        typeof item === "string" ? item : item.pseudo
      );
    }
  } catch (err) {
    console.warn("RPC generate_available_pseudos non disponible, fallback local:", err);
  }

  // Fallback local pseudo generator
  const generated: string[] = [];
  let attempts = 0;
  while (generated.length < count && attempts < 50) {
    attempts++;
    const prefix = FALLBACK_PREFIXES[Math.floor(Math.random() * FALLBACK_PREFIXES.length)];
    const suffix = FALLBACK_SUFFIXES[Math.floor(Math.random() * FALLBACK_SUFFIXES.length)];
    const cand = `${prefix}-${suffix}`;
    if (!generated.includes(cand)) {
      generated.push(cand);
    }
  }
  return generated;
}

/**
 * Checks if a given pseudo is available.
 */
export async function checkPseudoAvailability(pseudo: string): Promise<boolean> {
  const clean = pseudo.trim();
  if (!clean || clean.length < 3 || clean.length > 30) {
    return false;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc("check_pseudo_availability", {
      p_pseudo: clean,
    });

    if (!error && typeof data === "boolean") {
      return data;
    }
  } catch (err) {
    console.warn("RPC check_pseudo_availability error, fallback client check:", err);
  }

  // Fallback check against profiles table directly
  try {
    const { data } = await supabase
      .from("ovbridge_profiles")
      .select("id")
      .ilike("display_name", clean)
      .maybeSingle();

    return !data;
  } catch {
    return true;
  }
}

/**
 * Performs quick pseudo-first signup.
 */
export async function quickSignup(pseudo: string): Promise<QuickSignupResult> {
  const cleanPseudo = pseudo.trim();
  if (!cleanPseudo) {
    throw new Error("Le pseudo est obligatoire.");
  }

  const isAvailable = await checkPseudoAvailability(cleanPseudo);
  if (!isAvailable) {
    throw new Error("Ce pseudo est déjà pris ou invalide.");
  }

  const sanitized = cleanPseudo.toLowerCase().replace(/[^a-z0-9]/g, "");
  const internalEmail = `${sanitized}.${Date.now()}@guest.ouvlyx.com`;

  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).substring(2, 10).toUpperCase();
  const autoPassword = `OVBRIDGE-${randomPart}!`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: internalEmail,
    password: autoPassword,
    options: {
      data: {
        display_name: cleanPseudo,
      },
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Échec de la création du compte.");
  }

  const userId = authData.user.id;

  // Upsert profile
  try {
    await supabase.from("ovbridge_profiles").upsert({
      id: userId,
      display_name: cleanPseudo,
      auth_provider: "quick_pseudo",
    });
  } catch (profileErr) {
    console.warn("Erreur mise à jour profil après quick signup:", profileErr);
  }

  const savedCreds: SavedCredentials = {
    pseudo: cleanPseudo,
    login: internalEmail,
    pass: autoPassword,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCreds));
    localStorage.setItem(`ovbridge_quick_onboarding_pending:${userId}`, "true");
  } catch (storageErr) {
    console.warn("Impossible de sauvegarder dans localStorage:", storageErr);
  }

  return {
    pseudo: cleanPseudo,
    internalEmail,
    autoPassword,
    userId,
  };
}

/**
 * Retrieves saved credentials from local storage.
 */
export function getSavedCredentials(): SavedCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.pseudo && parsed.login && parsed.pass) {
      return parsed as SavedCredentials;
    }
  } catch (err) {
    console.warn("Erreur lecture credentials sauvegardés:", err);
  }
  return null;
}

/**
 * Generates and updates a new password for the current logged-in user.
 */
export async function regeneratePassword(): Promise<{ newPassword: string }> {
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8).toUpperCase()
    : Math.random().toString(36).substring(2, 10).toUpperCase();
  const newPassword = `OVBRIDGE-${randomPart}!`;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message || "Impossible de régénérer le mot de passe.");
  }

  const current = getSavedCredentials();
  if (current) {
    const updated: SavedCredentials = {
      ...current,
      pass: newPassword,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (storageErr) {
      console.warn("Erreur mise à jour credentials dans localStorage:", storageErr);
    }
  }

  return { newPassword };
}

/**
 * Clears saved credentials from local storage.
 */
export function clearSavedCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Erreur suppression credentials:", err);
  }
}
