import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger'
  children: ReactNode
}

// Kleiner, unauffälliger Knopf nur mit Symbol – mit Text für Screenreader und Tooltip.
export function IconButton({
  label,
  tone = 'default',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors',
        'hover:bg-active [&>svg]:size-3.5',
        tone === 'danger' ? 'hover:text-danger' : 'hover:text-fg',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
