import type { RefObject } from "react";
import type { CameraFacing } from "../lib/camera";
import { CAPTURE_DELAYS, type CaptureDelay } from "../lib/settings";
import { BrandIcon } from "../icons";
import { Button, Heading, SegmentedControl } from "../ui";
import { SHOTS } from "../constants";
import type { Phase } from "../types";

// Vintage countdown: Ready (teal) → Set (mustard) → Go (orange).
const COUNTDOWN_COLOR: Record<number, string> = {
  3: "var(--color-teal)",
  2: "var(--color-mustard)",
  1: "var(--color-orange)",
};

/** Live camera + countdown + filling photo slots, with the shutter controls. */
export function CameraScreen({
  videoRef,
  phase,
  retakeIndex,
  countdown,
  flash,
  thumbs,
  delay,
  setDelay,
  cameraFacing,
  mirrorPreview,
  onToggleFacing,
  onToggleMirror,
  onStart,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  phase: Phase;
  retakeIndex: number | null;
  countdown: number | null;
  flash: boolean;
  thumbs: string[];
  delay: CaptureDelay;
  setDelay: (n: CaptureDelay) => void;
  cameraFacing: CameraFacing;
  mirrorPreview: boolean;
  onToggleFacing: () => void;
  onToggleMirror: () => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="relative aspect-square w-full overflow-hidden border-2 border-ink bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${mirrorPreview ? "-scale-x-100" : ""}`}
        />

        {phase === "capturing" && (
          <Heading
            as="div"
            size="sm"
            className="absolute left-2 top-2 flex items-center gap-2 border-2 border-ink bg-cream px-2 py-1 text-ink"
          >
            <span className="pulse inline-block h-2.5 w-2.5 rounded-full bg-orange" />
            {thumbs.length}/{SHOTS}
          </Heading>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              key={countdown}
              className="countpop font-display text-[14rem] leading-none"
              style={{
                color: COUNTDOWN_COLOR[countdown] ?? "var(--color-orange)",
                WebkitTextStroke: "5px var(--color-ink)",
                paintOrder: "stroke fill",
              }}
            >
              {countdown}
            </span>
          </div>
        )}

        {flash && <div className="flash absolute inset-0 bg-white" />}
      </div>

      {/* Filling photo slots */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {Array.from({ length: SHOTS }).map((_, i) => (
          <div
            key={i}
            className="aspect-square overflow-hidden border-2 border-ink bg-paper"
          >
            {thumbs[i] && (
              <img
                src={thumbs[i]}
                alt={`Shot ${i + 1}`}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 text-center">
        {phase === "preview" ? (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={onToggleFacing}
                className="border-2 border-ink bg-paper px-3 py-2 font-display text-base uppercase tracking-wide text-ink transition active:translate-y-px"
              >
                {cameraFacing === "user" ? "Front" : "Back"}
              </button>
              <button
                onClick={onToggleMirror}
                aria-pressed={mirrorPreview}
                className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                  mirrorPreview ? "bg-teal text-cream" : "bg-paper text-ink"
                }`}
              >
                Mirror
              </button>
            </div>
            <div className="mb-3 flex items-center justify-center gap-2">
              <Heading as="span" size="sm" className="text-brown">
                Countdown
              </Heading>
              <SegmentedControl
                label="Countdown seconds"
                value={delay}
                onChange={setDelay}
                options={CAPTURE_DELAYS.map((value) => ({
                  value,
                  label: `${value}s`,
                }))}
                itemClassName="flex min-h-[44px] items-center justify-center px-3 py-2.5 text-lg"
              />
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={onStart}>
              <BrandIcon name="camera" className="h-8 w-8 -translate-y-1" />
              {retakeIndex === null
                ? "Take Photos"
                : `Retake Shot ${retakeIndex + 1}`}
            </Button>
          </>
        ) : (
          <Heading as="p" size="xl" className="text-orange">
            Strike a pose!
          </Heading>
        )}
      </div>
    </div>
  );
}
