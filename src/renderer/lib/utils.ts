import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// shadcn-Standard: Klassen kombinieren und widersprüchliche Tailwind-Klassen auflösen.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
