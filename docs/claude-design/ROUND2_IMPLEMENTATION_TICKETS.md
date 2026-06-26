# ROUND2_IMPLEMENTATION_TICKETS

Every Round 2 design decision mapped to the current repo and grouped by build
order. Sizes: **S** approx 1/2 day - **M** approx 1-2 days - **L** approx 3-5 days - **XL** approx 1-2
weeks. Companion: SCREEN_SPECS, TEMPLATE_BUILD_LIST, TEMPLATE_CATALOG,
RENDERING_SPECS.

---

## MUST SHIP NOW

### N1 -- Restructure Review: collapsed vs Edit drawer - **M**

- **Goal:** collapsed Review fits 390x844 with no scroll; all tweaks move into one
  scrollable drawer; format leaves the collapsed view.
- **Files:** `src/screens/ReviewScreen.tsx` (split body); `src/App.tsx` (props
  unchanged).
- **Behavior:** collapsed = strip preview + Edit + Save/Share + Take Again. Edit
  opens the drawer (Output->Layout->Color->Look->Props->Caption->Session->Shots->Browse
  Templates->Save All->Take Again). Primary actions stay docked above the scroll.
- **Test:** at 390x844 & 430x932, `editOpen=false` -> `scrollHeight<=clientHeight`;
  Edit/Save >=44px; format only appears in the drawer.
- **Risk:** dynamic-type pushing the action row off-screen -- clamp preview height.
- **Deps:** none. **Blocks:** N3, N4, P3.

### N2 -- Template catalog data + gating - **S**

- **Goal:** ship the top-12 catalog with `category` + `caption`.
- **Files:** port the data shape from `ROUND2_TEMPLATE_CATALOG.ts` into
  `src/lib/templates.ts`; `src/lib/templates.test.ts` (extend).
- **Behavior:** `STYLE_PRESETS` = 12; `TEMPLATE_BACKLOG` = 18; helpers
  `presetsByCategory`, `findStylePreset` (searches both).
- **Test:** every preset's premium-ness matches its layout/look/sticker via
  `entitlements`; ids unique; `satisfies StylePreset` compiles.
- **Risk:** existing persisted `bb.strip.*` referencing removed preset ids ->
  `findStylePreset` returns null gracefully (already handled).
- **Deps:** none. **Blocks:** N3, P1.

### N3 -- Template Gallery screen - **L**

- **Goal:** browse templates by category, previews rendered from demo frames.
- **Files:** new `src/screens/TemplateGalleryScreen.tsx`; `src/App.tsx` (add
  `showTemplates`, route); `src/screens/IdleScreen.tsx` (Templates card);
  `src/screens/ReviewScreen.tsx` (Browse Templates button -> `onBrowseTemplates`).
- **Behavior:** category tab strip; 2-col grid (3/4/5 at larger sizes); each card
  uses `composeStrip` with the preset layout/theme plus `watermark:false`,
  `cell:120`, filter, sticker, and caption; Pro badge on locked cards.
- **Test:** all 12 render; switching category filters; cards cached by
  `presetId+demoSet`; tap opens detail.
- **Risk:** 30-card render jank -> cache canvases + render lazily on scroll.
- **Deps:** N2. **Blocks:** N4.

### N4 -- Template detail + Apply/Start - **M**

- **Goal:** large preview + Start Booth / Apply to Current.
- **Files:** reuse `src/ui/OverlayScreen.tsx`; `src/App.tsx`
  (`applyStylePreset` already exists; wire routing).
- **Behavior:** Start Booth = apply preset -> Camera; Apply to Current = apply ->
  Review (only when a capture exists). Free path.
- **Test:** Start Booth sets layout+theme+filter+sticker+caption then opens
  camera; preview matches the eventual strip.
- **Risk:** applying a Pro preset while not Pro -- must route to N-paywall, not
  silently downgrade (see P3).
- **Deps:** N3.

### N5 -- Edge/empty/error states - **M**

- **Goal:** ship the unhappy paths in SCREEN_SPECS (camera denied, empty gallery,
  failed import, generating, share fallback).
