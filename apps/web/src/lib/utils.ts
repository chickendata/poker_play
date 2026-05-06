import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a chip amount with commas. Locale-pinned to en-US so SSR and CSR agree. */
export function formatChips(n: number): string {
  return n.toLocaleString("en-US");
}
