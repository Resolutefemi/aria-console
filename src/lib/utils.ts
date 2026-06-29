import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 * Combines clsx (conditional) and tailwind-merge (dedupe).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
