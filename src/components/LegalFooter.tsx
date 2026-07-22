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
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-1 border-t border-border font-sans text-xs text-text-muted ${className}`}
    >
      <button
        onClick={() => openLegalPage("privacy")}
        className="min-h-[44px] rounded-lg px-2 font-medium outline-none transition hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
      >
        Privacy
      </button>
      <span aria-hidden="true" className="text-border-strong">
        ·
      </span>
      <button
        onClick={() => openLegalPage("terms")}
        className="min-h-[44px] rounded-lg px-2 font-medium outline-none transition hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
      >
        Terms
      </button>
      <span aria-hidden="true" className="text-border-strong">
        ·
      </span>
      <button
        onClick={() => openLegalPage("support")}
        className="min-h-[44px] rounded-lg px-2 font-medium outline-none transition hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
      >
        Support
      </button>
    </footer>
  );
}
