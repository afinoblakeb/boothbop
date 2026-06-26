# Monetization plan

> Status: Native iOS Pro is wired through StoreKit 2. The web/PWA remains free
> and does not sell Pro. See [IAP.md](./IAP.md) for product IDs and simulator
> testing.

## Goal

Monetize for **super small dollars** (`$1.99/month` native Pro) without hurting
ease of use or the app's viral loop.

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

Bundle the Pro items as a single **BoothBop Pro** entitlement. The first paid
native SKU is `com.boothbop.app.pro.monthly`; the old one-time
`com.boothbop.app.removewatermark` entitlement remains restore-compatible for
early builds.

## The watermark seam (already in the code)

`encodeGif` / `encodeVideo` take a `watermark` flag. Pro passes `false` for
watermark-free animated exports. Keep that flag threaded; it is the anchor Pro
feature.

## How we'll actually charge

The app is still local-first with **no backend**. Entitlements come from Apple
StoreKit in the native iOS shell and are cached locally for instant UI.

1. **Native iOS:** StoreKit 2 auto-renewable subscription. Apple handles billing
   and restore.
2. **Web/PWA:** free only for now. A web license key can be added later, but it
   should not block the App Store Pro path.

## Recommended sequencing

1. **Decide the split** (this doc) — done.
2. **Build the gate and value** — done for templates, layouts, looks, props,
   captions, quality, and animated watermark removal.
3. **Native checkout** — done in code through StoreKit 2; still needs App Store
   Connect product setup before production release.
4. **Keep adding recurring value** — new template packs, party/event workflows,
   and higher-end exports make the monthly price defensible.

Design rule: gate everything on a single `isPro()` so there's exactly one place
to wire billing.
