import type { CategoryColor } from '@shared/types'

// Darstellung der Kategorie-Farben. Die Werte stehen als CSS-Variablen in
// globals.css – so passen sie sich automatisch an Hell/Dunkel an.
export const CATEGORY_COLOR_META: Record<CategoryColor, { label: string; css: string }> = {
  red: { label: 'Rot', css: 'var(--cat-red)' },
  orange: { label: 'Orange', css: 'var(--cat-orange)' },
  yellow: { label: 'Gelb', css: 'var(--cat-yellow)' },
  green: { label: 'Grün', css: 'var(--cat-green)' },
  blue: { label: 'Blau', css: 'var(--cat-blue)' },
  purple: { label: 'Lila', css: 'var(--cat-purple)' },
  gray: { label: 'Grau', css: 'var(--cat-gray)' }
}
