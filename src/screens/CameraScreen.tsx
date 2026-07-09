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
  demoPreviewUrl,
  countdown,
  flash,
  thumbs,
  delay,
  setDelay,
  captureSound,
  cameraFacing,
  mirrorPreview,
  partyMode,
  onToggleFacing,
  onToggleMirror,
  onToggleSound,
  onStart,
  onCancel,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  phase: Phase;
  retakeIndex: number | null;
  demoPreviewUrl: string | null;
  countdown: number | null;
  flash: boolean;
  thumbs: string[];
  delay: CaptureDelay;
  setDelay: (n: CaptureDelay) => void;
  captureSound: boolean;
  cameraFacing: CameraFacing;
  mirrorPreview: boolean;
  partyMode: boolean;
  onToggleFacing: () => void;
  onToggleMirror: () => void;
  onToggleSound: () => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const isDemo = demoPreviewUrl !== null;
  const liveStatus =
    countdown !== null
      ? `Photo in ${countdown}`
      : phase === "capturing"
        ? `Captured ${thumbs.length} of ${SHOTS} photos`
        : "Camera ready";
  return (
    <div className="flex flex-1 flex-col py-4">
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {liveStatus}
      </p>
      <div className="relative aspect-square w-full overflow-hidden border-2 border-ink bg-ink">
        {demoPreviewUrl ? (
          <img
            src={demoPreviewUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${mirrorPreview ? "-scale-x-100" : ""}`}
          />
        )}

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

        <button
          onClick={onCancel}
          aria-label={phase === "capturing" ? "Stop capture" : "Cancel camera"}
          className="absolute right-2 top-2 min-h-10 border-2 border-ink bg-cream px-3 font-display text-base uppercase tracking-wide text-ink transition active:translate-y-px"
        >
          {phase === "capturing" ? "Stop" : "Cancel"}
        </button>

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
            {partyMode ? (
              <div className="mb-3 border-2 border-ink bg-paper px-3 py-2 text-left">
                <Heading as="p" size="sm" className="text-ink">
                  Guest Mode
                </Heading>
                <p className="font-sans text-xs uppercase tracking-wide text-brown">
                  Host controls are locked for guests.
                </p>
              </div>
            ) : isDemo ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <Heading
                  as="p"
                  size="sm"
                  className="border-2 border-ink bg-paper px-3 py-2 text-ink"
                >
                  Demo Camera
                </Heading>
                <button
                  onClick={onToggleSound}
                  aria-pressed={captureSound}
                  className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                    captureSound ? "bg-mustard text-ink" : "bg-paper text-ink"
                  }`}
                >
                  Sound
                </button>
              </div>
            ) : (
              <div className="mb-3 grid grid-cols-3 gap-2">
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
                <button
                  onClick={onToggleSound}
                  aria-pressed={captureSound}
                  className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                    captureSound ? "bg-mustard text-ink" : "bg-paper text-ink"
                  }`}
                >
                  Sound
                </button>
              </div>
            )}
            {!partyMode && (
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
            )}
            <Button variant="primary" size="lg" fullWidth onClick={onStart}>
              <BrandIcon name="camera" className="h-8 w-8 -translate-y-1" />
              {partyMode
                ? "Start Booth"
                : retakeIndex === null
                  ? isDemo
                    ? "Run Demo Shoot"
                    : "Start Countdown"
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
