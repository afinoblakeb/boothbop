import { proOfferCopy, type ProContext } from "../lib/pro";
import { Button, Callout, Heading, OverlayScreen } from "../ui";

export function ProScreen({
  context,
  price,
  native,
  isPro,
  busy,
  error,
  onStartPro,
  onRestore,
  onClose,
}: {
  context: ProContext;
  price: string | null;
  native: boolean;
  isPro: boolean;
  busy: boolean;
  error: string | null;
  onStartPro: () => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const copy = proOfferCopy(context, price);

  return (
    <OverlayScreen title="BoothBop Pro" onClose={onClose}>
      <section className="mt-5 border-2 border-ink bg-paper p-4">
        <p className="font-sans text-xs font-bold uppercase tracking-wide text-orange-dark">
          {copy.eyebrow}
        </p>
        <Heading as="h3" size="xl" className="mt-2 text-ink">
          {isPro ? "Pro Active" : copy.title}
        </Heading>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brown">
          {isPro
            ? "Every premium template drop, look, prop, caption, print sheet, HD export, guest flow, and watermark-free export is active on this device."
            : copy.body}
        </p>
      </section>

      <div className="mt-4 grid gap-2">
        {copy.bullets.map((bullet) => (
          <div
            key={bullet}
            className="flex items-start gap-3 border-2 border-ink bg-cream px-3 py-2"
          >
            <span className="mt-1 h-3 w-3 shrink-0 border-2 border-ink bg-teal" />
            <p className="font-sans text-sm leading-snug text-ink">{bullet}</p>
          </div>
        ))}
      </div>

      {!native && (
        <Callout tone="neutral" className="mt-4 px-4 py-3">
          <p className="font-sans text-sm text-brown">
            Pro purchases are available in the BoothBop iOS app. The web app
            keeps the free booth experience available without an account.
          </p>
        </Callout>
      )}

      {error && (
        <Callout tone="error" className="mt-4 px-4 py-3">
          <p className="font-sans text-sm text-orange-dark">{error}</p>
        </Callout>
      )}

      <div className="mt-5 grid gap-3">
        {isPro ? (
          <Button variant="primary" size="md" fullWidth onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onStartPro}
              disabled={!native || busy}
            >
              {busy ? "Opening StoreKit..." : copy.cta}
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={onRestore}
              disabled={!native || busy}
            >
              Restore Purchase
            </Button>
          </>
        )}
      </div>

      <p className="mt-4 text-center font-sans text-xs leading-relaxed text-warmgray">
        Auto-renews monthly through Apple unless canceled. No trial is included.
        Manage or cancel in App Store subscriptions. If Pro lapses, new exports
        use the free limits; saved files stay on this device.
      </p>
    </OverlayScreen>
  );
}
