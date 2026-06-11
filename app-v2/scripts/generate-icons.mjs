// One-off icon generator: renders the app mark SVG to the PNG sizes iOS/PWA
// need. Run `npm run icons` after changing the mark; PNGs are committed.
import sharp from 'sharp';
import { mkdir } from 'fs/promises';

// North-star mark on a deep navy gradient. `scale` shrinks the mark into the
// maskable safe zone for the maskable variant.
function iconSvg(scale = 1) {
  const s = 512;
  const c = s / 2;
  const arm = 170 * scale; // star half-height
  const waist = 32 * scale; // star half-width at the waist
  const ring = 178 * scale;
  return `
<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#131c2b"/>
      <stop offset="1" stop-color="#0a0e13"/>
    </linearGradient>
    <linearGradient id="star" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8df2e0"/>
      <stop offset="1" stop-color="#2dd4bf"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <circle cx="${c}" cy="${c}" r="${ring}" fill="none" stroke="rgba(125,240,220,0.16)" stroke-width="${10 * scale}"/>
  <path fill="url(#star)" d="
    M ${c} ${c - arm}
    C ${c + waist * 0.4} ${c - waist * 1.6} ${c + waist * 1.6} ${c - waist * 0.4} ${c + arm} ${c}
    C ${c + waist * 1.6} ${c + waist * 0.4} ${c + waist * 0.4} ${c + waist * 1.6} ${c} ${c + arm}
    C ${c - waist * 0.4} ${c + waist * 1.6} ${c - waist * 1.6} ${c + waist * 0.4} ${c - arm} ${c}
    C ${c - waist * 1.6} ${c - waist * 0.4} ${c - waist * 0.4} ${c - waist * 1.6} ${c} ${c - arm}
    Z"/>
  <circle cx="${c + 118 * scale}" cy="${c - 118 * scale}" r="${14 * scale}" fill="#8df2e0" opacity="0.85"/>
</svg>`;
}

await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true });

const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;
const std = Buffer.from(iconSvg(1));
const maskable = Buffer.from(iconSvg(0.72));

await sharp(std).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
await sharp(std).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(std).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(maskable).resize(512, 512).png().toFile(out('icon-512-maskable.png'));

console.log('icons written to public/icons/');
