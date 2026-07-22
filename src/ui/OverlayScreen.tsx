import type { ReactNode } from "react";
import { Heading } from "./Heading";
import { IconButton } from "./IconButton";
import { useModalFocus } from "../hooks/useModalFocus";

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
      className="fixed inset-0 z-40 overflow-y-auto bg-app-canvas text-text"
    >
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <Heading as="h2" size="xl" variant="page">
            {title}
          </Heading>
          <IconButton
            data-autofocus
            aria-label="Close"
            onClick={onClose}
            className="text-text-muted"
          >
            ✕
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
