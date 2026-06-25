// Screenshot/demo helper — loads staged sample photos in as the four captured
// frames so we can render REAL strips/GIFs/video for App Store screenshots
// without a camera or posing. Gated behind a build flag in App.tsx (DEV or
// VITE_DEMO); the sample images live in public/demo/ (gitignored) and are NOT
// part of the production submission build.
import { CAPTURE_SIZE } from "./camera";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${url}`));
    img.src = url;
  });
}

// Center-crop to a square at the capture resolution, matching captureSquareFrame
// (minus the selfie mirror — staged images are already the right way round).
function toSquareCanvas(
  img: HTMLImageElement,
  size: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}

// Loads public/demo/set{n}-1.jpg … set{n}-4.jpg as four square frames.
export async function loadSampleFrames(
  setNum: number,
  size: number = CAPTURE_SIZE,
): Promise<HTMLCanvasElement[]> {
  const base = import.meta.env.BASE_URL;
  const urls = [1, 2, 3, 4].map((i) => `${base}demo/set${setNum}-${i}.jpg`);
  const imgs = await Promise.all(urls.map(loadImage));
  return imgs.map((img) => toSquareCanvas(img, size));
}
