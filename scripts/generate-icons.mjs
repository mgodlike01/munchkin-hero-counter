import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true })
const source = await readFile(new URL('../public/icon.svg', import.meta.url))
const output = (relative) => fileURLToPath(new URL(relative, import.meta.url))
await Promise.all([
  ...[192, 512].map((size) => sharp(source).resize(size, size).png().toFile(output(`../public/icons/icon-${size}.png`))),
  sharp(source).resize(180, 180).png().toFile(output('../public/apple-touch-icon.png')),
  sharp(source).resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#f2dfb5' }).png().toFile(output('../public/icons/maskable-512.png')),
  sharp(source).resize(180, 180).png().toFile(output('../public/apple-touch-icon-hero-v2.png')),
  ...[192, 512].map((size) => sharp(source).resize(size, size).png().toFile(output(`../public/icons/hero-v2-${size}.png`))),
  sharp(source).resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#f2dfb5' }).png().toFile(output('../public/icons/hero-v2-maskable-512.png')),
])
console.log('Generated opaque 192/512px, maskable 512px and Apple 180px icons, including versioned hero-v2 filenames.')
