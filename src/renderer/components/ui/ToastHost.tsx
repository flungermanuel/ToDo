import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { hideToast, useToast } from '@renderer/state/toastStore'
import { cn } from '@renderer/lib/utils'
import { IconButton } from './IconButton'

// Zeigt den aktuellen Hinweis als kleine Kapsel unten in der Mitte des Fensters.
export function ToastHost() {
  const toast = useToast()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
      // Screenreader lesen neue Hinweise vor
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="pointer-events-auto flex max-w-[min(480px,calc(100vw-32px))] items-center gap-3 rounded-full border border-separator bg-surface py-1.5 pr-1.5 pl-4 shadow-card"
          >
            <span
              className={cn(
                'min-w-0 truncate text-[13px]',
                toast.tone === 'danger' && 'text-danger'
              )}
            >
              {toast.message}
            </span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run()
                  hideToast(toast.id)
                }}
                className="shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium text-accent hover:bg-hover"
              >
                {toast.action.label}
              </button>
            )}
            <IconButton
              label="Schließen"
              onClick={() => hideToast(toast.id)}
              className="rounded-full"
            >
              <X />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
