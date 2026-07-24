import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { Timer, X } from "lucide-react";
import { Button, Heading, SegmentedControl } from "../ui";
import { SHOTS } from "../constants";
import type { Phase } from "../types";

// Vintage countdown: Ready (teal) → Set (mustard) → Go (orange).
const COUNTDOWN_COLOR: Record<number, string> = {
  3: "var(--color-teal)",
  2: "var(--color-mustard)",
  1: "var(--color-orange)",
};

function CapturedPhotoPreview({ frame }: { frame: HTMLCanvasElement }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = frame.width;
    canvas.height = frame.height;
    context.drawImage(frame, 0, 0);
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Captured photo preview"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

/** Live camera + countdown + filling photo slots, with the shutter controls. */
export function CameraScreen({
  videoRef,
  phase,
  countdown,
  freezeFrame,
  thumbs,
  delay,
  setDelay,
  onStart,
  onCancel,
  retakeIndex,
  nativePreview,
  nativeShell,
  cameraError,
  onRetry,
  demoPreviewSrc,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  phase: Phase;
  countdown: number | null;
  freezeFrame: HTMLCanvasElement | null;
  thumbs: string[];
  delay: number;
  setDelay: (n: number) => void;
  onStart: () => void;
  onCancel: () => void;
  retakeIndex: number | null;
  nativePreview: boolean;
  nativeShell: boolean;
  cameraError: string | null;
  onRetry: () => void;
  demoPreviewSrc: string | null;
}) {
  return (
    <div className="camera-screen flex min-h-0 flex-1 flex-col py-3">
      <span role="status" aria-live="assertive" className="sr-only">
        {countdown !== null
          ? `${countdown}`
          : phase === "capturing"
            ? retakeIndex === null
              ? `Captured ${thumbs.length} of ${SHOTS}`
              : `Retaking photo ${retakeIndex + 1}`
            : "Camera ready"}
      </span>
      <section
        aria-label="Camera preview"
        className={`-mx-4 shrink-0 px-4 py-3 ${
          nativePreview ? "bg-transparent" : "bg-surface-inverse shadow-overlay"
        }`}
      >
        <div
          className={`camera-preview relative aspect-square w-full shrink-0 overflow-hidden rounded-md border border-editor-border shadow-overlay ${
            nativePreview ? "bg-transparent" : "bg-editor"
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full -scale-x-100 object-cover ${
              nativePreview ? "opacity-0" : ""
            }`}
          />

          {demoPreviewSrc && (
            <img
              src={demoPreviewSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {freezeFrame && <CapturedPhotoPreview frame={freezeFrame} />}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-editor px-6 text-center text-text-inverse">
              <p className="font-sans text-sm font-medium">{cameraError}</p>
              <Button variant="primary" onClick={onRetry}>
                Try Camera Again
              </Button>
            </div>
          )}

          {phase === "capturing" && (
            <div className="absolute left-2 top-2 flex min-h-9 items-center gap-2 rounded-full bg-editor/80 px-3 font-sans text-xs font-semibold text-text-inverse shadow-control backdrop-blur-md">
              <span className="pulse inline-block h-2 w-2 rounded-full bg-accent" />
              {retakeIndex === null
                ? `${thumbs.length} of ${SHOTS}`
                : `Retaking ${retakeIndex + 1} of ${SHOTS}`}
            </div>
          )}

          {(!nativeShell || phase === "capturing" || retakeIndex !== null) && (
            <button
              type="button"
              aria-label="Cancel"
              title="Cancel"
              onClick={onCancel}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-editor/80 text-text-inverse shadow-control outline-none backdrop-blur-md transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-editor active:bg-editor"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {countdown !== null && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                key={countdown}
                className="countpop font-display text-[10rem] leading-none"
                style={{
                  color: COUNTDOWN_COLOR[countdown] ?? "var(--color-orange)",
                  WebkitTextStroke: "4px var(--color-ink)",
                  paintOrder: "stroke fill",
                }}
              >
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* Filling photo slots */}
        <div className="camera-thumbs mt-2 grid shrink-0 grid-cols-4 gap-2">
          {Array.from({ length: SHOTS }).map((_, i) => (
            <div
              key={i}
              className={`relative aspect-square overflow-hidden rounded-md border bg-editor-surface ${
                retakeIndex === i
                  ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-editor"
                  : "border-editor-border"
              }`}
            >
              {thumbs[i] ? (
                <img
                  src={thumbs[i]}
                  alt={`Shot ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center font-sans text-xs font-semibold text-editor-muted"
                >
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="camera-controls mt-auto pt-3 text-center">
        {cameraError ? null : phase === "preview" ? (
          <>
            <div className="camera-countdown mb-2 flex flex-col items-center justify-center gap-1">
              <span className="flex items-center gap-1.5 font-sans text-sm font-medium text-text-muted">
                <Timer className="h-4 w-4" aria-hidden="true" />
                Countdown
              </span>
              <SegmentedControl
                label="Countdown seconds"
                value={delay}
                onChange={setDelay}
                options={[
                  { value: 1, label: "1s" },
                  { value: 2, label: "2s" },
                  { value: 3, label: "3s" },
                ]}
                itemClassName="flex min-h-[44px] items-center justify-center px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={onStart}
              aria-label={
                retakeIndex === null
                  ? "Take Photos"
                  : `Retake Photo ${retakeIndex + 1}`
              }
              className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 border-surface bg-transparent p-1 shadow-overlay outline-none ring-1 ring-border-strong transition focus-visible:ring-4 focus-visible:ring-accent/40 active:scale-95"
            >
              <span className="h-full w-full rounded-full bg-accent transition active:bg-accent-strong" />
            </button>
            <p className="mt-1 font-sans text-sm font-semibold text-text">
              {retakeIndex === null
                ? "Take Photos"
                : `Retake Photo ${retakeIndex + 1}`}
            </p>
          </>
        ) : (
          <Heading as="p" size="xl" variant="brand" className="text-accent">
            Strike a pose!
          </Heading>
        )}
      </div>
    </div>
  );
}
