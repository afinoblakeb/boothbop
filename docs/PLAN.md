# BoothBop — Strategy & 3-Month Plan

Synthesized from a 4-seat AI council (monetization, product, release-cadence,
growth). This is the guide; it operationalizes one decision: **ship a minimal
free MVP through the App Store now, then learn via staged releases.**

## Goal & philosophy

- **Primary goal = learning.** A brand-new iOS dev getting reps through the full
  App Store loop (submit → review → release → update). Success ≠ scale.
- Best-case ~1,000 users in a year. Bar is intentionally low.
- Privacy-first, on-device, **no backend, super-small-dollars.**
- Architecture is settled: **stay on Capacitor**, add premium features as native
  plugins. No rewrite. (AR/depth bridge in later; not pigeonholed.)

## The launch decision: ship tiny, ship often

When the goal is learning, **completed App Store loops are the product.** A
blockbuster v1 = one slow, risky loop. Staged releases = many fast, low-risk
loops. So:

- **v1 = the app exactly as it is today, FREE, no IAP.** Submit ASAP. Lowest
  possible rejection surface; learn the whole pipeline cleanly. (Guideline 4.2 is
  already pre-empted in the review notes.)
- **v1.1 = add BoothBop Pro IAP** (StoreKit). Learn IAP/sandbox/review in
  isolation. If it bounces, the app is already live.
- Then the staged roadmap below. **AR is in "Q2 jail" — do not let it eat the
  quarter.**

## Monetization model (the coherent one)

**ONE Pro entitlement — `com.boothbop.app.pro.monthly` — that keeps gaining
features.** No à-la-carte pile of IAPs (the confusion trap). The old
`com.boothbop.app.removewatermark` non-consumable remains restore-compatible for
early builds, but the primary product is now BoothBop Pro Monthly.

- Launch it as **BoothBop Pro - $1.99/month**, backed by real recurring value:
  premium templates, Pro looks/props, custom captions, HD exports, and
  watermark-free animated exports.
- As features ship, the **same Pro entitlement** gains them and the storefront
  repositions around event packs, party mode, print-ready exports, and premium
  looks.
- **StoreKit 2, no backend:** auto-renewable subscription, on-device
  `Transaction.currentEntitlements`, a **Restore Purchases** button (Apple
  requires it), cache `isPro` for offline.
- **What keeps you backend-free:** keep the web PWA permanently free (don't try
  to sync the unlock cross-platform); let Apple handle native subscription
  billing and restore.

### Free vs Pro — gate the polish, never the spread

|                                                  | Free forever                    | Pro (`com.boothbop.app.pro.monthly`) |
| ------------------------------------------------ | ------------------------------- | ------------------------------------ |
| Capture (4-shot), strip, GIF, video              | ✅                              |                                      |
| Save to Photos, share anywhere                   | ✅ (watermarked)                |                                      |
| Entire web PWA (boothbop.com)                    | ✅ (always watermarked, no Pro) |                                      |
| Baseline filters / themes / layouts              | ✅ (a generous few)             |                                      |
| **Remove watermark**                             |                                 | ✅ anchor                            |
| Extra filters / themes / layouts / sticker packs |                                 | ✅                                   |
| Boomerang, custom captions/fonts                 |                                 | ✅                                   |
| HD full-res capture ("HD strips")                |                                 | ✅                                   |
| Depth/Portrait, AR face filters                  |                                 | ✅                                   |

**Rule:** the _shared output_ (watermarked) stays free — it's the growth engine.
Sell polish, power, and friction-removal; never the ability to capture or share.

## Product north-star

**The retro photo-booth STRIP is the brand — not AR, not HD.** The strip is an
iconic, instantly-recognizable artifact. Make the **default strip gorgeous out of
the box** (border, film-grain option, beautiful date-stamp typography) so a
BoothBop strip is recognizable across the room in someone's feed. You're closer to
Huji/Dazz (aesthetic-driven, look-monetized) than to Snapchat (AR-driven).
Everything else decorates the strip; the strip is the star.

## The 3-month staged calendar

Cadence: **weekly web + TestFlight; App Store submission ~every 2 weeks.** Web
(boothbop.com) deploys instantly on push with no review — it's your fast channel
and pressure-release valve. Only native plugins need an Xcode build + review.

