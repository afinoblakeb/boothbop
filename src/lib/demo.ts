// Screenshot/demo helper — loads staged sample photos in as the four captured
// frames so we can render REAL strips/GIFs/video for App Store screenshots
// without a camera or posing. Gated behind a build flag in App.tsx (DEV or
// VITE_DEMO); the sample images live in src/demo/ and are only bundled with the
// dev/demo loader.
import { CAPTURE_SIZE } from "./camera";
import type { Session } from "./gallery";

const SAMPLE_SETS: Record<number, string[]> = {
  1: [
    new URL("../demo/set1-1.jpg", import.meta.url).href,
    new URL("../demo/set1-2.jpg", import.meta.url).href,
    new URL("../demo/set1-3.jpg", import.meta.url).href,
    new URL("../demo/set1-4.jpg", import.meta.url).href,
  ],
  2: [
    new URL("../demo/set2-1.jpg", import.meta.url).href,
    new URL("../demo/set2-2.jpg", import.meta.url).href,
    new URL("../demo/set2-3.jpg", import.meta.url).href,
    new URL("../demo/set2-4.jpg", import.meta.url).href,
  ],
  3: [
    new URL("../demo/set3-1.jpg", import.meta.url).href,
    new URL("../demo/set3-2.jpg", import.meta.url).href,
    new URL("../demo/set3-3.jpg", import.meta.url).href,
    new URL("../demo/set3-4.jpg", import.meta.url).href,
  ],
};

const SAMPLE_TITLES: Record<number, string> = {
  1: "Demo: Birthday",
  2: "Demo: Night Out",
  3: "Demo: Friends",
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${url}`));
    img.src = url;
  });
}

async function loadBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Couldn't load ${url}`);
  return response.blob();
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

// Loads one staged set as four square frames.
export async function loadSampleFrames(
  setNum: number,
  size: number = CAPTURE_SIZE,
): Promise<HTMLCanvasElement[]> {
  const urls = SAMPLE_SETS[setNum];
  if (!urls) throw new Error(`Unknown demo set ${setNum}`);
  const imgs = await Promise.all(urls.map(loadImage));
  return imgs.map((img) => toSquareCanvas(img, size));
}

export async function loadSampleSessions(): Promise<Session[]> {
  const entries = Object.entries(SAMPLE_SETS);
  const now = Date.now();
  return Promise.all(
    entries.map(async ([rawSetNum, urls], index) => {
      const setNum = Number(rawSetNum);
      return {
        id: `demo-${setNum}`,
        createdAt: now - index * 60_000,
        title: SAMPLE_TITLES[setNum],
        favorite: true,
        photos: await Promise.all(urls.map(loadBlob)),
      };
    }),
  );
}

export function isDemoSession(session: Session): boolean {
  return session.id.startsWith("demo-");
}
