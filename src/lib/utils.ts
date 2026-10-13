import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
  Garantit qu'une promesse ou fonction asynchrone dure au moins `minMs` millisecondes (2000 ms par défaut)
  afin de fournir un temps de chargement visuel constant lors des rafraîchissements.
 */
export async function withMinDelay<T>(
  promiseOrFn: Promise<T> | (() => Promise<T>),
  minMs = 2000
): Promise<T> {
  const start = Date.now();
  try {
    const promise = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
    const result = await promise;
    const elapsed = Date.now() - start;
    if (elapsed < minMs) {
      await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
    }
    return result;
  } catch (error) {
    const elapsed = Date.now() - start;
    if (elapsed < minMs) {
      await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
    }
    throw error;
  }
}
