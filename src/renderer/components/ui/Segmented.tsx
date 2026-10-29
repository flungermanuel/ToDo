import { cn } from '@renderer/lib/utils'

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
}

// Segment-Schalter wie in macOS (z. B. Tag | Woche in der Kalender-App).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md'
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex shrink-0 rounded-md bg-active p-0.5"
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-[5px] font-medium transition-colors',
              size === 'md' ? 'h-6 px-2.5 text-xs' : 'h-5 px-2 text-[11px]',
              selected
                ? 'bg-surface text-fg shadow-[0_1px_2px_rgb(0_0_0/0.12)]'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
