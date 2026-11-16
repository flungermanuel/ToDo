import { useEffect, useState } from 'react'
import { ChevronsUpDown, RefreshCw } from 'lucide-react'
import type { AiStatus } from '@shared/capture'
import { cn } from '@renderer/lib/utils'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuTrigger
} from '@renderer/components/ui/Menu'

// Bereich "KI-Eingabe" in den Einstellungen: Status von Ollama, Modellwahl, Hinweis zum
// Datenschutz. Der Renderer kennt weder Adresse noch Modelllisten-Abfrage – alles über IPC.
export function AiSettings() {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [checking, setChecking] = useState(true)
  // Jede Erhöhung löst eine neue Prüfung aus ("Erneut prüfen", Modellwechsel)
  const [check, setCheck] = useState(0)

  // Prüft beim Öffnen der Seitenleiste und bei jeder Anforderung. Das Flag verhindert,
  // dass eine veraltete Antwort einen neueren Stand überschreibt.
  useEffect(() => {
    let current = true
    window.api.ai
      .getStatus()
      .then(
        (next) => current && setStatus(next),
        () => current && setStatus(null)
      )
      .finally(() => current && setChecking(false))
    return () => {
      current = false
    }
  }, [check])

  function refresh() {
    setChecking(true)
    setCheck((n) => n + 1)
  }

  async function chooseModel(model: string) {
    try {
      await window.api.ai.setModel(model)
    } finally {
      refresh()
    }
  }

  const installed = status?.models.includes(status.model) ?? false

  return (
    <section className="pb-2">
      <h2 className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
        KI-Eingabe
      </h2>

      <div className="flex items-center gap-2 px-3 py-1">
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            status === null ? 'bg-fg-subtle' : status.reachable ? 'bg-success' : 'bg-danger'
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1" role="status">
          {status === null
            ? 'Status unbekannt'
            : status.provider === 'fake'
              ? 'Testmodus (feste Antworten)'
              : status.reachable
                ? 'Ollama erreichbar'
                : 'Ollama nicht erreichbar'}
        </span>
        <IconButton label="Erneut prüfen" onClick={refresh} disabled={checking}>
          <RefreshCw className={cn(checking && 'animate-spin')} />
        </IconButton>
      </div>

      {status?.provider === 'ollama' && (
        <div className="flex items-center gap-2 px-3 py-1">
          <span className="text-fg-muted">Modell</span>
          <MenuRoot>
            <MenuTrigger
              disabled={!status.reachable || status.models.length === 0}
              className="ml-auto flex max-w-[60%] items-center gap-1 rounded-md px-2 py-1 outline-none hover:bg-hover disabled:opacity-60 data-[state=open]:bg-active"
              aria-label={`Modell: ${status.model}`}
            >
              <span className="truncate">{status.model}</span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" />
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Installierte Modelle</MenuLabel>
              <MenuRadioGroup value={status.model} onValueChange={(m) => void chooseModel(m)}>
                {status.models.map((model) => (
                  <MenuRadioItem key={model} value={model}>
                    {model}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </MenuRoot>
        </div>
      )}

      {status?.provider === 'ollama' && !status.reachable && (
        <p className="px-3 pt-1 text-xs leading-relaxed text-fg-muted">
          So richtest du es ein: Ollama von ollama.com installieren und starten, dann in der
          Eingabeaufforderung{' '}
          <code className="rounded bg-active px-1">ollama pull {status.model}</code> ausführen.
          Danach oben auf „Erneut prüfen“.
        </p>
      )}

      {status?.provider === 'ollama' && status.reachable && !installed && (
        <p className="px-3 pt-1 text-xs leading-relaxed text-danger">
          Das Modell „{status.model}“ ist nicht installiert. Lade es mit:{' '}
          <code className="rounded bg-active px-1">ollama pull {status.model}</code>
        </p>
      )}

      <p className="px-3 pt-1.5 text-xs leading-relaxed text-fg-muted">
        Die Analyse läuft lokal über Ollama. Deine Eingaben verlassen diesen Rechner nicht und
        werden weder gespeichert noch protokolliert.
      </p>
    </section>
  )
}
