// Generate the source images that @capacitor/assets needs to produce the native
// iOS app icon set + splash screens. Run: npm run gen:cap-assets
//
// Output (assets/): icon-only.png (1024, opaque, padded so iOS corner-rounding
// never clips the wordmark), splash.png + splash-dark.png (2732, logo centered
// on the neutral app canvas). After this, copy the splash sources into Xcode.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const CREAM = "#f6e7cf";
const APP_CANVAS = "#f4f5f5";
const SQUARE = "brand/logo-square.png";
const WIDE = "brand/logo-wide.png";
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

// Splash: transparent horizontal wordmark on the same neutral canvas the app
// renders before React and while the native camera starts.
async function splash(name) {
  const size = 2732;
  // Capacitor scales this square source by viewport height on portrait phones.
  // A 34% mark remains comfortably inside even the narrowest supported screen.
  const inner = Math.round(size * 0.34);
  const logo = await sharp(WIDE)
    .trim()
    .resize({ width: inner, fit: "inside" })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: APP_CANVAS },
  })
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: APP_CANVAS })
    .png()
    .toFile(`${OUT}/${name}`);
  console.log(`wrote assets/${name} 2732x2732`);
}

await icon();
await splash("splash.png");
// Use one intentional light launch surface in both appearances.
await splash("splash-dark.png");
console.log("done");
