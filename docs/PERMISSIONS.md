# Photos permission — decision chart

How BoothBop's auto-save-to-Photos handles every access state and transition.
The goal: **auto-save only runs with the access it needs, the toggle never lies
about its state, and the user always has a clear next step.**

## The rule

- **Album destination → needs FULL access** (`PHAccessLevel.readWrite`,
  `NSPhotoLibraryUsageDescription`). Creating/managing a named album is
  impossible with anything less.
- **Camera-roll destination → needs ADD-ONLY** (`PHAccessLevel.addOnly`,
  `NSPhotoLibraryAddUsageDescription`). "Limited"/"Select Photos" still allows
  adding, so it counts as enough here.
- We **only prompt on an explicit user action** (turning a format on, or
  switching destination while on). On launch and after each capture we only
  _re-check_ — never prompt out of the blue.
- iOS shows the system prompt **once** (when `notDetermined`). After that,
  re-requesting returns the current status silently — so when access is
  insufficient and already-determined, we point the user to **iOS Settings**
  (via the in-app "Open iOS Settings" button → `BoothBopPhotos.openSettings`).

## iOS status → our result (`src/lib/photosAlbum.ts`)

| `PHAuthorizationStatus`   | reported as              | album OK?         | camera-roll OK?   |
| ------------------------- | ------------------------ | ----------------- | ----------------- |
| `.authorized`             | `granted`                | ✅                | ✅                |
| `.limited`                | `limited`                | ❌ (needs full)   | ✅                |
| `.denied` / `.restricted` | `denied`                 | ❌                | ❌                |
| `.notDetermined`          | `notDetermined`→(prompt) | depends on prompt | depends on prompt |
| (web / no native)         | `unsupported`            | n/a               | n/a               |

## Entry points → behavior (`applyAutosave` in App.tsx)

| Trigger                              | Prompt?               | If access sufficient                            | If NOT sufficient                                                                                     |
| ------------------------------------ | --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Toggle a format ON**               | Yes (`requestAccess`) | Enable it; clear error.                         | Revert **all** toggles off; show the access message + "Open iOS Settings".                            |
| **Toggle a format OFF**              | No (`checkAccess`)    | Keep remaining toggles; clear error if all off. | (only reached if others still on) revert all off + message.                                           |
| **Switch destination** (while ≥1 on) | Yes                   | Keep toggles for the new dest.                  | Revert all off + message for the new dest.                                                            |
| **App launch** (auto-save on)        | **No**                | Keep on, silently.                              | Revert all off; set the Settings message (seen when they open Settings). Never prompts.               |
| **Capture completes** (auto-save on) | **No**                | Save the enabled formats.                       | Skip silently (don't nag mid-capture).                                                                |
| **Open Settings**                    | **No**                | —                                               | Re-checks, so returning from iOS Settings after granting clears the error and the user can re-toggle. |

## The messages (`autosaveAccessMessage`)

- **Album + `limited`**: "BoothBop has limited Photos access. Saving to an album
  needs Full Access — set Photos to 'All Photos' in iOS Settings…"
- **Album + `denied`/`notDetermined`-after-deny**: "Saving to a BoothBop album
  needs Full Photos Access. Allow it in iOS Settings (or switch to Camera
  Roll)…"
- **Camera roll + `denied`**: "Photos access is off. Allow it in iOS Settings…"

Each is shown in the Settings screen with an **Open iOS Settings** button.

## Worked scenarios

1. **First-ever enable, taps "Allow Full Access"** → prompt → `granted` → toggle
   stays on, saves from next capture. ✅
2. **First-ever enable, taps "Limited / Select Photos" (album)** → prompt →
   `limited` → toggles revert, "needs All Photos" message + Open Settings. User
   fixes in Settings → returns → re-toggles → `granted`. ✅
3. **First-ever enable, taps "Don't Allow"** → `denied` → revert + message +
   Open Settings (no further prompts possible; Settings is the only path). ✅
4. **Camera roll, taps "Allow"/"Limited"** → `granted`/`limited` → enabled. ✅
5. **Granted before, user revokes in iOS Settings, relaunches** → launch
   `checkAccess` → `denied` → toggles auto-revert; message waiting in Settings.
   No surprise prompt. ✅
6. **Switch album → camera roll** with full access already → camera-roll needs
   only add-only, which full access covers → stays on. ✅
7. **Switch camera roll → album** with only add-only granted → `requestAccess`
   returns `limited`/insufficient (can't auto-upgrade) → revert + Open Settings. ✅

## Not yet handled (future)

- A one-tap **`presentLimitedLibraryPicker`** path (only relevant if we ever let
  "limited" satisfy the album — currently we require full, so N/A).
- Re-prompting is impossible after a deny by iOS design; the Open-Settings
  deep-link is the supported remedy.
