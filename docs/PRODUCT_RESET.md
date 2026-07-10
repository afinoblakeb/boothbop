# BoothBop Product Reset

Date: 2026-07-10

## Decision

Restart product development from the exact App Store release
`0.0.1 (0.0.2)` at commit `465876d`.

The `codex/0.1.0` and `codex/prototype-june-2026` branches are preserved as a
prototype library. They are not production branches and must not be merged as a
feature bundle. Useful work may be reimplemented or cherry-picked surgically
only after a feature passes this process.

## Product Definition

BoothBop is a consumer lifestyle app that recreates the emotional payoff of a
classic photo booth on a phone.

The core job is:

> Take four poses, receive a great classic photo strip, and save or share it
> without setup or explanation.

The product is successful when that loop feels immediate, dependable, and fun.
It is not successful because it contains many editing controls.

## Released Product Inventory

The baseline already carries more surface area than the core promise:

- Four-photo countdown capture with selfie mirroring.
- Classic 4x1 strip and 2x2 grid.
- Six strip colors.
- Strip, GIF, and looping-video output.
- Save/share and a private local gallery.
- Per-format export quality settings.
- Native automatic saving to Photos.
- PWA installation and PhotoBlast migration UI.

These are existing obligations, not automatic endorsements. We may simplify
their presentation when evidence shows they compete with the core loop.

## Baseline Audit

The audit used the released source, production build, iOS Release build, fresh
simulator install, and a browser camera journey at 320x568, 390x844, and 430x932.

### What Works

- The standard-size review screen keeps the output and Save action visible.
- The default layout is the classic 4x1 strip.
- Camera readiness checks avoid capturing a dead video stream.
- The app is local-first and does not require accounts or uploads.
- `npm run check` passes 59 unit tests with no lint, type, or format failures.
- The production web build succeeds and is under 1 MB precached.

### Release Blockers Before New Features

1. **Compact-device overflow.** At 320x568, the home reports a 336 px scroll
   width and the review reports 322 px. The logo and color controls visibly
   clip horizontally. The home also grows to 659 px tall.
2. **Weak native launch proof.** A fresh iPhone 17e simulator run initially
   produced a blank cream WebView. The app eventually rendered after delayed
   simulator WebKit startup, but the current smoke gate failed after 45 seconds
   and does not prove that the BoothBop home screen appeared.
3. **No core journey automation.** The 59 tests cover gallery, Photos,
   platform, settings, strip geometry, and video selection. They do not operate
   the home, camera, countdown, review, or Save/Share flow.
4. **Competing home hierarchy.** My Photos appears in both the top bar and main
   body. On the PWA, the installation card can occupy more space than the booth
   action.
5. **Control density.** Settings exposes auto-save destination, four format
   toggles, and three quality choices for each medium. This is significant
   configuration for a product whose promise is no-setup capture.
6. **Silent best-effort failures.** Gallery persistence, pregeneration, and
   automatic Photos saving suppress some failures. The core capture continues,
   which is good, but users can lack confirmation when expected persistence
   fails.

### Protected Strengths

Future work must not regress these parts of the baseline:

- One obvious primary capture action.
- Classic 4x1 as the default.
- Output preview visible with Save/Share.
- No login, upload, analytics, ads, or tracking.
- Offline operation after installation.
- Camera permission loss and dead-stream handling.

## Release 0.0.3: Quality Foundation

The owner approved four narrowly defined, early-user-proven additions as an
explicit exception to the normal one-feature cadence: optional branding, five
distinct looks, Boom as a GIF toggle, and Retake One. The complete contract is
in `docs/QUALITY_RELEASE_0.0.3.md`; no other prototype capability is included.
Its acceptance criteria are:

- No horizontal overflow from 320x568 through current Pro Max dimensions.
- Fresh-install simulator tests wait for and recognize the real BoothBop home,
  not a black, cream, or native splash frame.
- Automated browser coverage completes home -> camera -> four captures ->
  review -> Save for compact, standard, and large phone sizes.
