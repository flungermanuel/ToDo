// Erzeugt das App-Icon aus dem Logo der Titelleiste: weißer Haken auf blauem Kreis.
// Ohne zusätzliche Libraries – gezeichnet wird Pixel für Pixel, PNG und ICO werden
// von Hand zusammengesetzt (Node bringt zlib für die Kompression mit).
//
// Aufruf: node scripts/make-icon.mjs  →  build/icon.png (512 px) und build/icon.ico
// Nur nötig, wenn sich das Logo ändert. Die Ergebnisse sind eingecheckt.

import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

// Farben wie --accent in globals.css, oben etwas heller für leichte Tiefe
const TOP = [0x33, 0x95, 0xff]
const BOTTOM = [0x00, 0x7a, 0xff]

// Haken wie das Lucide-Symbol "Check" (Pfad M20 6 9 17 4 12 im 24er-Raster),
// im Logo 12 px groß in einem 18 px-Kreis, Strichstärke 3.5
const CHECK = [
  [4, 12],
  [9, 17],
  [20, 6]
]
const CHECK_BOX = 12 / 18
const STROKE = 3.5

/** Zeichnet das Icon in Größe `size` und gibt RGBA-Pixel zurück */
function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const r = size / 2
  // Ein Rasterpunkt des 24er-Rasters in Pixeln, Haken mittig im Kreis
  const unit = (size * CHECK_BOX) / 24
  const offset = (size - 24 * unit) / 2
  const points = CHECK.map(([x, y]) => [offset + x * unit, offset + y * unit])
  const halfStroke = (STROKE * unit) / 2
  // Kantenglättung: pro Pixel 4×4 Abtastpunkte
  const S = 4

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let inCircle = 0
      let inCheck = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const x = px + (sx + 0.5) / S
          const y = py + (sy + 0.5) / S
          if ((x - r) ** 2 + (y - r) ** 2 > r * r) continue
          inCircle++
          if (distanceToPolyline(x, y, points) <= halfStroke) inCheck++
        }
      }
      const alpha = inCircle / (S * S)
      const white = inCircle === 0 ? 0 : inCheck / inCircle
      const t = py / (size - 1)
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c++) {
        const blue = TOP[c] + (BOTTOM[c] - TOP[c]) * t
        pixels[i + c] = Math.round(blue + (255 - blue) * white)
      }
      pixels[i + 3] = Math.round(alpha * 255)
    }
  }
  return pixels
}

function distanceToPolyline(x, y, points) {
  let min = Infinity
  for (let k = 0; k < points.length - 1; k++) {
    const [ax, ay] = points[k]
    const [bx, by] = points[k + 1]
    const dx = bx - ax
    const dy = by - ay
    // Nächster Punkt auf der Strecke (runde Enden wie stroke-linecap="round")
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
  }
  return min
}

// --- PNG ---

function png(size) {
  const raw = render(size)
  // Jede Zeile beginnt mit einem Filter-Byte (0 = keiner)
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // 8 Bit pro Kanal
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}

// --- ICO: Verzeichnis + eingebettete PNGs (seit Windows Vista erlaubt) ---

function ico(sizes) {
  const images = sizes.map(png)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // Typ 1 = Icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map((image, k) => {
    const entry = Buffer.alloc(16)
    entry[0] = sizes[k] % 256 // 256 wird als 0 gespeichert
    entry[1] = sizes[k] % 256
    entry.writeUInt16LE(1, 4) // Farbebenen
    entry.writeUInt16LE(32, 6) // Bit pro Pixel
    entry.writeUInt32LE(image.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += image.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images])
}

mkdirSync('build', { recursive: true })
writeFileSync('build/icon.png', png(512))
writeFileSync('build/icon.ico', ico([16, 24, 32, 48, 64, 128, 256]))
console.log('build/icon.png und build/icon.ico erzeugt')
