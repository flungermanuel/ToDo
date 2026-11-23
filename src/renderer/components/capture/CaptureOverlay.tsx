import { AnimatePresence, motion } from 'motion/react'
import { Dialog as RadixDialog } from 'radix-ui'
import { Loader2, Sparkles } from 'lucide-react'
import { canApply } from '@core/index'
import type { AppData } from '@shared/types'
import { captureActions, useCapture } from '@renderer/state/captureStore'
import { cn } from '@renderer/lib/utils'
import { DialogButton } from '@renderer/components/ui/Dialog'
import { CaptureCardView } from './CaptureCardView'

interface CaptureOverlayProps {
  data: AppData
}

// Schnellleiste (Strg+Leerzeichen) und Vorschau in einem: zentriertes Overlay mit Eingabefeld oben,
// darunter je nach Phase Hinweis, Ladezustand oder die Vorschau-Karten.
// Esc bricht eine laufende Analyse ab; sonst verwirft Esc die Vorschau (der Text bleibt).
export function CaptureOverlay({ data }: CaptureOverlayProps) {
  const capture = useCapture()
  const { phase, cards } = capture
  const ready = canApply(cards)

  // Enter im Eingabefeld: Text unverändert seit der Analyse → übernehmen, sonst (neu) analysieren
  function onInputEnter() {
    if (phase === 'preview' && capture.text.trim() === capture.analyzedText) {
      if (ready) captureActions.apply()
      return
    }
    void captureActions.submit()
  }

  return (
    <RadixDialog.Root
      open={capture.open}
      onOpenChange={(open) => {
        if (!open) captureActions.close()
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40" />
        <RadixDialog.Content
          asChild
          // Esc während der Analyse bricht nur ab, das Overlay bleibt offen
          onEscapeKeyDown={(e) => {
            if (phase === 'analyzing') {
              e.preventDefault()
              captureActions.cancel()
            }
          }}
          aria-describedby={undefined}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[min(580px,calc(100vw-32px))] -translate-x-1/2 flex-col rounded-card border border-separator bg-surface shadow-card"
          >
            <RadixDialog.Title className="sr-only">KI-Eingabe</RadixDialog.Title>

            <div className="flex items-center gap-3 px-4 py-3">
              <Sparkles className="size-[18px] shrink-0 text-accent" strokeWidth={2} />
              <input
                autoFocus
                value={capture.text}
                onChange={(e) => captureActions.setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onInputEnter()
                  }
                }}
                placeholder="Schreib einfach los …"
                aria-label="Freitext für neue Einträge"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
              />
            </div>

            <div className={cn('min-h-0 overflow-y-auto border-t border-separator px-4 py-3')}>
              {phase === 'idle' && (
                <p className="text-fg-muted">
                  Zum Beispiel: „Freitag Abgabe Statistik, Mama anrufen, Prüfung Analysis am 12.
                  Februar“. Mit Enter analysieren, danach bestätigst du jeden Eintrag.
                </p>
              )}

              {phase === 'analyzing' && (
                <div className="flex items-center gap-2.5 text-fg-muted" role="status">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Analysiere …</span>
                  <span className="flex-1" />
                  <span className="text-xs text-fg-subtle">Esc zum Abbrechen</span>
                  <DialogButton onClick={captureActions.cancel}>Abbrechen</DialogButton>
                </div>
              )}

              {phase === 'preview' && (
                <div className="flex flex-col gap-2.5">
                  {capture.notice && (
                    <p
                      className={cn(
                        'text-[13px]',
                        capture.failed ? 'text-danger' : 'text-fg-muted'
                      )}
                    >
                      {capture.notice}
                    </p>
                  )}
                  <AnimatePresence initial={false}>
                    {cards.map((card) => (
                      <motion.div
                        key={card.key}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
                      >
                        <CaptureCardView
                          card={card}
                          categories={data.categories}
                          onSubmit={() => ready && captureActions.apply()}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {cards.length === 0 && (
                    <div>
                      <DialogButton onClick={captureActions.addFallbackCard}>
                        Trotzdem als Todo anlegen
                      </DialogButton>
                    </div>
                  )}
                </div>
              )}
            </div>

            {phase === 'preview' && (
              <div className="flex items-center justify-end gap-2 border-t border-separator px-4 py-3">
                <DialogButton onClick={captureActions.close}>Verwerfen</DialogButton>
                <DialogButton variant="primary" disabled={!ready} onClick={captureActions.apply}>
                  {cards.length > 1 ? `${cards.length} Einträge übernehmen` : 'Übernehmen'}
                </DialogButton>
              </div>
            )}
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
