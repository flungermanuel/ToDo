import { useState, type ReactNode } from 'react'
import { Download, Upload } from 'lucide-react'
import type { ReadyImportPreview } from '@shared/ipc'
import {
  confirmImport,
  describeSummary,
  exportData,
  pickImportFile
} from '@renderer/state/dataTransfer'
import { Dialog, DialogButton } from '@renderer/components/ui/Dialog'

// Bereich "Einstellungen" unten in der Seitenleiste: Daten exportieren und importieren.
// Vor dem Import wird nachgefragt, weil er alle aktuellen Daten ersetzt.
export function DataSettings() {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<ReadyImportPreview | null>(null)

  async function run(task: () => Promise<void>) {
    setBusy(true)
    try {
      await task()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2 className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
        Einstellungen
      </h2>
      <SettingsButton
        icon={<Download className="size-4" />}
        disabled={busy}
        onClick={() => run(exportData)}
      >
        Daten exportieren …
      </SettingsButton>
      <SettingsButton
        icon={<Upload className="size-4" />}
        disabled={busy}
        onClick={() => run(async () => setPreview(await pickImportFile()))}
      >
        Daten importieren …
      </SettingsButton>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        title="Daten importieren?"
        description={
          preview && (
            <>
              „{preview.fileName}“ enthält {describeSummary(preview.summary)}. Deine aktuellen Daten
              werden dadurch ersetzt. Vorher wird automatisch eine Sicherung angelegt.
            </>
          )
        }
        footer={
          <>
            <DialogButton onClick={() => setPreview(null)}>Abbrechen</DialogButton>
            <DialogButton
              variant="danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await confirmImport()
                  setPreview(null)
                })
              }
            >
              Ersetzen
            </DialogButton>
          </>
        }
      />
    </section>
  )
}

interface SettingsButtonProps {
  icon: ReactNode
  onClick: () => void
  disabled: boolean
  children: ReactNode
}

function SettingsButton({ icon, onClick, disabled, children }: SettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-hover disabled:opacity-50"
    >
      <span className="text-fg-muted">{icon}</span>
      {children}
    </button>
  )
}
