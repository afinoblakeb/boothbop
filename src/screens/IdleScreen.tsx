import { Camera, X } from "lucide-react";
import { Button, Callout, Heading, IconButton } from "../ui";
import { InstallCard } from "../components/InstallCard";
import { LegalFooter } from "../components/LegalFooter";
import type { InstallPromptEvent } from "../types";
import type { ReleaseAnnouncement } from "../lib/whatsNew";

/** The home screen: brand, pitch, primary action, install nudge, and legal. */
export function IdleScreen({
  onStart,
  openingCamera,
  installPrompt,
  error,
  releaseAnnouncement,
  onDismissReleaseAnnouncement,
}: {
  onStart: () => void;
  openingCamera: boolean;
  installPrompt: InstallPromptEvent | null;
  error: string | null;
  releaseAnnouncement: ReleaseAnnouncement | null;
  onDismissReleaseAnnouncement: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-2 py-5 text-left">
        <p className="font-sans text-sm font-semibold text-accent">
          Four shots. One classic strip.
        </p>
        <Heading
          as="h1"
          size="xl"
          variant="page"
          className="mt-1 text-balance text-text"
        >
          The photo booth, reimagined.
        </Heading>
        <p className="mt-2 max-w-xs text-pretty font-sans text-base leading-6 text-text-muted">
          Strike four poses and get a print-ready strip worth saving, sharing,
          and putting on the fridge.
        </p>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStart}
          disabled={openingCamera}
          className="mt-5 max-w-xs"
        >
          {openingCamera ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-accent/40 border-t-on-accent" />
          ) : (
            <Camera className="h-6 w-6" aria-hidden="true" />
          )}
          {openingCamera ? "Opening Camera…" : "Take Photos"}
        </Button>

        {releaseAnnouncement && (
          <Callout
            tone="info"
            className="mt-4 flex w-full max-w-xs items-start gap-3 px-3 py-2.5 text-left"
          >
            <div role="status" className="min-w-0 flex-1">
              <p className="font-sans text-xs font-semibold text-positive">
                New in BoothBop
              </p>
              <p className="font-sans text-sm font-semibold text-text">
                {releaseAnnouncement.title}
              </p>
              <p className="mt-0.5 text-pretty font-sans text-xs leading-5 text-text-muted">
                {releaseAnnouncement.body}
              </p>
            </div>
            <IconButton
              aria-label="Dismiss update"
              onClick={onDismissReleaseAnnouncement}
              className="h-11 w-11 shrink-0 text-text-muted"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          </Callout>
        )}

        <InstallCard installPrompt={installPrompt} />

        {error && (
          <Callout
            as="p"
            tone="error"
            className="mt-5 max-w-xs px-4 py-3 font-sans text-sm text-critical"
          >
            {error}
          </Callout>
        )}
      </div>

      <LegalFooter className="pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2" />
    </div>
  );
}
