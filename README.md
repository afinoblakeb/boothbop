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
- 🔒 100% client-side — nothing is uploaded

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
