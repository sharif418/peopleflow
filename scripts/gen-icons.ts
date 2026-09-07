// Generate PWA PNG icons from the SVG mark (run: bun scripts/gen-icons.ts)
import sharp from "sharp"

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="g" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#046c4e"/><stop offset="1" stop-color="#0aa27c"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="12" fill="url(#g)"/>
  <path d="M9 36.5 C 17 34, 21 28, 24 21.5 C 26.5 16, 31 12.5, 39 11" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity="0.55" fill="none"/>
  <circle cx="13" cy="33.5" r="4" fill="#fff" opacity="0.75"/>
  <circle cx="24" cy="23.5" r="5" fill="#fff" opacity="0.88"/>
  <circle cx="36.5" cy="12.5" r="6.2" fill="#fff"/>
</svg>`)

async function make(size: number, file: string, padding = 0) {
  const canvas = size + padding * 2
  const base = await sharp(svg).resize(size, size).png().toBuffer()
  await sharp({
    create: { width: canvas, height: canvas, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  })
    .composite([{ input: base, gravity: "center" }])
    .png()
    .toFile(file)
  console.log("✓", file)
}

await make(192, "public/icons/icon-192.png")
await make(512, "public/icons/icon-512.png")
await make(512, "public/icons/icon-maskable-512.png", 40) // safe zone padding for maskable
await sharp(svg).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png")
console.log("✓ public/icons/apple-touch-icon.png")
