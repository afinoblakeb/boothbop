// Generate the source images that @capacitor/assets needs to produce the native
// iOS app icon set + splash screens. Run: npm run gen:cap-assets
//
// Output (assets/): icon-only.png (1024, opaque, padded so iOS corner-rounding
// never clips the wordmark), splash.png + splash-dark.png (2732, logo centered
// on cream). After this, `npx @capacitor/assets generate --ios` makes the rest.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const CREAM = "#f6e7cf";
const SQUARE = "brand/logo-square.png";
const OUT = "assets";

await mkdir(OUT, { recursive: true });

const squareArt = () => sharp(SQUARE).trim({ threshold: 12 });

// App icon: opaque cream square with the logo padded inside the safe area.
async function icon() {
  const size = 1024;
  const inner = Math.round(size * 0.72); // 14% margin each side
  const logo = await squareArt()
    .resize(inner, inner, { fit: "contain", background: CREAM })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: CREAM },
  })
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: CREAM })
    .png()
    .toFile(`${OUT}/icon-only.png`);
  console.log("wrote assets/icon-only.png 1024x1024");
}

// Splash: logo centered small on a large cream canvas.
async function splash(name) {
  const size = 2732;
  const inner = Math.round(size * 0.34);
  const logo = await squareArt()
    .resize(inner, inner, { fit: "contain", background: CREAM })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: CREAM },
  })
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: CREAM })
    .png()
    .toFile(`${OUT}/${name}`);
  console.log(`wrote assets/${name} 2732x2732`);
}

await icon();
await splash("splash.png");
// Brand is light; reuse the same cream splash for dark mode.
await splash("splash-dark.png");
console.log("done");
