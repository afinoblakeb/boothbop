# Monetization plan

> Status: **plan only.** No payment provider or paywall is wired yet. This
> documents the intended free/Pro split so the gate can be built behind a flag
> and a payment mechanism bolted on later (web license key now, native IAP
> later). See [ROADMAP.md](../ROADMAP.md) for the native path.

## Goal

Monetize for **super small dollars** (a ~$1.99–$2.99 one-time "Pro" unlock, or a
tip-jar) without hurting ease of use or the app's viral loop.

## Guiding principle

Free output is the marketing — **every shared watermarked GIF/video advertises
BoothBop.** So:

- **Gate vanity / personalization / pro-polish.**
- **Never gate usability or the core loop.** A free user must always be able to
  do a full 4-shot booth and walk away with something genuinely good (just
  branded). Friendly + viral beats ARPU at this price point.

## Free vs. Pro

| Feature                                                                 | Tier     | Rationale                                            |
| ----------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| 4-shot booth, countdown, on-device gallery                              | **Free** | The core loop — never gate it                        |
| Strip + GIF + video export                                              | **Free** | …but GIF/video carry the watermark                   |
| Photo strip (always has the brand footer)                               | **Free** | Free brand marketing baked into the output           |
| 2–3 base filters/looks                                                  | **Free** | Pretty output → more shares                          |
| Boomerang loop                                                          | **Free** | Shareable = growth; keep it free                     |
| Haptics, remember-settings, framing guide, "Surprise me", retake-a-shot | **Free** | These are _ease of use_ — paywalling them is hostile |
| **Remove watermark**                                                    | **Pro**  | The #1 lever; already wired (see below)              |
| **Custom caption** on the strip                                         | **Pro**  | "Make it mine" — high desire, low effort             |
| **Premium look/filter pack** (extra filters)                            | **Pro**  | Cosmetic upsell                                      |
| **Premium layouts/templates + custom border colors**                    | **Pro**  | Cosmetic upsell                                      |
| Optional: higher-res / longer video                                     | **Pro**  | Keep free quality _good_, not crippled               |

Bundle the Pro items as a single **"BoothBop Pro" one-time unlock**. A
one-time unlock fits a photo-booth toy better than a subscription and is less
hostile. A tip-jar / pay-what-you-want is a viable alternative.

## The watermark seam (already in the code)

`encodeGif` / `encodeVideo` already take a `watermark` flag — a future
"remove watermark" tier just passes `false`. Keep that flag threaded; it is the
anchor Pro feature.

## How we'll actually charge

The app is 100% client-side on GitHub Pages with **no backend**, so there's no
native place to take a payment or store entitlements. Two paths:

1. **Now (web):** sell a **license key** via Gumroad / Lemon Squeezy / a Stripe
   Payment Link, and validate a **signed, offline-checkable key** locally to set
   a `pro` flag. No backend required.
   _Caveat:_ client-side gating on a public repo is bypassable by anyone who
   reads the JS. For a ~$2 unlock that's fine — we're selling honesty +
   convenience, not DRM.
2. **Later (native):** use **App Store / Play in-app purchase** when the
   Capacitor apps ship. More robust; the stores handle billing.

## Recommended sequencing

1. **Decide the split** (this doc) — done.
2. **Build the gate, not the checkout.** Add `src/lib/entitlements.ts` exposing
   `isPro()` (reads a local unlock flag; trivial to swap for key-validation
   later), thread it through the `watermark` flag, and gate the Pro UI behind
   it. Ship Pro features dark behind the flag.
3. **Bolt on payment when ready** — Gumroad/Lemon Squeezy keys for web, or native
   IAP — with no rework, because everything already keys off `isPro()`.

Design rule: gate everything on a single `isPro()` so there's exactly one place
to wire billing.
