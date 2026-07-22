export type FilterId =
  | "original"
  | "warm"
  | "cool"
  | "bw"
  | "sepia"
  | "inverse";

export interface FilterDefinition {
  id: FilterId;
  label: string;
}

export const FILTERS: readonly FilterDefinition[] = [
  { id: "original", label: "Original" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "bw", label: "B&W" },
  { id: "sepia", label: "Sepia" },
  { id: "inverse", label: "Inverse" },
];

export function configureHighQualityScaling(
  ctx: CanvasRenderingContext2D,
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

/** Apply one deterministic color recipe while preserving every alpha byte. */
export function applyFilterToRgba(
  input: Uint8ClampedArray,
  filter: FilterId,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(input);
  if (filter === "original") return output;

  for (let i = 0; i < output.length; i += 4) {
    const r = input[i];
    const g = input[i + 1];
    const b = input[i + 2];

    if (filter === "warm") {
      output[i] = r * 1.12 + g * 0.04;
      output[i + 1] = g * 1.02;
      output[i + 2] = b * 0.86;
    } else if (filter === "cool") {
      output[i] = r * 0.86;
      output[i + 1] = g * 1.01;
      output[i + 2] = b * 1.12 + g * 0.03;
    } else if (filter === "bw") {
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      output[i] = luminance;
      output[i + 1] = luminance;
      output[i + 2] = luminance;
    } else if (filter === "sepia") {
      output[i] = r * 0.393 + g * 0.769 + b * 0.189;
      output[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
      output[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
    } else {
      output[i] = 255 - r;
      output[i + 1] = 255 - g;
      output[i + 2] = 255 - b;
    }
  }
  return output;
}

/** Apply a look to an already-drawn rectangular canvas region. */
export function filterCanvasRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  filter: FilterId,
): void {
  if (filter === "original") return;
  const image = ctx.getImageData(x, y, width, height);
  image.data.set(applyFilterToRgba(image.data, filter));
  ctx.putImageData(image, x, y);
}

/** Scale and draw a photo, then apply its look before any branding is added. */
export function drawFilteredFrame(
  ctx: CanvasRenderingContext2D,
  frame: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  filter: FilterId,
): void {
  configureHighQualityScaling(ctx);
  ctx.drawImage(frame, 0, 0, frame.width, frame.height, x, y, width, height);
  filterCanvasRegion(ctx, x, y, width, height, filter);
}

/** Render a small, real preview using the same CPU recipe as exported media. */
export function createFilterPreview(
  sourceUrl: string,
  filter: FilterId,
  size = 88,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      configureHighQualityScaling(ctx);
      ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, size, size);
      filterCanvasRegion(ctx, 0, 0, size, size, filter);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Preview image failed to load"));
    image.src = sourceUrl;
  });
}
