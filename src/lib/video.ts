// Record the 4 frames into a short looping video via canvas + MediaRecorder.
import { drawWatermark } from "./watermark";

export interface VideoOptions {
  size?: number; // output dimension (square)
  frameMs?: number; // how long each photo stays on screen
  loops?: number; // how many times to cycle through the 4 photos
  watermark?: boolean; // brand watermark bottom-right (paid feature removes it)
  watermarkImg?: HTMLImageElement | null; // preloaded logo
}

export interface VideoResult {
  blob: Blob;
  extension: string; // "mp4" or "webm"
}

/** Pick the best video container/codec the browser will actually record. */
export function pickMimeType(): { mimeType: string; extension: string } | null {
  const candidates: { mimeType: string; extension: string }[] = [
    { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c.mimeType)) return c;
  }
  return null;
}

export function isVideoSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    pickMimeType() !== null
  );
}

export async function encodeVideo(
  frames: HTMLCanvasElement[],
  {
    size = 720,
    frameMs = 600,
    loops = 2,
    watermark = true,
    watermarkImg = null,
  }: VideoOptions = {},
): Promise<VideoResult> {
  const picked = pickMimeType();
  if (!picked) throw new Error("Video recording isn't supported here.");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const draw = (frame: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(frame, 0, 0, frame.width, frame.height, 0, 0, size, size);
    if (watermark) drawWatermark(ctx, size, size, watermarkImg);
  };
  draw(frames[0]);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: picked.mimeType,
    videoBitsPerSecond: 6_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<VideoResult>((resolve) => {
    recorder.onstop = () =>
      resolve({
        blob: new Blob(chunks, { type: picked.mimeType }),
        extension: picked.extension,
      });
  });

  recorder.start();

  // Stretch guard: MediaRecorder is wall-clock timed, but a backgrounded app
  // freezes the canvas and throttles timers — which would otherwise produce a
  // tens-of-seconds clip of a frozen frame. Stop the instant we're hidden, and
  // cap the total duration as a backstop.
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (recorder.state !== "inactive") recorder.stop();
  };
  const onHidden = () => {
    if (document.visibilityState === "hidden") stop();
  };
  document.addEventListener("visibilitychange", onHidden);
  const deadline = setTimeout(stop, loops * frames.length * frameMs + 1500);

  const sequence: HTMLCanvasElement[] = [];
  for (let l = 0; l < loops; l++) sequence.push(...frames);
  for (const frame of sequence) {
    if (stopped) break;
    draw(frame);
    await wait(frameMs);
  }

  clearTimeout(deadline);
  document.removeEventListener("visibilitychange", onHidden);
  stop();
  return done;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
