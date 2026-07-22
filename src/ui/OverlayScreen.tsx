import type { ReactNode } from "react";
import { Heading } from "./Heading";
import { IconButton } from "./IconButton";
import { useModalFocus } from "../hooks/useModalFocus";

// The full-screen overlay shell shared by the Gallery and Settings screens:
// a safe-area-padded, max-width column over a cream backdrop, with a titled
// header and a close button. Screens supply only their title and body, so the
// frame (z-index, scroll, safe-area inset, header layout) stays identical.
export function OverlayScreen({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const modalRef = useModalFocus<HTMLDivElement>(onClose);
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 overflow-y-auto bg-cream text-ink"
    >
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <Heading as="h2" size="xl">
            {title}
          </Heading>
          <IconButton
            data-autofocus
            aria-label="Close"
            onClick={onClose}
            className="px-2 text-2xl text-brown"
          >
            ✕
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
