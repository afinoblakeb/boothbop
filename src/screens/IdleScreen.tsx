import { BrandIcon } from "../icons";
import { Button, Callout } from "../ui";
import { LOGO } from "../constants";
import { InstallCard } from "../components/InstallCard";
import { LegalFooter } from "../components/LegalFooter";
import type { InstallPromptEvent } from "../types";

/** The home screen: brand, pitch, the two primary actions, install nudge, legal. */
export function IdleScreen({
  onStart,
  onOpenGallery,
  demoSets = [],
  onStartDemo,
  installPrompt,
  error,
}: {
  onStart: () => void;
  onOpenGallery: () => void;
  demoSets?: readonly { id: number; label: string }[];
  onStartDemo?: (setNum: number) => void;
  installPrompt: InstallPromptEvent | null;
  error: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src={LOGO}
          alt="BoothBop"
          className="mx-auto max-h-32 w-auto max-w-xs"
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

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onOpenGallery}
          className="mt-3 max-w-xs"
        >
          <BrandIcon name="gallery" className="h-8 w-8" />
          My Photos
        </Button>

        {demoSets.length > 0 && onStartDemo && (
          <div className="mt-3 grid w-full max-w-xs grid-cols-3 gap-2">
            {demoSets.map((set) => (
              <button
                key={set.id}
                onClick={() => onStartDemo(set.id)}
                aria-label={`Start ${set.label} demo shoot`}
                className="border-2 border-ink bg-paper px-2 py-2 font-display text-sm uppercase tracking-wide text-ink transition active:translate-y-px"
              >
                Demo {set.id}
              </button>
            ))}
          </div>
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
