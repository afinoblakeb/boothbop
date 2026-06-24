import { useState } from "react";
import { isIOS, isNativeShell } from "../lib/platform";
import { BrandIcon, ShareIcon } from "../icons";
import { Button, Callout, Heading } from "../ui";
import type { InstallPromptEvent } from "../types";

/** Detect whether we're already running as an installed (standalone) app. */
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Prominent, benefit-led nudge to install the app. One-tap on Chromium
 * (Android/desktop) via the captured prompt; simple, browser-agnostic steps
 * everywhere else (notably iOS, which has no install event). Never blocks
 * browser use, and disappears once installed.
 */
export function InstallCard({
  installPrompt,
}: {
  installPrompt: InstallPromptEvent | null;
}) {
  const [showSteps, setShowSteps] = useState(false);

  // Hide in the native app (it's installed via the App Store — no "add to home
  // screen / no app store" nudge allowed) and when already a standalone PWA.
  if (isNativeShell() || isStandalone()) return null;

  async function oneTapInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
  }

  return (
    <Callout tone="highlight" className="mt-8 w-full max-w-xs p-4 text-left">
      <Heading as="p" size="lg" className="flex items-center gap-2 text-ink">
        <BrandIcon name="install" className="h-7 w-7" />
        Get the full app
      </Heading>
      <p className="mt-1 font-sans text-sm text-brown">
        Add BoothBop to your home screen — it opens full-screen, loads
        instantly, and works with no signal. No app store, free.
      </p>

      {installPrompt ? (
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={oneTapInstall}
          className="mt-3"
        >
          <BrandIcon name="install" className="h-6 w-6" />
          Add to Home Screen
        </Button>
      ) : (
        <>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setShowSteps((v) => !v)}
            className="mt-3"
          >
            <BrandIcon name="install" className="h-6 w-6" />
            Add to Home Screen
          </Button>
          {showSteps && <InstallSteps />}
        </>
      )}
    </Callout>
  );
}

/** The platform-specific "Add to Home Screen" instructions. */
export function InstallSteps() {
  const ios = isIOS();
  return (
    <ol className="mt-3 space-y-1.5 font-sans text-sm text-brown">
      {ios ? (
        <>
          <li className="flex items-center gap-1">
            <span>1. Tap the</span>
            <strong>Share</strong>
            <ShareIcon className="inline h-4 w-4" />
            <span>icon in Safari's toolbar.</span>
          </li>
          <li>
            2. Tap <strong>View More</strong> (scroll down) if you don't see the
            next step.
          </li>
          <li>
            3. Tap <strong>Add to Home Screen</strong>.
          </li>
          <li>
            4. Make sure <strong>Open as Web App</strong> is toggled{" "}
            <strong>ON</strong>.
          </li>
          <li>
            5. Tap <strong>Add</strong>. Done!
          </li>
        </>
      ) : (
        <>
          <li>
            1. Open your browser's menu (the <strong>⋮</strong> or{" "}
            <strong>⋯</strong> icon).
          </li>
          <li>
            2. Tap <strong>Install app</strong> or{" "}
            <strong>Add to Home screen</strong>.
          </li>
          <li>3. Open BoothBop from your home screen anytime.</li>
        </>
      )}
    </ol>
  );
}
