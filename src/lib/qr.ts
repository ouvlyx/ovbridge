import { PairingError } from "./errors";

/**
 * Utilitaires pour la gestion et le formatage des QR codes et codes d'appairage.
 */

export const PAIRING_TOKEN_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Nettoie une chaîne pour en extraire un token d'appairage (supprime espaces et tirets, passe en majuscule).
 */
export function cleanPairingToken(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Formate un code brut de 8 caractères sous forme XXXX-XXXX.
 */
export function formatPairingToken(raw: string): string {
  const clean = cleanPairingToken(raw);
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  }
  return raw.trim().toUpperCase();
}

/**
 * Vérifie si un token respecte le format standard d'appairage OvBridge (XXXX-XXXX).
 */
export function isValidPairingToken(token: string): boolean {
  return PAIRING_TOKEN_REGEX.test(formatPairingToken(token));
}

/**
 * Construit l'URL complète d'appairage pour un QR code.
 */
export function buildPairingUrl(token: string, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const formatted = formatPairingToken(token);
  return `${base}/join?token=${encodeURIComponent(formatted)}`;
}

/**
 * Analyse le texte décodé d'un scan QR code (URL complète ou token brut).
 */
export function parsePairingQr(decodedText: string): string {
  const trimmed = decodedText.trim();

  try {
    const url = new URL(trimmed);
    const tokenParam = url.searchParams.get("token");
    if (tokenParam) {
      const formatted = formatPairingToken(tokenParam);
      if (isValidPairingToken(formatted)) {
        return formatted;
      }
    }
  } catch {
    // Pas une URL absolue valide, tentative en tant que token direct
  }

  const formatted = formatPairingToken(trimmed);
  if (isValidPairingToken(formatted)) {
    return formatted;
  }

  throw PairingError.notFound("Le QR code scanné ne contient pas de jeton d'appairage valide.");
}