- **Files:** `IdleScreen.tsx` (error Callout already supported), `GalleryScreen.tsx`
  (empty state), `App.tsx` (import error copy), `ReviewScreen.tsx` (generating +
  share fallback already present -- verify copy).
- **Behavior:** specific messages; recovery actions (Open Settings / Choose Again
  / Take Photos / Done).
- **Test:** revoke camera -> Home + message; pick 2 files -> "Need 4 photos"; empty
  IndexedDB -> empty state, never blank grid.
- **Risk:** message drift -- centralize strings.
- **Deps:** none.

---

## PRO VALUE

### P1 -- Subscription product ($1.99/mo) - **L**

- **Goal:** retarget billing from the $0.99 one-time to a $1.99/month
  auto-renewable "BoothBop Pro".
- **Files:** `src/lib/purchases.ts` (add `PRO_MONTHLY_ID =
"com.boothbop.app.pro.monthly"`, `getProProduct`, `subscribe`, keep
  `restorePurchases`); `src/lib/storePlugin.ts`; `ios/App/App/AppDelegate.swift`
  (StoreKit 2 subscription + a `BoothBop.storekit` config); `docs/IAP.md`,
  `docs/MONETIZATION.md` (update).
- **Behavior:** `isPro` now reflects an active subscription; cached in `bb.pro`;
  re-checked on launch (`refreshPro`). All existing gates keep keying off
  `isPro` -- no gate rewrites.
- **Test:** StoreKit config sheet in simulator; subscribe -> `isPro=true`,
  watermark drops, Pro templates unlock; restore; lapse -> downgrade (existing
  effect in `App.tsx` already resets premium filter/layout/sticker/quality).
- **Risk:** App Review wants real recurring value before approving a sub -- N3/N4/
  P2 must be in the same build; subscription needs a privacy/terms link + manage
  link (3.1.2). **Fallback:** keep the $0.99 non-consumable + add a $7.99 lifetime
  unlock (P1-alt) if a sub is rejected/declined.
- **Deps:** none (gate exists). **Blocks:** P3.

### P1-alt -- One-time fallback (documented, build only if needed) - **M**

- **Goal:** if subscription is rejected, ship $0.99 Remove-Watermark (today) +
  $7.99 lifetime "Pro Unlock" non-consumable.
- **Tradeoff:** no recurring revenue; "new templates monthly" becomes free
  goodwill; simpler review. Keep all Pro gates identical (still `isPro`).
- **Files:** same as P1 minus the subscription type.

### P2 -- Pro looks + sticker packs + tint overlay - **L**

- **Goal:** ship the 10 looks + 8 sticker packs from RENDERING_SPECS.
- **Files:** `src/lib/render.ts` (extend `FilterDef.overlay` with tint branch;
  add `FILTERS` entries; add glyph drawers + pack grouping); `src/lib/entitlements.ts`
  (`PREMIUM_FILTERS`/`PREMIUM_STICKERS` add new Pro keys); `render.test.ts`.
- **Behavior:** new looks/props appear in the Review drawer + templates; Pro ones
  gated; face-safe placement (T-STK-FACE).
- **Test:** every look has a css string + optional overlay; no glyph enters the
  central 60% box across all demo frames; export parity (T-PARITY).
- **Risk:** canvas-filter support on old WebViews -> existing try/catch + overlay
  fallback.
- **Deps:** none.

### P3 -- Paywall + triggers - **L**

- **Goal:** the $1.99/mo paywall, full-screen + bottom-sheet, from all triggers.
- **Files:** new `src/screens/ProScreen.tsx`; `src/App.tsx` (`showPro`,
  `proContext`); `ReviewScreen.tsx` (locked rows open paywall with context);
  `SettingsScreen.tsx` (Pro card replaces $0.99 row); template detail (N4).
- **Behavior:** triggers = apply locked Pro template (primary), locked
  look/layout/props/caption, HD quality, Party Mode, Settings. Localized price;
  Restore/Terms/Privacy; <=80-word copy.
