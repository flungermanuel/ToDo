import type { Priority } from '@shared/types'

// Darstellung der Prioritäten – reine UI-Sache, deshalb im Renderer und nicht in core.
export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  1: { label: 'Sehr niedrig', color: 'var(--fg-subtle)' },
  2: { label: 'Niedrig', color: 'var(--success)' },
  3: { label: 'Mittel', color: 'var(--accent)' },
  4: { label: 'Hoch', color: 'var(--warning)' },
  5: { label: 'Sehr hoch', color: 'var(--danger)' }
}
