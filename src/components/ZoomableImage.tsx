import { useState } from "react";
import { IconButton } from "../ui";
import { useModalFocus } from "../hooks/useModalFocus";

/**
 * An inline image that opens a full-screen viewer for a closer look. The inline
 * view is unchanged (the default "fit" preview); tapping it opens an overlay
 * where tapping again toggles between fit and a width-filling zoom that the user
 * pans by scrolling. We drive zoom with layout size (not a CSS transform) so the
 * scroll container actually grows — pinch-zoom is unavailable under the app's
 * fixed PWA viewport, so scroll-to-pan is the reliable gesture on iOS.
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Zoom in for a closer look"
        className="relative block h-full min-h-0 w-full overflow-hidden"
      >
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 m-auto max-w-full ${className} cursor-zoom-in`}
        />
      </button>
      {open && (
        <ZoomOverlay src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ZoomOverlay({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const modalRef = useModalFocus<HTMLDivElement>(onClose);
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      <div className="flex justify-end px-3">
        <IconButton
          data-autofocus
          aria-label="Close zoom"
          onClick={onClose}
          className="text-3xl text-cream"
        >
          ✕
        </IconButton>
      </div>
      <div
        className={`flex-1 px-3 ${
          zoomed
            ? "overflow-auto"
            : "flex items-center justify-center overflow-hidden"
        }`}
      >
        <img
          src={src}
          alt={alt}
          onClick={() => setZoomed((z) => !z)}
          className={
            zoomed
              ? "h-auto cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain"
          }
          style={zoomed ? { width: "95vw", maxWidth: "none" } : undefined}
        />
      </div>
      <p className="pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 text-center font-sans text-xs text-cream/70">
        {zoomed
          ? "Tap image to fit · scroll to pan"
          : "Tap image for a closer look"}
      </p>
    </div>
  );
}
