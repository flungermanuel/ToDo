import { Sparkles } from 'lucide-react'
import { captureActions, useCapture } from '@renderer/state/captureStore'

// Festes Eingabefeld im Todo-Widget. Enter startet die Analyse; die Vorschau erscheint
// im Overlay (CaptureOverlay). Der Text bleibt stehen, bis man ihn selbst löscht.
export function CaptureInput() {
  const { text } = useCapture()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void captureActions.submit()
      }}
      className="mx-4 mb-1 flex items-center gap-2.5 rounded-lg bg-hover px-3 py-1.5 transition-colors focus-within:bg-active"
    >
      <Sparkles className="size-4 shrink-0 text-accent" strokeWidth={2} />
      <input
        value={text}
        onChange={(e) => captureActions.setText(e.target.value)}
        placeholder="Schreib einfach los …"
        aria-label="Freitext für neue Einträge"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
      />
      <button type="submit" hidden />
    </form>
  )
}
