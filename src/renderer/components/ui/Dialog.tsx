import type { ReactNode } from 'react'
import { Dialog as RadixDialog } from 'radix-ui'
import { motion } from 'motion/react'
import { cn } from '@renderer/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children?: ReactNode
  /** Knöpfe unten rechts */
  footer: ReactNode
}

// Kleiner Bestätigungsdialog im macOS-Stil. Radix kümmert sich um Fokus,
// Escape zum Schließen und darum, dass der Rest der App solange gesperrt ist.
export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40" />
        <RadixDialog.Content
          asChild
          // Kein automatischer Fokus aufs erste Element – sonst ist z. B. "Löschen" vorausgewählt
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 z-50 w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-card border border-separator bg-surface p-5 shadow-card"
          >
            <RadixDialog.Title className="text-[15px] font-semibold tracking-tight">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1.5 text-fg-muted">
                {description}
              </RadixDialog.Description>
            )}
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-5 flex justify-end gap-2">{footer}</div>
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

interface DialogButtonProps {
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}

export function DialogButton({
  onClick,
  children,
  variant = 'default',
  disabled
}: DialogButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 rounded-md px-3 text-[13px] font-medium transition-colors disabled:opacity-40',
        variant === 'default' && 'border border-separator bg-surface hover:bg-hover',
        variant === 'primary' && 'bg-accent text-white hover:brightness-110',
        variant === 'danger' && 'bg-danger text-white hover:brightness-110'
      )}
    >
      {children}
    </button>
  )
}
