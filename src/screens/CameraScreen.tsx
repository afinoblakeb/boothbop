import type { RefObject } from "react";
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
  countdown,
  flash,
  thumbs,
  delay,
  setDelay,
  onStart,
  onCancel,
  retakeIndex,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  phase: Phase;
  countdown: number | null;
  flash: boolean;
  thumbs: string[];
  delay: number;
  setDelay: (n: number) => void;
  onStart: () => void;
  onCancel: () => void;
  retakeIndex: number | null;
}) {
  return (
    <div className="camera-screen flex min-h-0 flex-1 flex-col py-4">
      <span role="status" aria-live="assertive" className="sr-only">
        {countdown !== null
          ? `${countdown}`
          : phase === "capturing"
            ? retakeIndex === null
              ? `Captured ${thumbs.length} of ${SHOTS}`
              : `Retaking photo ${retakeIndex + 1}`
            : "Camera ready"}
      </span>
      <div className="camera-preview relative aspect-square w-full shrink-0 overflow-hidden border-2 border-ink bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full -scale-x-100 object-cover"
        />

        {phase === "capturing" && (
          <Heading
            as="div"
            size="sm"
            className="absolute left-2 top-2 flex items-center gap-2 border-2 border-ink bg-cream px-2 py-1 text-ink"
          >
            <span className="pulse inline-block h-2.5 w-2.5 rounded-full bg-orange" />
            {retakeIndex === null
              ? `${thumbs.length}/${SHOTS}`
              : `Retake ${retakeIndex + 1}/${SHOTS}`}
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
      <div className="camera-thumbs mt-4 grid shrink-0 grid-cols-4 gap-2">
        {Array.from({ length: SHOTS }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square overflow-hidden border-2 bg-paper ${
              retakeIndex === i
                ? "border-orange ring-2 ring-orange ring-offset-2 ring-offset-cream"
                : "border-ink"
            }`}
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

      <div className="camera-controls mt-auto pt-4 text-center">
        {phase === "preview" ? (
          <>
            <div className="camera-countdown mb-3 flex items-center justify-center gap-2">
              <Heading as="span" size="sm" className="text-brown">
                Countdown
              </Heading>
              <SegmentedControl
                label="Countdown seconds"
                value={delay}
                onChange={setDelay}
                options={[
                  { value: 1, label: "1s" },
                  { value: 2, label: "2s" },
                  { value: 3, label: "3s" },
                ]}
                itemClassName="flex min-h-[44px] items-center justify-center px-4 py-2.5 text-lg"
              />
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={onStart}>
              <BrandIcon name="camera" className="h-8 w-8 -translate-y-1" />
              {retakeIndex === null
                ? "Take Photos"
                : `Retake Photo ${retakeIndex + 1}`}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={onCancel}
              className="mt-2"
            >
              Cancel
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
