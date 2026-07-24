# Current Agent Goal

Status: Active  
Branch: `codex/bopfx-living-portraits`  
Last narrowed: July 23, 2026

## Objective

Discover what differentiated, face-aware photo effects BoothBop can realistically
deliver with native Apple frameworks. Build deliberately lightweight native MVPs
of several promising approaches, test them on the available iPhone, and use the
evidence to choose what deserves production development.

In parallel, define an incremental architecture that moves camera, effects,
media processing, lifecycle, and eventually the primary iOS experience from
React/Capacitor to native Swift without destabilizing the released app.

This discovery objective supersedes the broader thread goal that called for one
fully production-hardened blockbuster feature. Do not mistake an MVP effect for
a release candidate.

## Required Outcomes

1. A capability matrix covering Vision, Core Image, Metal, ARKit face tracking,
   TrueDepth-dependent features, person segmentation, and relevant runtime
   checks across supported iPhone classes.
2. A small native Swift effects lab with multiple visibly distinct candidates.
3. A device run on Blerque, the paired iPhone 15 Pro, with comparative evidence
   and observations.
4. A ranked recommendation:
   - feasible baseline effects;
   - device-limited enhancements;
   - ideas not worth pursuing;
   - the strongest candidate for later production work.
5. An incremental migration plan from the Capacitor shell toward native Swift,
   with module boundaries and reversible milestones.

## Scope Boundaries

- Do not prepare, submit, or release an App Store build.
- Do not claim production readiness.
- Do not wire complete gallery persistence, every export format, monetization,
  or polished production UI into the experiment.
- Do not make ARKit the primary camera path if doing so compromises full-quality
  still capture, current camera reliability, or broad device support.
- Do not identify people, create face embeddings, or add cloud processing.
- Keep all processing on device.
- Preserve the released camera and lifecycle invariants in
  `docs/IOS_AGENT_CONTEXT.md`.
- Prefer native Swift implementations. React/TypeScript may expose a temporary
  bridge contract, but it must not own the effect rendering pipeline.

## Current Candidates

- Spectral Echo: landmark-aligned chromatic face repetitions.
- Funhouse: controlled landmark-centered facial warping.
- Cutout Chorus: person-segmented repeated silhouettes.
- Mirror Bloom: face-centered kaleidoscopic geometry.

The list is intentionally provisional. Remove weak candidates and add a better
one when device evidence justifies it.

## Checkpoints

- [x] Create a dedicated discovery branch and initial feature brief.
- [ ] Make the native renderer and bridge compile with focused tests green.
- [ ] Document framework and iPhone capability boundaries.
- [ ] Add a minimal native-only effects picker for device evaluation.
- [ ] Install and exercise the lab on Blerque.
- [ ] Rank candidates from evidence.
- [ ] Document the native migration architecture.
- [ ] Run `npm run check` and the applicable Xcode build gates.

## Compaction And Handoff Rule

After any context compaction or agent handoff:

1. Read this file, `docs/IOS_AGENT_CONTEXT.md`, and
   `docs/features/0.0.5-bopfx-living-portraits.md`.
2. Inspect `git status`, the current branch, and the latest commit.
3. Resume at the first unchecked checkpoint.
4. Keep this file updated when the objective, boundaries, decisions, or
   checkpoint status changes.
