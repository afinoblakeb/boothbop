# BoothBop Release Playbook

This is the canonical path from a clean source commit to App Review. It uses
Xcode cloud-managed signing, Apple's `altool` uploader, and the App Store
Connect API. It does not depend on the Xcode organizer or App Store Connect web
forms.

Apple still reviews every new binary. The automation removes the repetitive
local and App Store Connect work; it does not bypass review.

## Safety Model

- `npm run appstore:status` is read-only.
- `build` runs every quality gate, archives, exports, and validates an IPA. It
  does not upload unless `--upload` is present.
- Upload and submission require a clean worktree whose `HEAD` has the exact
  release tag `appstore-v<VERSION>-build-<BUILD>`.
- App Review submission additionally requires `--confirm-submit`.
- New versions use `AFTER_APPROVAL`, so Apple publishes them automatically
  after approval. There is no second manual release step.
- The script refuses to create a submission while another submission is active.

## One-Time Credentials

The existing App Manager API key is stored outside this public repository. The
script reads process environment variables first, then
`~/.config/afino/secrets.env`:

```bash
APPCONNECT_KEY_ID=...
APPCONNECT_ISSUER_ID=...
APPCONNECT_KEY_PATH=/absolute/path/to/AuthKey_....p8
```

Never commit the key or these values.

## Release Checklist

1. Choose one small release scope and create `docs/releases/<VERSION>.txt` with
   the customer-facing What's New text.
2. Set both `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in
   `ios/App/App.xcodeproj/project.pbxproj`.
3. Run the local candidate without network mutation:

   ```bash
   npm run appstore -- build --version 0.0.4 --build 0.0.4
   ```

   This runs `npm run check`, the complete Playwright suite, Capacitor sync, a
   signed Release archive/export, and Apple server-side IPA validation.

4. Review the candidate, commit it, and tag the exact commit:

   ```bash
   git tag appstore-v0.0.4-build-0.0.4
   git push origin HEAD --follow-tags
   ```

5. Upload and submit in one guarded command:

   ```bash
   npm run appstore -- release \
     --version 0.0.4 \
     --build 0.0.4 \
     --whats-new docs/releases/0.0.4.txt \
     --upload \
     --confirm-submit
   ```

The command repeats the quality gates, archives and validates the exact tagged
source, uploads the IPA, waits for Apple processing, creates or finds the App
Store version, attaches the build, updates the English What's New text, creates
the review item, and submits it for automatic release after approval.

For separate upload and submission steps:

```bash
npm run appstore -- build --version 0.0.4 --build 0.0.4 --upload
npm run appstore -- submit \
  --version 0.0.4 \
  --build 0.0.4 \
  --whats-new docs/releases/0.0.4.txt \
  --confirm-submit
```

## Status And Monitoring

Check Apple and the public storefront without opening a browser:

```bash
npm run appstore:status
npm run appstore:status -- --version 0.0.3
```

This Mac also has a daily 9:00 AM launch agent named
`com.boothbop.appstore-review-monitor`. It records state under
`~/.config/boothbop/` and shows a macOS notification when review state changes
or the target version becomes public.

Useful diagnostics:

```bash
launchctl print gui/$(id -u)/com.boothbop.appstore-review-monitor
tail -n 20 ~/.config/boothbop/review-monitor.log
```

## Failure Recovery

- If tests, archive, signing, validation, or upload fails, fix the cause and
  rerun. The script never advances to review after a failed command.
- If Apple processing times out, rerun only `submit`; it will find the uploaded
  build and continue.
- If App Store metadata is incomplete, Apple rejects the API submission with
  the same field-level error used by App Store Connect. Fix the field once in
  App Store Connect or extend this script to own it, then rerun `submit`.
- Never reuse a build number after Apple has accepted an upload.
- Never cancel an in-review version merely to test this automation.

## What Requires Review

| Change                                                                         | New Apple review?                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| New binary, code, capability, entitlement, or materially new functionality     | Yes                                                    |
| Data-only kill switch for functionality already present in the reviewed binary | No                                                     |
| Re-enable reviewed functionality that the same binary already contains         | No                                                     |
| Promotional text, price, subscription availability, or server content          | Usually no binary review                               |
| Downloaded JavaScript, executable logic, arbitrary UI definitions, or plugins  | Not allowed by BoothBop policy; ship a reviewed binary |

See `docs/REMOTE_CONFIG.md` for the narrow no-binary-release mechanism.
