/**
 * Regenerates the MYSTOREY icon set and the Open Graph card from the master logo.
 *
 * Why this exists: the favicon shipped as a 520x520 / 321 KB PNG and the Apple touch
 * icon as a 1254x1254 / 894 KB PNG, both downloaded on every page, and social shares
 * used a square logo where the platforms expect a 1200x630 landscape card.
 *
 * Run with: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SOURCE_SQUARE = "public/images/favicon_logo.png"; // 1024x1024, transparent
const BRAND = "#7B3048";
const BRAND_DEEP = "#4F1D2D";
const PAPER = "#FFF9F3";

const icons = [
  { out: "public/icon-32.png", size: 32 },
  { out: "public/icon-192.png", size: 192 },
  { out: "public/icon-512.png", size: 512 },
  { out: "public/apple-icon.png", size: 180, flatten: PAPER }, // iOS ignores transparency
];

for (const { out, size, flatten } of icons) {
  let pipeline = sharp(SOURCE_SQUARE).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (flatten) pipeline = pipeline.flatten({ background: flatten });
  await pipeline.png({ compressionLevel: 9, palette: true }).toFile(out);
  console.log(`ok ${out} (${size}x${size})`);
}

// Open Graph / social card: 1200x630 is what WhatsApp, Facebook and X expect.
const OG_W = 1200;
const OG_H = 630;
const logo = await sharp(SOURCE_SQUARE).resize(148, 148, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

const card = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_DEEP}"/>
      <stop offset="100%" stop-color="${BRAND}"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>
  <circle cx="1060" cy="150" r="240" fill="${PAPER}" opacity="0.06"/>
  <circle cx="1140" cy="560" r="180" fill="${PAPER}" opacity="0.05"/>
  <rect x="96" y="300" width="72" height="4" rx="2" fill="${PAPER}" opacity="0.55"/>
  <text x="96" y="268" font-family="Georgia, 'Times New Roman', serif" font-size="34" letter-spacing="6" fill="${PAPER}" opacity="0.72">MYSTOREY</text>
  <text x="96" y="390" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="${PAPER}">Votre boutique,</text>
  <text x="96" y="476" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="${PAPER}">votre histoire.</text>
  <text x="96" y="546" font-family="'Segoe UI', Arial, sans-serif" font-size="28" fill="${PAPER}" opacity="0.78">Créez votre boutique et recevez vos commandes sur WhatsApp.</text>
</svg>`;

await sharp(Buffer.from(card))
  .composite([{ input: logo, top: 88, left: 952 }])
  .png({ compressionLevel: 9 })
  .toFile("public/og-card.png");
console.log(`ok public/og-card.png (${OG_W}x${OG_H})`);

const manifest = {
  name: "MYSTOREY",
  short_name: "MYSTOREY",
  description: "Créez votre boutique en ligne, présentez vos produits et recevez vos commandes sur WhatsApp.",
  lang: "fr",
  start_url: "/dashboard",
  scope: "/",
  display: "standalone",
  background_color: PAPER,
  theme_color: BRAND_DEEP,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
};
await writeFile("public/manifest.webmanifest", `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log("ok public/manifest.webmanifest");
