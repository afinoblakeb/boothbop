import { isNativeShell } from "../lib/platform";

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

// The Privacy · Terms · Support footer, shared by the Home and Settings screens
// so the legal links live in exactly one place. Callers position it (a true
// page footer on Home, the end of the scroll on Settings) via `className`.
export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`font-sans text-xs text-warmgray ${className}`}>
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
    </footer>
  );
}