- Camera denial, storage failure, and share cancellation have visible,
  accurate outcomes.
- The native app launches from a clean install across the supported simulator
  size range and recognizes real BoothBop UI rather than a nonblank frame.
- Every new option produces consistent preview and exported output.
- Retake cancellation and failure preserve the original four photos.
- The release archives cleanly and is ready for an optional personal-device
  spot-check before distribution.

## Feature Selection Rules

A feature may enter a release only when it has:

- One named consumer problem.
- Evidence that the problem occurs in the core or repeat-use journey.
- A simpler alternative that was considered and rejected with a reason.
- Explicit non-goals.
- Failure, empty, permission, offline, and compact-device states.
- A removal plan if testing shows it makes the booth less intuitive.

Score candidates from 1 to 5 on:

| Factor     | High Score Means                                    |
| ---------- | --------------------------------------------------- |
| Core value | Directly improves capture, strip quality, or saving |
| Frequency  | Helps most sessions rather than an edge case        |
| Simplicity | Requires little or no explanation                   |
| Confidence | Supported by user evidence or observed failure      |
| Risk       | Small regression and maintenance surface            |

No feature is selected solely because a prototype exists.

## Ranked Candidate Backlog

This is a ranking, not a 12-month commitment. Re-score after every release.

| Rank | Candidate                             | User Problem                                             | Current Position                                             |
| ---: | ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
|    0 | Reliability and compact-device polish | The core loop must work everywhere                       | Mandatory 0.0.3 foundation; not counted as a feature         |
|    1 | Retake one photo                      | One blink currently forces all four photos to be retaken | Approved for the 0.0.3 foundation                            |
|    2 | Five focused looks                    | Users want a few meaningfully different finished styles  | Approved for 0.0.3; no catalog expansion                     |
|    3 | Reorder four photos                   | The best sequence may not match capture order            | Useful only if the interaction stays obvious                 |
|    4 | Custom strip caption                  | Users want to mark an occasion or date                   | Keep to one short footer field                               |
|    5 | Save the complete set                 | Saving multiple desired formats is repetitive            | Validate whether users actually want multiple outputs        |
|    6 | Ping-pong motion loop                 | A back-and-forth loop is more playful and shareable      | Approved as the 0.0.3 GIF Boom toggle                        |
|    7 | Import four existing photos           | Users may want a strip after the moment passed           | Valuable but shifts the product away from live booth capture |
|    8 | One story-sized layout                | Vertical sharing crops the classic strip                 | One layout with clear output intent                          |
|    9 | One occasion template                 | Users want a finished birthday or wedding keepsake       | Test one complete template before a catalog                  |
|   10 | Favorite a session                    | Larger galleries make important sets harder to find      | Wait for evidence of repeat gallery use                      |
|   11 | Print-ready 2x6 export                | Some users want a physical booth keepsake                | Requires real printer and dimension validation               |
|   12 | One playful prop interaction          | Groups may enjoy a lightweight visual joke               | Low priority because it can cheapen output and crowd editing |

## Prototype Reuse Policy

Potentially reusable after review:

- Hardened simulator process handling and home-screen recognition.
- Browser journey tests and viewport fixtures.
- Retake and reorder sequence logic.
- Individual filter recipes when one look is selected.
- Guarded App Store distribution automation.

Quarantined until separately justified:

- The multi-tab editor and complete feature drawer.
- Thirty templates, fifteen looks, and large prop packs.
- Party/operator mode, print UI, subscription, and paywall code.
- Any bulk merge from `codex/0.1.0`.

## Monthly Decision Record

At the end of each cycle, record:

1. What user problem was selected?
2. What evidence supported it?
3. What shipped, changed, or was held?
4. What did physical and TestFlight testing reveal?
5. Did the core loop become clearer, faster, or more dependable?
6. What candidate should be evaluated next?

Shipping nothing is acceptable when the feature does not meet the quality bar.
