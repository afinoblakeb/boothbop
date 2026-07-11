# Remote Configuration Policy

Remote configuration gives BoothBop operational kill switches for capabilities
that Apple has already reviewed in the installed binary. It is not an
over-the-air code update system.

## Availability

The App Store 0.0.3 binary currently in review does not contain this client.
The next reviewed binary that includes it establishes the capability. Only
after that binary is live can its reviewed flags change without another binary
submission.

## Allowed Controls

`https://boothbop.com/config/v1.json` has one strict, versioned schema:

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "features": {
    "editor": true,
    "gif": true,
    "video": true,
    "boom": true,
    "retakeOne": true,
    "brandingControl": true
  }
}
```

These values can disable or re-enable only code compiled into the binary. The
client rejects unknown top-level fields, unknown feature names, unsupported
schema versions, malformed values, and attempts to enable a capability that the
binary itself excludes.

The schema intentionally contains no URLs, text, HTML, JavaScript, templates,
plugins, prices, product identifiers, or arbitrary UI definitions.

## Runtime Behavior

1. Bundled all-on defaults render immediately, so launch never depends on the
   network.
2. A valid cache up to seven days old is applied next.
3. BoothBop requests the same-origin JSON with no cookies, no referrer, no HTTP
   cache, and a two-second timeout.
4. A valid newer response replaces the cache. A malformed, older, unavailable,
   or timed-out response leaves the last safe state intact.
5. Strip creation and Save remain available even when all optional flags are
   off.

## Changing A Flag

1. Edit `public/config/v1.json`.
2. Increment `revision`; never decrease or reuse it.
3. Disable the smallest affected capability. Do not use flags to reveal a new
   unreviewed product feature.
4. Run `npm run check` and `npm run test:e2e`.
5. Commit and push to `main`; GitHub Pages deploys the JSON with the web app.
6. Verify the live document:

   ```bash
   curl -fsS https://boothbop.com/config/v1.json | jq .
   ```

Rollback means publishing a higher revision with the prior boolean values. A
client that has already cached the bad revision will then accept the newer safe
revision.

## Product Boundary

Use this mechanism for emergency shutdown, gradual operational enablement, and
re-enabling reviewed functionality. Use a normal App Store release for any new
feature, new media behavior, new screen, materially changed user experience, or
code change. When uncertain, assume review is required.
