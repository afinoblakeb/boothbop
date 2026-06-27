import { useRef, useState } from "react";
import { BrandIcon, GearIcon } from "../icons";
import { Button, Callout } from "../ui";
import { LOGO } from "../constants";
import { InstallCard } from "../components/InstallCard";
import { LegalFooter } from "../components/LegalFooter";
import type { InstallPromptEvent } from "../types";

/** The home screen: brand, pitch, consumer-first actions, install nudge, legal. */
export function IdleScreen({
  onStart,
  onBrowseTemplates,
  onOpenPartySetup,
  onOpenGallery,
  onOpenSettings,
  onImportPhotos,
  demoSets = [],
  onStartDemo,
  installPrompt,
  partyMode,
  error,
}: {
  onStart: () => void;
  onBrowseTemplates: () => void;
  onOpenPartySetup: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onImportPhotos: (files: FileList) => void;
  demoSets?: readonly { id: number; label: string }[];
  onStartDemo?: (setNum: number) => void;
  installPrompt: InstallPromptEvent | null;
  partyMode: boolean;
  error: string | null;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-start pt-[clamp(3rem,8vh,6rem)] text-center">
        <img
          src={LOGO}
          alt="BoothBop"
          className="mx-auto max-h-32 w-auto max-w-xs"
        />

        <p className="mt-2 max-w-xs text-pretty font-sans text-base text-brown">
          Make a four-photo strip, GIF, or boomerang in one quick shoot. Photos
          stay on this device.
        </p>

        {partyMode && (
          <p className="mt-2 max-w-xs border-2 border-ink bg-paper px-3 py-2 font-sans text-xs uppercase tracking-wide text-brown">
            Guest Mode is ready for friends.
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
          {partyMode ? "Start Booth" : "Take Photo Strip"}
        </Button>

        {!partyMode && (
          <>
            <div className="mt-3 grid w-full max-w-xs grid-cols-2 gap-3">
              <button
                onClick={onBrowseTemplates}
                className="flex min-h-16 items-center justify-between border-2 border-ink bg-teal px-3 text-left text-cream transition active:translate-y-px"
              >
                <span>
                  <span className="block font-display text-xl uppercase tracking-wide">
                    Templates
                  </span>
                  <span className="block font-sans text-[11px] font-bold uppercase tracking-wide opacity-85">
                    Free + Pro looks
                  </span>
                </span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-8 w-2.5 border-2 border-ink bg-cream" />
                  <span className="h-8 w-2.5 border-2 border-ink bg-mustard" />
                  <span className="h-8 w-2.5 border-2 border-ink bg-orange" />
                </span>
              </button>

              <button
                onClick={onOpenGallery}
                className="flex min-h-16 items-center justify-center gap-2 border-2 border-ink bg-paper px-3 text-ink transition active:translate-y-px"
              >
                <BrandIcon name="gallery" className="h-7 w-7" />
                <span className="font-display text-xl uppercase tracking-wide">
                  Gallery
                </span>
              </button>
            </div>

            <button
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 px-2 font-display text-base uppercase tracking-wide text-brown underline decoration-2 underline-offset-4 transition active:translate-y-px"
            >
              <GearIcon className="h-5 w-5" />
              More
            </button>

            {moreOpen && (
              <div className="mt-2 flex max-w-xs flex-wrap justify-center gap-x-5 gap-y-2">
                <button
                  onClick={() => importRef.current?.click()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 px-2 font-display text-base uppercase tracking-wide text-brown underline decoration-2 underline-offset-4 transition active:translate-y-px"
                >
                  <BrandIcon name="gallery" className="h-5 w-5" />
                  Import
                </button>
                <button
                  onClick={onOpenPartySetup}
                  className="inline-flex min-h-10 items-center justify-center gap-2 px-2 font-display text-base uppercase tracking-wide text-brown underline decoration-2 underline-offset-4 transition active:translate-y-px"
                >
                  <GearIcon className="h-5 w-5" />
                  Guest Setup
                </button>
                <button
                  onClick={onOpenSettings}
                  className="inline-flex min-h-10 items-center justify-center gap-2 px-2 font-display text-base uppercase tracking-wide text-brown underline decoration-2 underline-offset-4 transition active:translate-y-px"
                >
                  <GearIcon className="h-5 w-5" />
                  Settings
                </button>
              </div>
            )}
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

        {!partyMode && moreOpen && (
          <InstallCard installPrompt={installPrompt} />
        )}

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
