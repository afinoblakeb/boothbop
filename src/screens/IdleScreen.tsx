import { useRef } from "react";
import { BrandIcon } from "../icons";
import { Button, Callout } from "../ui";
import { LOGO } from "../constants";
import { InstallCard } from "../components/InstallCard";
import { LegalFooter } from "../components/LegalFooter";
import type { InstallPromptEvent } from "../types";

/** The home screen: brand, pitch, the two primary actions, install nudge, legal. */
export function IdleScreen({
  onStart,
  onBrowseTemplates,
  onOpenGallery,
  onImportPhotos,
  demoSets = [],
  onStartDemo,
  installPrompt,
  partyMode,
  error,
}: {
  onStart: () => void;
  onBrowseTemplates: () => void;
  onOpenGallery: () => void;
  onImportPhotos: (files: FileList) => void;
  demoSets?: readonly { id: number; label: string }[];
  onStartDemo?: (setNum: number) => void;
  installPrompt: InstallPromptEvent | null;
  partyMode: boolean;
  error: string | null;
}) {
  const importRef = useRef<HTMLInputElement>(null);

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

        {partyMode && (
          <p className="mt-2 max-w-xs border-2 border-ink bg-paper px-3 py-2 font-sans text-xs uppercase tracking-wide text-brown">
            Party Mode is ready for guests.
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStart}
          className="mt-4 max-w-xs"
        >
          <BrandIcon name="camera" className="h-8 w-8 -translate-y-1" />
          {partyMode ? "Start Booth" : "Take Photos"}
        </Button>

        {!partyMode && (
          <>
            <button
              onClick={onBrowseTemplates}
              className="mt-3 flex min-h-16 w-full max-w-xs items-center justify-between border-2 border-ink bg-teal px-4 text-left text-cream transition active:translate-y-px"
            >
              <span>
                <span className="block font-display text-2xl uppercase tracking-wide">
                  Browse Templates
                </span>
                <span className="block font-sans text-xs uppercase tracking-wide opacity-85">
                  12 looks to start with
                </span>
              </span>
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-9 w-3 border-2 border-ink bg-cream" />
                <span className="h-9 w-3 border-2 border-ink bg-mustard" />
                <span className="h-9 w-3 border-2 border-ink bg-orange" />
              </span>
            </button>

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

            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => importRef.current?.click()}
              className="mt-3 max-w-xs"
            >
              <BrandIcon name="gallery" className="h-6 w-6" />
              Import 4 Photos
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.currentTarget.files?.length) {
                  onImportPhotos(e.currentTarget.files);
                  e.currentTarget.value = "";
                }
              }}
            />
          </>
        )}

        {!partyMode && demoSets.length > 0 && onStartDemo && (
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

        {!partyMode && <InstallCard installPrompt={installPrompt} />}

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
