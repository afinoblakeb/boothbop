import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "../ui";
import { useModalFocus } from "../hooks/useModalFocus";

interface FocalPoint {
  x: number;
  y: number;
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

/**
 * An inline image that opens a full-screen, scrollable detail viewer. The
 * tapped point becomes the center of the zoom so a tall strip never jumps back
 * to its first photo. Tapping the enlarged image toggles back to fit.
 */
export function ZoomableImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [openAt, setOpenAt] = useState<FocalPoint | null>(null);
  const previewRef = useRef<HTMLImageElement>(null);

  function openZoom(event: MouseEvent<HTMLButtonElement>) {
    const bounds = previewRef.current?.getBoundingClientRect();
    setOpenAt(
      bounds
        ? {
            x: clampUnit((event.clientX - bounds.left) / bounds.width),
            y: clampUnit((event.clientY - bounds.top) / bounds.height),
          }
        : { x: 0.5, y: 0.5 },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openZoom}
        aria-label="Zoom in for a closer look"
        className="relative block h-full min-h-0 w-full overflow-hidden"
      >
        <img
          ref={previewRef}
          src={src}
          alt={alt}
          className={`absolute inset-0 m-auto max-w-full ${className} cursor-zoom-in`}
        />
      </button>
      {openAt && (
        <ZoomOverlay
          src={src}
          alt={alt}
          initialPoint={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

function ZoomOverlay({
  src,
  alt,
  initialPoint,
  onClose,
}: {
  src: string;
  alt: string;
  initialPoint: FocalPoint;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(true);
  const [focalPoint, setFocalPoint] = useState(initialPoint);
  const modalRef = useModalFocus<HTMLDivElement>(onClose);
  const scrollRef = useRef<HTMLDivElement>(null);

  const centerFocalPoint = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || !zoomed) return;
    scroller.scrollLeft =
      scroller.scrollWidth * focalPoint.x - scroller.clientWidth / 2;
    scroller.scrollTop =
      scroller.scrollHeight * focalPoint.y - scroller.clientHeight / 2;
  }, [focalPoint, zoomed]);

  useEffect(() => {
    const frame = requestAnimationFrame(centerFocalPoint);
    return () => cancelAnimationFrame(frame);
  }, [centerFocalPoint]);

  function toggleZoom(event: MouseEvent<HTMLImageElement>) {
    if (zoomed) {
      setZoomed(false);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setFocalPoint({
      x: clampUnit((event.clientX - bounds.left) / bounds.width),
      y: clampUnit((event.clientY - bounds.top) / bounds.height),
    });
    setZoomed(true);
  }

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      className="fixed inset-0 z-[100] flex flex-col bg-editor pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      <div className="relative z-10 flex shrink-0 justify-end px-3">
        <IconButton
          data-autofocus
          aria-label="Close zoom"
          variant="surface"
          onClick={onClose}
          className="border-white !bg-white !text-ink shadow-overlay"
        >
          <X aria-hidden="true" size={24} strokeWidth={2.5} />
        </IconButton>
      </div>
      <div
        ref={scrollRef}
        data-testid="zoom-scroll"
        className={`min-h-0 flex-1 px-3 ${
          zoomed
            ? "overflow-auto"
            : "flex items-center justify-center overflow-hidden"
        }`}
      >
        <img
          src={src}
          alt={alt}
          onLoad={centerFocalPoint}
          onClick={toggleZoom}
          className={
            zoomed
              ? "mx-auto block h-auto max-w-none cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain"
          }
          style={zoomed ? { width: "95vw" } : undefined}
        />
      </div>
      <p className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 text-center font-sans text-xs text-white/70">
        {zoomed
          ? "Tap image to fit · scroll to pan"
          : "Tap image for a closer look"}
      </p>
    </div>,
    document.body,
  );
}
