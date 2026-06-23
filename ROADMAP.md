# Roadmap

## Now: a web SPA + installable PWA

PhotoBlast is a single-page app (Vite + React) deployed to **GitHub Pages** and
installable as a **PWA** (Add to Home Screen, works offline). This is the
primary target **for the foreseeable future** — all current work assumes the
web SPA.

## Later (maybe): native iOS + Android in the app stores

We may ship native apps to the **Apple App Store** and **Google Play**. We are
**not building this now** and intentionally avoid plumbing for it yet — but the
codebase is kept ready so the eventual port is small, not a rewrite.

### Planned approach: Capacitor (wrap, don't rewrite)

[Capacitor](https://capacitorjs.com) wraps the existing production web build
(`dist/`) in a thin native shell (WKWebView on iOS, Android WebView) and
publishes to both stores. It's the lowest-plumbing path for an existing web SPA
and reuses ~all of our code. When we do it, it adds these as **siblings of the
web app at the repo root**:

```
photoblast/
├── src/ index.html vite.config.ts   # the web app (unchanged, still the source of truth)
├── ios/                             # generated native Xcode project (committed)
├── android/                         # generated native Android project (committed)
└── capacitor.config.ts             # points Capacitor at dist/
```

The web app stays exactly where it is; native is additive.

### Why the current code is already a good fit

- **Browser APIs are isolated in `src/lib/`**, not scattered through the UI.
  `camera.ts` (getUserMedia), `platform.ts` (Web Share), and `gallery.ts`
  (IndexedDB) are the only places that touch platform capabilities. A native
  port swaps these for Capacitor plugins (`@capacitor/camera`,
  `@capacitor/share`, `@capacitor/filesystem`) without touching `App.tsx`.
- **The base path is already build-time configurable.** Pages needs
  `base: /photoblast/`; a native build serves from `/`. That's already a single
  `BASE_PATH` env override (`vite.config.ts`) — no code change.
- **Everything runs client-side.** No backend to stand up or auth to migrate.

### Design rules to keep the port cheap (follow these now)

1. **Route every platform capability through `src/lib/`.** Never call
   `navigator.mediaDevices`, `navigator.share`, or `indexedDB` directly from a
   component — add/extend a `lib/` module instead.
2. **Feature-detect, don't UA-sniff** for behavior (see `platform.ts`). Native
   shells report differently; capability checks keep working.
3. **Keep assets base-path-relative** via `import.meta.env.BASE_URL`.

### Explicitly deferred until we commit to native

Installing Capacitor, the `ios/`/`android/` projects, store metadata/signing,
push notifications, and native plugin wiring. None of this is in the repo yet —
by design.
