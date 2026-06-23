# PhotoBlast 📸

Turn your phone into a selfie photo booth. Prop up your phone in selfie mode,
tap start, and PhotoBlast snaps **four photos back to back** on a countdown —
just like scrambling for funny shots in a real booth. Then turn them into a
downloadable **photo strip** (4×1 or 2×2), an animated **GIF**, or a short
looping **video**.

Inspired by [PartyParty](https://partyparty.app). Runs entirely in the browser —
no uploads, no server. Your photos never leave your device.

## Features

- 🎬 4-shot countdown sequence with flash + "strike a pose" pacing
- 🖼️ Photo strip in **Strip (4×1)** or **Grid (2×2)** layouts
- 🎨 Theme swatches for the strip border
- 🎞️ Export as **PNG strip**, **animated GIF**, or **video** (MP4/WebM)
- ⏱️ Adjustable shutter delay (1–3 s)
- 📱 Mobile-first, front-facing (selfie) camera support
- 📤 **Share** (native share sheet) or **Save** (download) any output
- 🗂️ **Private on-device gallery** — every session is auto-saved locally (IndexedDB); re-open, re-share, or delete anytime
- 🔒 100% client-side — nothing is uploaded

## Saving & sharing

- **Share** opens the native share sheet (Messages, Save Image to camera roll,
  AirDrop, …). On desktop browsers without file sharing it falls back to a
  download.
- **Save** downloads the file directly.

Everything is generated on-device; nothing is ever uploaded.

## Private on-device gallery

Every booth session is **automatically saved to your device** (via IndexedDB)
and shown under **My Photos** (on the home screen and via **Go to Album** after a
shoot). It's your phone acting as private storage — no cloud, no accounts,
nothing uploaded. From the gallery you can re-open a session, **Share**/**Save**
it again, or **delete** it; **Clear all** wipes everything. The app also requests
persistent storage so the browser is less likely to evict your photos (most
durable when installed as a PWA).

## Install it like an app (and use it offline)

PhotoBlast is a PWA, so you can add it to your home screen and it runs
fullscreen with its own icon.

- **iPhone (Safari):** tap **Share** → **Add to Home Screen** → **Add**.
- **Android / desktop Chrome:** browser menu → **Install app** / **Add to
  Home Screen**.

A service worker precaches the whole app on first visit, so after that it
**works offline** — no connection required to take photos or export a strip,
GIF, or video. (The very first load needs internet to download the app, and an
internet connection is only needed again to pick up future updates.) Everything
runs on-device; nothing is ever uploaded.

## Tech

- [Vite](https://vitejs.dev) + [React](https://react.dev) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- `getUserMedia` + `<canvas>` for capture/compositing
- [`gifenc`](https://github.com/mattdesl/gifenc) for GIF encoding
- `MediaRecorder` for video export

## Local development

```bash
npm install
npm run dev
```

Then open the printed URL. Camera access requires a secure context, which
`localhost` satisfies; on other hosts you need HTTPS.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## Deploying to GitHub Pages

This repo ships a workflow (`.github/workflows/deploy.yml`) that builds and
deploys to GitHub Pages on every push to `main`.

**One-time setup:** in the repo go to **Settings → Pages → Build and
deployment → Source** and choose **GitHub Actions**. Push to `main` (or run the
workflow manually) and the site publishes to
`https://<your-username>.github.io/photoblast/`.

The Vite `base` path is set to `/photoblast/` in `vite.config.ts`. If you fork
to a different repo name or use a custom domain, override it at build time:

```bash
BASE_PATH=/your-repo/ npm run build
```
