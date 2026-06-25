# Releasing BoothBop (automated)

Goal: ship updates with **one command** instead of the Xcode GUI + the App
Store Connect web form. Auth is an **App Store Connect API key** (bypasses 2FA,
so it runs headless).

## One-time setup

1. **App Store Connect API key** — App Store Connect → Users and Access →
   Integrations → Keys → **+**. Role: **App Manager** (or Admin). Download the
   `AuthKey_XXXXXXXXXX.p8` — ⚠️ **it can only be downloaded once.** Then add to
   `~/.config/afino/secrets.env`:

   ```
   APPCONNECT_KEY_ID=XXXXXXXXXX
   APPCONNECT_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   APPCONNECT_KEY_PATH=/Users/afinoblake/.config/afino/AuthKey_XXXXXXXXXX.p8
   ```

   _Status: ✅ all three set in `~/.config/afino/secrets.env`
   (`AuthKey_95WM8G5FQ8.p8` stored at `~/.config/afino/`, perms 600)._

2. **Tooling:** `brew install fastlane` (or `bundle install` — there's a
   `Gemfile`). Optionally `brew install asc` for the JSON-first
   [App Store Connect CLI](https://github.com/rorkai/App-Store-Connect-CLI).

3. **Signing (for headless builds):** the simplest path is Xcode-managed
   automatic signing (works when run on this Mac with the dev account logged in).
   For fully unattended/CI builds, set up **`fastlane match`** (certs + profiles
   in a private git repo) — `fastlane match init`, then `match appstore`.

## Releasing

From the repo root, after `source ~/.config/afino/secrets.env`:

```bash
bundle exec fastlane beta       # build + upload to TestFlight
bundle exec fastlane release    # build + upload + push listing + submit for review
bundle exec fastlane metadata   # push listing/screenshots only (no new build)
```

- `prepare` runs `npm run build && npx cap sync ios` (plain prod build — no demo
  loader / sample photos).
- `release` submits with **manual release** (you click Release after approval).
- Bump the version/build first: edit `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`
  in `ios/App/App.xcodeproj/project.pbxproj` (or `fastlane increment_*`).

## Listing copy

Lives as files under `fastlane/metadata/` (generated from `docs/APP_STORE.md`).
Edit those and run `fastlane metadata` to push — no web form. Update
`en-US/release_notes.txt` for each version's "What's New."

## Screenshots

Drop the 6.9″ PNGs (1320×2868) into `fastlane/screenshots/en-US/`; `deliver`
uploads them. To regenerate: `npm run build:demo && npx cap sync ios`, run on an
iPhone 17 Pro Max simulator, tap a **Demo** button, ⌘S.

_TODO (future autonomy): auto-load a demo set + theme on launch via a flag so
the simulator capture is fully scriptable (`xcrun simctl … screenshot`) with no
manual taps._

## If you can't find the .p8

The private key downloads only once. If it's lost: App Store Connect → Keys →
**revoke** the old key → create a new one → download the `.p8` immediately →
drop it in `~/Downloads` (or tell Claude the path) and update `secrets.env`.
