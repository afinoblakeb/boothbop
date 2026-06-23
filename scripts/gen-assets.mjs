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

async function icon(size, name) {
  await squareArt()
    .resize(size, size, { fit: "cover" })
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
  await sharp({ create: { width: w, height: h, channels: 3, background: CREAM } })
    .composite([{ input: logo, gravity: "center" }])
    .png(PNG)
    .toFile(`${OUT}/og-image.png`);
  console.log("wrote og-image.png 1200x630");
}

await icon(512, "icon-512.png");
await icon(192, "icon-192.png");
await icon(180, "apple-touch-icon.png");
await icon(32, "favicon-32.png");
await maskable();
await wideLogo();
await ogImage();
console.log("done");
