// Generate app icons + web logos from the brand artwork in brand/.
// Run with: npm run gen:assets
import sharp from "sharp";

const CREAM = "#f6e7cf"; // sampled from the logo artboard
const SQUARE = "brand/logo-square.png";
const WIDE = "brand/logo-wide.png";
const OUT = "public";

// The artwork is flat-colour, so an 8-bit palette PNG is far smaller than
// 24-bit with no visible loss — keeps the offline precache lean.
const PNG = { palette: true, colors: 256, effort: 10 };

// Trim the white print margin, leaving the cream artboard + design.
const squareArt = () => sharp(SQUARE).trim({ threshold: 12 });
const wideArt = () => sharp(WIDE).trim({ threshold: 12 });

async function icon(size, name, margin = 0.14) {
  // Pad the logo onto a cream square so iOS's rounded-corner mask (and Android's
  // icon shape) never clip the wordmark. `contain` keeps the whole mark visible;
  // the margin leaves a safe border on every side.
  const inner = Math.round(size * (1 - margin * 2));
  const logo = await squareArt()
    .resize(inner, inner, { fit: "contain", background: CREAM })
    .png(PNG)
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: CREAM },
  })
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: CREAM })
    .png(PNG)
    .toFile(`${OUT}/${name}`);
  console.log("wrote", name, `${size}x${size}`);
}

async function maskable() {
  // Padded so Android's circular/safe-zone mask doesn't crop the wordmark.
  const inner = 400;
  const buf = await squareArt()
    .resize(inner, inner, { fit: "cover" })
    .png(PNG)
    .toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: CREAM,
    },
  })
    .composite([{ input: buf, gravity: "center" }])
    .png(PNG)
    .toFile(`${OUT}/icon-512-maskable.png`);
  console.log("wrote icon-512-maskable.png 512x512");
}

async function wideLogo() {
  await wideArt()
    .resize({ width: 700 }) // displays ~320px wide; 700 covers 2x screens
    .png(PNG)
    .toFile(`${OUT}/logo-wide.png`);
  console.log("wrote logo-wide.png w=700");
}

async function ogImage() {
  const w = 1200,
    h = 630;
  const logo = await wideArt().resize({ width: 980 }).png(PNG).toBuffer();
  await sharp({
    create: { width: w, height: h, channels: 3, background: CREAM },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png(PNG)
    .toFile(`${OUT}/og-image.png`);
  console.log("wrote og-image.png 1200x630");
}

// UI icons: knock the cream background out to transparent so they sit on any
// button colour, trim, and pad to a square.
async function uiIcon(name, size = 256) {
  const src = `brand/icons/src-${name}.png`;
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const bg = [data[0], data[1], data[2]]; // cream, sampled from the corner
  const th = 72; // chroma-key tolerance
  for (let i = 0; i < data.length; i += ch) {
    const dr = data[i] - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    if (dr * dr + dg * dg + db * db < th * th) data[i + 3] = 0;
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .trim()
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ palette: true, effort: 10 })
    .toFile(`${OUT}/ic-${name}.png`);
  console.log("wrote", `ic-${name}.png`, `${size}x${size}`);
}

// Transparent horizontal wordmark for GIF/video. The source is anti-aliased
// against a cream gradient, so a hard chroma key leaves a dirty cream fringe.
// Reconstruct clean ink/orange pixels with alpha derived from their contrast.
async function watermark() {
  const { data, info } = await sharp(WIDE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const orange = r > g * 1.35 && r > b * 1.8;
    const rawAlpha = orange ? (chroma - 28) / 170 : (218 - luminance) / 180;
    const alpha = Math.max(0, Math.min(1, rawAlpha));

    data[i] = orange ? 238 : 17;
    data[i + 1] = orange ? 78 : 17;
    data[i + 2] = orange ? 12 : 17;
    data[i + 3] = Math.round(alpha * 255);
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .trim()
    // Full-colour (NOT palette) so the logo's anti-aliased edges stay crisp when
    // composited onto the strip / GIF / video. Higher res gives headroom for the
    // larger draws. (Palette quantization here was softening the strip + GIF.)
    .resize({ width: 1440 })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/watermark.png`);
  console.log("wrote watermark.png (clean alpha, w=1440)");
}

await icon(512, "icon-512.png");
await icon(192, "icon-192.png");
await icon(180, "apple-touch-icon.png");
await icon(32, "favicon-32.png");
await maskable();
await wideLogo();
await ogImage();
await uiIcon("camera");
await uiIcon("gallery");
await uiIcon("install");
await watermark();
console.log("done");
