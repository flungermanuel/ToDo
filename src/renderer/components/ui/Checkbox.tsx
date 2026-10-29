import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@renderer/lib/utils'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
  size?: 'md' | 'sm'
  /** Nur anzeigen, nicht klickbar (z. B. Deadline, deren Status vom Todo kommt) */
  readOnly?: boolean
  /** Farbe im abgehakten Zustand */
  tone?: 'accent' | 'success'
}

// Runde Checkbox wie in der macOS-App "Erinnerungen".
export function Checkbox({
  checked,
  onChange,
  label,
  size = 'md',
  readOnly = false,
  tone = 'accent'
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-readonly={readOnly}
      title={readOnly ? 'Wird über das verknüpfte Todo abgehakt' : undefined}
      onClick={readOnly ? undefined : onChange}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        size === 'md' ? 'size-[18px]' : 'size-[15px]',
        checked
          ? tone === 'success'
            ? 'border-success bg-success'
            : 'border-accent bg-accent'
          : 'border-fg-subtle',
        !checked && !readOnly && 'hover:border-fg-muted',
        readOnly && 'cursor-default'
      )}
    >
      {checked && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="text-white"
        >
          <Check strokeWidth={3.5} className={size === 'md' ? 'size-3' : 'size-2.5'} />
        </motion.span>
      )}
    </button>
  )
}
