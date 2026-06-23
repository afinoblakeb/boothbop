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
- 📱 Mobile-first, front-facing (selfie) camera support
- 📲 **Save to iPhone** via the native share sheet — straight into a Photos album with an optional Shortcut
- 🗂️ **Private on-device gallery** — every session is auto-saved locally (IndexedDB); re-open, re-save, or delete anytime
- 🔒 100% client-side — nothing is uploaded

## Saving to your iPhone (and a Photoblast album)

The **Save to iPhone** button opens the iOS share sheet with the generated
image, so you can **Save Image** to your camera roll, send it in **Messages**,
or — with a tiny one-time Shortcut — drop it straight into a dedicated
**Photoblast** album.

> iOS deliberately doesn't let a web app write to your Photos library or create
> albums directly. A user-installed Shortcut bridges that gap. There is no cloud
> and no server — the Shortcut saves on-device to your own Photos app.

Once the Shortcut is installed, onboarding is just **Install → Add Shortcut →
Done**, and every save is two taps.

**You build and publish the Shortcut once** — see
[`docs/SHORTCUT.md`](docs/SHORTCUT.md) for the exact ~60-second recipe. In short:
in the **Shortcuts** app, add a **Save to Photo Album** action targeting a
**Photoblast** album, enable **Show in Share Sheet** (Images only), name it
**Save to Photoblast Album**, then **Share → Copy iCloud Link**. Paste that link
into `VITE_SHORTCUT_URL` (see below) to light up the in-app install button.

Without a link configured, the in-app help walks users through building the
Shortcut themselves. If file sharing isn't available (e.g. desktop browsers),
the button falls back to a normal download.

## Private on-device gallery

Every booth session is **automatically saved to your device** (via IndexedDB)
and shown under **My Photos** on the home screen. It's your phone acting as
private storage — no cloud, no accounts, nothing uploaded. From the gallery you
can re-open a session, **Save to iPhone** again, or **delete** it; **Clear all**
wipes everything. The app also requests persistent storage so the browser is
less likely to evict your photos (most durable when installed as a PWA).

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

### Optional: wire up the Save Shortcut

Once you've built and shared the iCloud Shortcut (see above), enable the
one-tap install button by setting its link at build time:

```bash
VITE_SHORTCUT_URL=https://www.icloud.com/shortcuts/xxxxxxxx npm run build
```

You can also hard-code it in `src/config.ts`. The album name lives there too
(`ALBUM_NAME`, default `Photoblast`).
