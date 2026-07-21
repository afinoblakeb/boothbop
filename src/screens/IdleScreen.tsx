import { X } from "lucide-react";
import { BrandIcon } from "../icons";
import { Button, Callout, IconButton } from "../ui";
import { LOGO } from "../constants";
import { InstallCard } from "../components/InstallCard";
import { LegalFooter } from "../components/LegalFooter";
import type { InstallPromptEvent } from "../types";
import type { ReleaseAnnouncement } from "../lib/whatsNew";

/** The home screen: brand, pitch, primary action, install nudge, and legal. */
export function IdleScreen({
  onStart,
  installPrompt,
  error,
  releaseAnnouncement,
  onDismissReleaseAnnouncement,
}: {
  onStart: () => void;
  installPrompt: InstallPromptEvent | null;
  error: string | null;
  releaseAnnouncement: ReleaseAnnouncement | null;
  onDismissReleaseAnnouncement: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      <div className="flex flex-1 flex-col items-center justify-center px-1 text-center">
        <img
          src={LOGO}
          alt="BoothBop"
          className="mx-auto max-h-32 h-auto w-full max-w-xs object-contain"
        />

        <p className="mt-2 max-w-xs text-pretty font-sans text-base text-brown">
          Your phone is the photo booth. Tap the button, strike four poses, and
          grab your photo strip!
        </p>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStart}
          className="mt-4 max-w-xs"
        >
          <BrandIcon name="camera" className="h-8 w-8 -translate-y-1" />
          Take Photos
        </Button>

        {releaseAnnouncement && (
          <Callout
            tone="info"
            className="mt-4 flex w-full max-w-xs items-start gap-3 px-3 py-2 text-left"
          >
            <div role="status" className="min-w-0 flex-1">
              <p className="font-sans text-[10px] font-semibold uppercase text-teal">
                New in BoothBop
              </p>
              <p className="font-sans text-sm font-semibold text-ink">
                {releaseAnnouncement.title}
              </p>
              <p className="mt-0.5 text-pretty font-sans text-xs text-brown">
                {releaseAnnouncement.body}
              </p>
            </div>
            <IconButton
              compact
              aria-label="Dismiss update"
              onClick={onDismissReleaseAnnouncement}
              className="h-9 w-9 shrink-0 text-brown"
            >
              <X className="h-5 w-5" />
            </IconButton>
          </Callout>
        )}

        <InstallCard installPrompt={installPrompt} />

        {error && (
          <Callout
            as="p"
            tone="error"
            className="mt-6 max-w-xs px-4 py-3 font-sans text-sm text-orange-dark"
          >
            {error}
          </Callout>
        )}
      </div>

      <LegalFooter className="pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 text-center" />
    </div>
  );
}