- **Test:** each trigger opens the sheet with the right headline; price loads;
  purchase->unlock+dismiss; failure inline; "already Pro" hides triggers.
- **Risk:** copy creep over 80 words; price race before product loads -> "$1.99/mo"
  placeholder then swap.
- **Deps:** P1, N4.

### P4 -- Custom caption (Pro) + baked-caption renderer (T-CAP) - **M**

- **Goal:** wire `preset.caption` to the footer for all tiers; Pro custom caption
  overrides.
- **Files:** `src/lib/strip.ts` (`composeStrip` watermark branch draws caption
  below logo -- T-CAP); `ReviewScreen.tsx` (Caption field, 24-char max, Pro-gated);
  `strip.test.ts`.
- **Behavior:** free strips show baked caption + logo + date; Pro custom caption
  replaces baked; `{brand}` token from Settings.
- **Test:** caption <=24 chars; long caption steps font down then ellipsizes; date
  still renders; parity across export paths.
- **Risk:** footer height on `2x6`/`story` -- font auto-fit (RENDERING_SPECS).
- **Deps:** P2 (optional), N1.

---

## APP STORE POLISH

### A1 -- Screenshot generation from demo sets - **M**

- **Goal:** produce the 6-frame set (ROUND2_APP_STORE_FRAMES) at 1290x2796.
- **Files:** `fastlane/screenshots/`, `scripts/gen-assets.mjs` or a small
  capture route using `DEMO`/`VITE_DEMO=1` + `loadSampleFrames`.
- **Behavior:** deterministic frames from `src/demo/`; captions overlaid per the
  frames doc.
- **Test:** all 6 render at the exact size; only shipped/near-term features shown;
  event frame labeled "concept".
- **Risk:** implying future features are shipped -- enforce labels.
- **Deps:** N3, P3.

### A2 -- Metadata + IAP copy - **S**

- **Files:** `fastlane/metadata/`, `docs/APP_STORE.md`, `docs/IAP.md`.
- **Behavior:** subscription display name/description, privacy "Data Not
  Collected" stays true (no SDK), restore + terms present.
- **Deps:** P1.

---

## EVENT MODE LATER (near-term: Party Mode ONLY)

### E1 -- Party Mode (single device) - **L**

- **Goal:** locked shoot->review->share->auto-reset with an exit passcode; one fixed
  template; no print/QR/backend.
- **Files:** new `src/lib/partyMode.ts` (config/flag in `bb.party.*`), new
  `src/screens/PartyExitModal.tsx`, `SettingsScreen.tsx` (setup entry),
  `App.tsx` (wrap Camera->Review; hide nav; force preset; auto-reset timer).
- **Behavior:** guests can't reach Home/Settings/Gallery without the passcode;
  Review shows Share + Next only; auto-reset after N seconds; Guided-Access
  reminder.
- **Test:** passcode gates exit; auto-reset returns to capture; preset fixed;
  refresh keeps Party Mode on (flag persisted).
- **Risk:** web can't truly lock the app -- copy is explicit that Guided Access
  does real lockdown; passcode gates in-app exit only.
- **Deps:** N1, N4, P1 (Party Mode is Pro).

---

## DO NOT BUILD YET

Events dashboard - Create-event wizard (6 steps) - Event setup checklist -
Branded kiosk attract/welcome - Separate kiosk guest flow - Event gallery + cover
composites - QR guest sharing - AirPrint/print setup - uploaded/custom template
backgrounds - cloud sync / accounts / any backend. Each needs a backend,
multi-device sync, hardware, or a much larger surface -- out of scope for this
sprint. Revisit after Party Mode + Pro prove out.

---

## Suggested order (max visible impact)

1. **N2 -> N1 -> N3 -> N4** (templates + resolved Review = the visible product jump)
2. **P2 -> P4** (more looks/props/captions = more to sell)
3. **P1 -> P3** (turn on $1.99/mo with real value already in place)
4. **N5** (harden states) -> **A1/A2** (App Store) -> **E1** (Party Mode)
