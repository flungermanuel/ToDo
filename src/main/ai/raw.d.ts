// Vite kann Dateien als Text einbinden (`import text from './datei.md?raw'`).
declare module '*?raw' {
  const content: string
  export default content
}
