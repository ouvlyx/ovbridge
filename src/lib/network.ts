import { useEffect, useState } from "react";
import { NetworkError } from "./errors";
import { supabase } from "./supabase";

/**
 * Utilitaires et hooks de résilience réseau pour OvBridge.
 */

/**
 * Vérifie si le client est actuellement connecté à Internet.
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
    ? navigator.onLine
    : true;
}

/**
 * Abonne un callback aux changements de connectivité réseau (online / offline).
 */
export function subscribeToNetworkStatus(
  callback: (online: boolean) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => {
    // Forcer la reconnexion des canaux Realtime Supabase
    try {
      supabase.realtime.connect();
    } catch {
      // Ignorer si déjà connecté
    }
    callback(true);
  };

  const handleOffline = () => {
    callback(false);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Hook React pour observer l'état de la connexion Internet en temps réel.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => {
    return subscribeToNetworkStatus((status) => {
      setOnline(status);
    });
  }, []);

  return { isOnline: online, isOffline: !online };
}

/**
 * Exécute une opération avec relances exponentielles en cas d'erreur réseau temporaire.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      if (!isOnline()) {
        throw new NetworkError("Pas de connexion Internet disponible.");
      }
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }

  throw new NetworkError("Échec de l'opération après plusieurs tentatives.");
}