Legend: **[W]** web-side (instant to boothbop.com, bundles into next iOS build) ·
**[N]** native plugin (Xcode build + review) · **AS#** = App Store submission.

| Wk  | Ship                                                                   | Notes                                                                                                                    |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | **AS#1: free MVP, as-is**                                              | Screenshots + App Store Connect record + submit. The learning loop. Meanwhile: polish the default strip [W].             |
| 2   | MVP approved/live · **AS#2: BoothBop Pro IAP** [N]                     | Wire StoreKit 2 (`com.boothbop.app.pro.monthly`) + Restore button; sandbox-test; submit. Web: 2–3 new color filters [W]. |
| 3   | Captions / text-on-strip [W]                                           | Web push while review clears. TestFlight the bundle.                                                                     |
| 4   | Boomerang mode [W] · **AS#3** (web bundle)                             | Low-risk submission (all web). Repositions store to "BoothBop Pro $4.99".                                                |
| 5   | Strip themes/layouts + a paid theme pack [W]                           | Web momentum.                                                                                                            |
| 6   | Local gallery polish + retake-single-frame [W] · **AS#4** (web bundle) | Retention + frustration-killers.                                                                                         |
| 7   | **HD full-res capture** [N] — build                                    | First "real" native plugin. TestFlight hard (full-res = OOM risk).                                                       |
| 8   | **AS#5: HD capture** · sticker packs [W]                               | Ship HD as a Pro perk.                                                                                                   |
| 9   | Seasonal theme drop + custom fonts [W]                                 | Timed re-engagement.                                                                                                     |
| 10  | Buffer / polish / metrics                                              | **Protected week.** No native feature; web-only or nothing.                                                              |
| 11  | Depth/Portrait [N] — build/ship **AS#6**                               | Medium-large; TestFlight early.                                                                                          |
| 12  | Stabilize + **spike (not build) ARKit**                                | De-risk AR for Q2. Reposition store to "$5.99–6.99".                                                                     |

~12 web pushes, weekly TestFlight, **~6 App Store submissions**, AR deferred.

## Growth overlay (no budget, solo)

- **The web PWA is your ad network** — a working product in one tap via URL.
  After a user's _second_ strip, show a soft "Get the app" prompt tied to a
  native-only perk (HD/offline/AR).
- **Watermark flywheel:** every shared GIF/video carries a tasteful
  `boothbop.com` (use the URL as text, not just a logo — survives re-compression).
  Free tier carries the loop; the IAP monetizes your over-sharers (who'd crop it
  anyway). The two roles don't conflict.
- **v1 launch channels:** your own socials → Reddit (r/SideProject,
  r/InternetIsBeautiful, r/analog, retro/atomic-age subs — lead with the _web
  link_, not the store) → **Show HN** ("runs entirely on-device, private"). **Hold
  Product Hunt** for a meatier moment.
- **Releases for growth:** most are silent ships; ~monthly "beat" ships; **AR is
  the 1–2 tentpole** (TikTok/Reels-native virality + Product Hunt) — likely timed
  to a seasonal moment (Halloween is huge for photo booths / face filters).
- **ASO:** test the **app icon** (biggest tap-through lever, via free Product Page
  Optimization A/B), and make **screenshot #1 the finished strip/GIF** (the
  desire), not the camera UI. Each premium drop = refreshed "What's New" + a new
  hero screenshot.
- **3 cheap experiments:** (1) web→app prompt timing/copy; (2) watermark design
  A/B on the PWA; (3) same artifact across subreddits/short-form hooks to find the
  winning _narrative_.

## The pitfalls each seat flagged

- **Monetization:** fragmenting into à-la-carte IAPs or a subscription → kills
  ratings & shares (your only distribution). One growing Pro SKU.
- **Product:** building AR before validating the free→share→convert loop; and
  over-gating (strangles virality). Make the _strip_ irresistible first.
- **Release:** scope creep _per release_. One native feature per submission, max;
  let the web channel absorb enthusiasm. Boring native releases = sustainable.
- **Growth:** optimizing IAP/ASO while the _output_ looks mediocre. The flywheel
  only spins if the artifact is beautiful and recognizable.
