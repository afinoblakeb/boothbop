# Summary

This review produced one clear correction: BoothBop should not chase business,
trade-show, or professional operator workflows right now. The consumer app is
already carrying too much host/event/operator language, and that is making the
core product harder to understand.

## Scope

- Total personas: 20
- Consumer launch personas: 16
- Consumer-adjacent event persona: 1
- Future-market/out-of-scope personas: 3
- Normalized findings: 53
- Launch-priority findings: 37

The future-market feedback is retained because it may matter later, but it
should not steer the first consumer launch.

## Hard Verdict

The product direction is currently overextended. The simple consumer promise is
strong: open the app, make a nostalgic four-photo strip/GIF, save it, share it,
and keep memories private. The interface and monetization are pulling away from
that promise by surfacing Party Setup, host codes, corporate templates, print
claims, disabled web Pro paths, and a monthly subscription before the free loop
has proven enough value.

## Highest-Signal Clusters

1. `hidden_core_outputs`
   GIF, Boom, Video, Print, retake, templates, and Save All are hidden behind
   Edit. Multiple personas thought BoothBop only produced a static strip.

2. `subscription_value_gap`
   The current $1.99/month offer is not consumer-grade. Reviewers repeatedly
   described it as a one-time template/watermark/caption unlock, not recurring
   value.

3. `save_share_ambiguity`
   Save / Share does not tell users whether the result goes to Photos, a share
   sheet, browser Downloads, the in-app gallery, or nowhere durable.

4. `home_screen_overload`
   The first screen asks users to understand too much: Take Photos, Browse
   Templates, Party Setup, My Photos, Import, install/PWA state, and sometimes
   demo/dev controls.

5. `target_market_focus`
   Party Mode, host exit codes, Guided Access, brand-ready templates, corporate
   categories, and event/admin copy leak into the consumer path.

6. `paywall_transparency`
   App Store/review docs, template counts, Print gating, watermark behavior, and
   web/PWA Pro behavior are not transparent enough for a paid launch.

7. `save_model_confusion`
   My Photos sounds like device Photos, but it is BoothBop local storage.
   Privacy copy also blurs "not uploaded" with "not stored."

8. `guest_mode_should_be_basic`
   Ordinary consumers want to hand the phone to friends/family safely. Basic
   guest flow should be free and simple; advanced party automation can be paid.

## Recommended Launch Direction

Refocus the first release on ordinary consumers:

1. Make the home screen a simple start surface with visible sample output.
2. Make the review screen show output tabs by default: Strip, GIF, Boom, Video.
3. Split saving from sharing, and make iOS native default to clear Save to Photos.
4. Rename My Photos to BoothBop Gallery unless it is truly the Photos library.
5. Remove Party Setup from the primary home path for consumer launch.
6. Remove or bury corporate/brand/operator language and templates.
7. Make one basic guest mode free: hide settings/gallery and reset after a set.
8. Do not ship monthly Pro as-is. Use one-time unlock or add visible recurring
   consumer value first.
9. Make free-vs-Pro explicit before users hit locked controls.
10. Fix App Store/review docs so they do not claim no paywall if Pro ships.

## Pro Implication

If the goal remains $1.99/month, reviewers expect recurring consumer value:
seasonal packs, friend/couple/family templates, monthly drops, richer text/sticker
tools, or strong social formats. Without that, the safer launch SKU is a
one-time unlock for watermark removal, captions, HD, and premium packs.
