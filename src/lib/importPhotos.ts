export const IMPORT_FRAME_COUNT = 4;

export function pickImportFiles(
  files: Iterable<File>,
  count: number = IMPORT_FRAME_COUNT,
): File[] {
  return Array.from(files)
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, count);
}

export function validateImportFiles(files: Iterable<File>): string | null {
  const picked = pickImportFiles(files);
  if (picked.length < IMPORT_FRAME_COUNT)
    return `Choose ${IMPORT_FRAME_COUNT} photos to import.`;
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't load ${file.name || "photo"}.`));
    };
    img.src = url;
  });
}

function imageToSquareCanvas(
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

export async function loadImportedFrames(
  files: Iterable<File>,
  size: number,
): Promise<HTMLCanvasElement[]> {
  const picked = pickImportFiles(files);
  const error = validateImportFiles(picked);
  if (error) throw new Error(error);
  const images = await Promise.all(picked.map(loadImage));
  return images.map((img) => imageToSquareCanvas(img, size));
}
