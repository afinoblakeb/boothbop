# Monetization plan

> Status for 0.1.0: deferred. This release has no StoreKit product, paywall,
> subscription, or paid feature gate. Every creative control in the binary is
> available for free. BoothBop branding remains on exported media.

## Why monetization is deferred

The first App Store build had to establish reliable launch and capture behavior.
The next release needs to establish whether consumers repeatedly create and
share strips. Charging before those two contracts are proven adds review risk
and makes product feedback harder to interpret.

The June subscription prototype is preserved in git on
`codex/prototype-june-2026`; it is not part of the 0.1.0 runtime.

## Free 0.1.0 contract

- Four-shot capture, retake, reorder, and local gallery.
- Strip, GIF, ping-pong loop, and video exports.
- All layouts, looks, props, templates, captions, colors, and quality choices.
- Import from the photo library and Save All.
- BoothBop branding on generated outputs.
- No accounts, uploads, analytics, ads, or tracking.

## Future decision gate

Do not restore StoreKit until the paid offer has recurring consumer value and a
complete test plan. Before implementation, decide between:

1. A one-time branding removal and export upgrade.
2. A subscription backed by recurring template and creative-tool releases.

Either path must include StoreKit transaction observation at launch, purchase
and restore tests, offline entitlement behavior, App Store metadata, and a
clear free-versus-paid contract. Core capture, editing, saving, and sharing
remain free.

## Architectural seam

The renderers retain an explicit `watermark` input. That is an implementation
seam, not an active entitlement. A future paid tier can route one tested
entitlement through that seam without scattering purchase logic through UI
components.
