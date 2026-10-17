/**
 * Avatar utility functions for deterministic gradients and initials generation based on user pseudo.
 */

const GRADIENT_PALETTES: Array<{ from: string; to: string }> = [
  { from: "#7C5CFF", to: "#00E5CC" }, // Electric Violet -> Cyan Menthe
  { from: "#3B82F6", to: "#8B5CF6" }, // Blue -> Purple
  { from: "#EC4899", to: "#8B5CF6" }, // Pink -> Purple
  { from: "#10B981", to: "#3B82F6" }, // Emerald -> Blue
  { from: "#F59E0B", to: "#EF4444" }, // Amber -> Red
  { from: "#6366F1", to: "#A855F7" }, // Indigo -> Purple
  { from: "#06B6D4", to: "#3B82F6" }, // Cyan -> Blue
  { from: "#8B5CF6", to: "#EC4899" }, // Purple -> Pink
  { from: "#14B8A6", to: "#10B981" }, // Teal -> Emerald
  { from: "#F97316", to: "#E11D48" }, // Orange -> Rose
];

/**
 * Computes a deterministic integer hash from a string.
 */
function hashString(str: string): number {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Extracts 1-2 upper-case initials from a pseudo.
 * Example: "Nova-Xyl" -> "NX", "Pixel Orion" -> "PO", "Cyber" -> "CY"
 */
export function getInitials(pseudo: string): string {
  if (!pseudo) return "?";
  const clean = pseudo.trim().replace(/^@/, "");
  if (!clean) return "?";

  const parts = clean.split(/[-_\s]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  if (clean.length === 1) {
    return clean.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}

/**
 * Returns a deterministic gradient pair { from, to } for a given pseudo.
 */
export function getGradientForPseudo(pseudo: string): { from: string; to: string } {
  const hash = hashString(pseudo || "guest");
  const index = hash % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

/**
 * Returns a single primary accent color hex code for a pseudo.
 */
export function getAvatarColor(pseudo: string): string {
  const gradient = getGradientForPseudo(pseudo);
  return gradient.from;
}
