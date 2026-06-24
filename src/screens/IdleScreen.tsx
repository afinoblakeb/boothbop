import { isNativeShell } from "../lib/platform";
import { BrandIcon } from "../icons";
import { Button, Callout } from "../ui";
import { LOGO } from "../constants";
import { InstallCard } from "../components/InstallCard";
import type { InstallPromptEvent } from "../types";

// Open a legal/support page. In the native app a raw <a href> navigation leaves
// the WKWebView and strands the user (no browser chrome / back button), so open
// the live page in an escapable in-app Safari view. On web, navigate normally.
async function openLegalPage(slug: "privacy" | "terms" | "support") {
  if (isNativeShell()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: `https://boothbop.com/${slug}/` });
  } else {
    window.location.href = `${import.meta.env.BASE_URL}${slug}/`;
  }
}

/** The home screen: brand, pitch, the two primary actions, install nudge, legal. */
export function IdleScreen({
  onStart,
  onOpenGallery,
  installPrompt,
  error,
}: {
  onStart: () => void;
  onOpenGallery: () => void;
  installPrompt: InstallPromptEvent | null;
  error: string | null;
}) {
  return (
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
        <BrandIcon name="camera" className="h-8 w-8" />
        Take Photos
      </Button>

      <Button
        variant="secondary"
        size="md"
        fullWidth
        onClick={onOpenGallery}
        className="mt-3 max-w-xs"
      >
        <BrandIcon name="gallery" className="h-7 w-7" />
        My Photos
      </Button>

      <InstallCard installPrompt={installPrompt} />

      <p className="mt-5 font-sans text-xs font-semibold uppercase tracking-widest text-warmgray">
        No accounts · No uploads · No cloud
      </p>
      <p className="mt-2 font-sans text-xs text-warmgray">
        <button onClick={() => openLegalPage("privacy")} className="underline">
          Privacy
        </button>{" "}
        ·{" "}
        <button onClick={() => openLegalPage("terms")} className="underline">
          Terms
        </button>{" "}
        ·{" "}
        <button onClick={() => openLegalPage("support")} className="underline">
          Support
        </button>
      </p>

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
  );
}
