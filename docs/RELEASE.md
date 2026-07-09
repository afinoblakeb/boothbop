# Releasing BoothBop

The release flow is intentionally staged. Verification and candidate creation
cannot upload anything. TestFlight upload is separate. App Store submission is
both separate and guarded by an explicit confirmation variable.

## Release identity

- Bundle ID: `com.boothbop.app`
- 0.1.0 marketing version: `0.1.0`
- 0.1.0 build number: `3`
- Xcode project: `ios/App/App.xcodeproj`
- Scheme: `App`

Increment the build number before every uploaded replacement, even when the
marketing version stays unchanged.

## Local verification

```bash
npm run check:all       # type, lint, format, unit, build, browser journeys
npm run ios:smoke       # fresh-install Release launch on the iPhone matrix
npm run ios:sync        # leave Xcode with the exact verified production bundle
```

The smoke test builds once, then cold-boots each requested simulator, uninstalls
any previous app, installs the Release app, rejects blank/black screenshots,
checks app-process launch failures, and shuts the simulator down. Override the
matrix when needed:

```bash
IOS_SMOKE_DEVICES="iPhone 17 Pro Max" npm run ios:smoke
```

## Fastlane stages

Install the pinned Ruby dependencies with `bundle install`. App Store Connect
API credentials are read only from environment variables:

```bash
APPCONNECT_KEY_ID=...
APPCONNECT_ISSUER_ID=...
APPCONNECT_KEY_PATH=/absolute/path/to/AuthKey_....p8
```

Never commit those values or the private key.

```bash
bundle exec fastlane ios verify      # no signing, upload, or remote mutation
bundle exec fastlane ios candidate   # verify + signed local IPA, no upload
bundle exec fastlane ios beta        # candidate + TestFlight upload
bundle exec fastlane ios metadata    # listing metadata only, no binary
```

There is no one-command release lane. Review submission is a separate guarded
operation and uses the build already selected in App Store Connect:

```bash
CONFIRM_APP_STORE_SUBMISSION=YES bundle exec fastlane ios submit
```

Do not run `beta`, `metadata`, or `submit` until the local candidate has been
installed and accepted on a physical iPhone.

## Physical-device gate

1. Run `npm run ios:sync`.
2. Open `ios/App/App.xcodeproj`.
3. Select the connected iPhone and the `App` scheme.
4. Confirm the signing team and run the Release candidate.
5. Delete any previous BoothBop install first to exercise a clean launch.
6. Test camera denial and grant, capture, retake, reorder, every editor tab,
   Strip/GIF/Loop/Video, Save / Share, Save All, import, and My Photos.
7. Reboot the phone, enable Airplane Mode, and launch again.

Record any defect before TestFlight upload. A new binary gets a new build number
and repeats the full verification sequence.

## Metadata

The App Store listing lives in `fastlane/metadata/`. Keep description, release
notes, privacy claims, and reviewer instructions synchronized with the binary.
The 0.1.0 binary has no in-app purchase or subscription flow, so no metadata may
claim otherwise.
