import { useEffect, useMemo, useRef, useState } from "react";
import { captureSquareFrame, startCamera, stopCamera } from "./lib/camera";
import { composeStrip, THEMES, type Layout } from "./lib/strip";
import { encodeGif } from "./lib/gif";
import { encodeVideo, isVideoSupported } from "./lib/video";
import { canShareFiles, isIOS, probeShareFiles } from "./lib/platform";
import {
  blobToCanvas,
  canvasToBlob,
  clearSessions,
  deleteSession,
  listSessions,
  requestPersistence,
  saveSession,
  type Session,
} from "./lib/gallery";
import { ALBUM_NAME, SHORTCUT_URL } from "./config";

type Phase = "idle" | "preview" | "capturing" | "review";
type Format = "strip" | "gif" | "video";

interface MediaResult {
  url: string;
  blob: Blob;
  filename: string;
}

const SHOTS = 4;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frames, setFrames] = useState<HTMLCanvasElement[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [layout, setLayout] = useState<Layout>("4x1");
  const [themeKey, setThemeKey] = useState<keyof typeof THEMES>("classic");
  const [error, setError] = useState<string | null>(null);

  const [format, setFormat] = useState<Format>("strip");
  const [generating, setGenerating] = useState<null | "gif" | "video">(null);
  const [gifResult, setGifResult] = useState<MediaResult | null>(null);
  const [videoResult, setVideoResult] = useState<MediaResult | null>(null);

  const [note, setNote] = useState<string | null>(null);
  const [showSaveHelp, setShowSaveHelp] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [shareFilesOk, setShareFilesOk] = useState(false);
  useEffect(() => setShareFilesOk(probeShareFiles()), []);
  // Best-effort: ask the browser to keep the private gallery through eviction.
  useEffect(() => requestPersistence(), []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Attach the live stream whenever we are showing the camera.
  useEffect(() => {
    if (phase !== "preview" && phase !== "capturing") return;
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [phase]);

  // Release the camera when the component goes away.
  useEffect(() => () => stopCamera(streamRef.current), []);

  function clearResults() {
    setGifResult((r) => (r && URL.revokeObjectURL(r.url), null));
    setVideoResult((r) => (r && URL.revokeObjectURL(r.url), null));
  }

  async function openCamera() {
    setError(null);
    try {
      streamRef.current = await startCamera();
      setFrames([]);
      setPhase("preview");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't access the camera. Check browser permissions.",
      );
    }
  }

  async function runSequence() {
    setPhase("capturing");
    const captured: HTMLCanvasElement[] = [];
    setFrames([]);
    await wait(500);

    for (let shot = 0; shot < SHOTS; shot++) {
      for (let n = 3; n >= 1; n--) {
        setCountdown(n);
        await wait(720);
      }
      setCountdown(null);

      setFlash(true);
      const video = videoRef.current;
      if (video) {
        const frame = captureSquareFrame(video);
        captured.push(frame);
        setFrames([...captured]);
      }
      await wait(240);
      setFlash(false);
      if (shot < SHOTS - 1) await wait(750); // quick "pose!" gap
    }

    stopCamera(streamRef.current);
    streamRef.current = null;

    // Auto-save this session to the private on-device gallery.
    try {
      const photos = await Promise.all(captured.map((c) => canvasToBlob(c)));
      await saveSession(photos);
    } catch {
      /* storage is best-effort — never block the flow on it */
    }

    setFormat("strip");
    setPhase("review");
  }

  function retake() {
    clearResults();
    setFrames([]);
    setFormat("strip");
    openCamera();
  }

  // Strip preview (re-rendered when frames / layout / theme change).
  const stripUrl = useMemo(() => {
    if (frames.length < SHOTS) return null;
    return composeStrip(frames, layout, THEMES[themeKey]).toDataURL("image/png");
  }, [frames, layout, themeKey]);

  const thumbs = useMemo(
    () => frames.map((f) => f.toDataURL("image/jpeg", 0.7)),
    [frames],
  );

  // Switching format lazily generates the GIF / video the first time.
  async function selectFormat(f: Format) {
    setFormat(f);
    setError(null);
    setNote(null);
    if (f === "gif" && !gifResult) await ensureGif();
    if (f === "video" && !videoResult) await ensureVideo();
  }

  async function ensureGif() {
    setGenerating("gif");
    try {
      await wait(30); // let the spinner paint before the (sync) encode
      const blob = encodeGif(frames);
      setGifResult({
        url: URL.createObjectURL(blob),
        blob,
        filename: `photoblast-${stamp()}.gif`,
      });
    } catch {
      setError("Couldn't create the GIF.");
    } finally {
      setGenerating(null);
    }
  }

  async function ensureVideo() {
    if (!isVideoSupported()) {
      setError("Video recording isn't supported in this browser.");
      return;
    }
    setGenerating("video");
    try {
      const { blob, extension } = await encodeVideo(frames);
      setVideoResult({
        url: URL.createObjectURL(blob),
        blob,
        filename: `photoblast-${stamp()}.${extension}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't record the video.");
    } finally {
      setGenerating(null);
    }
  }

  // Resolve the blob + filename for whatever format is currently shown.
  async function currentMedia(): Promise<MediaResult | null> {
    if (format === "gif") return gifResult;
    if (format === "video") return videoResult;
    const blob = await stripBlob(frames, layout, THEMES[themeKey]);
    return { url: "", blob, filename: `photoblast-${stamp()}.png` };
  }

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Opens the native share sheet with the image file so the user can tap their
  // "Save to <album>" Shortcut, Save Image, or send it on. Falls back to a
  // plain download where file sharing is missing. Shared by review + gallery.
  async function shareFile(blob: Blob, filename: string) {
    setError(null);
    setNote(null);
    const file = new File([blob], filename, { type: blob.type });

    if (!canShareFiles(file)) {
      triggerDownload(blob, filename);
      return;
    }

    try {
      // Image-only payload (no `text`) so an "Images only" Shortcut accepts it.
      await navigator.share({ files: [file], title: "Photoblast Photo" });
      if (isIOS()) {
        setNote(`Tip: in the Share Sheet, tap “Save to ${ALBUM_NAME} Album”.`);
      }
    } catch (e) {
      const name = (e as Error)?.name;
      if (name === "AbortError") {
        setNote("Save canceled."); // user dismissed the sheet — no scary error
      } else {
        triggerDownload(blob, filename); // graceful fallback
      }
    }
  }

  // Primary "Save to iPhone" on the review screen.
  async function saveToPhone() {
    const media = await currentMedia();
    if (media) await shareFile(media.blob, media.filename);
  }

  async function downloadCurrent() {
    const media = await currentMedia();
    if (media) triggerDownload(media.blob, media.filename);
  }

  const previewUrl =
    format === "strip"
      ? stripUrl
      : format === "gif"
        ? (gifResult?.url ?? null)
        : (videoResult?.url ?? null);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4">
      {phase === "idle" && (
        <IdleScreen
          onStart={openCamera}
          onOpenGallery={() => setShowGallery(true)}
          error={error}
        />
      )}

      {(phase === "preview" || phase === "capturing") && (
        <CameraScreen
          videoRef={videoRef}
          phase={phase}
          countdown={countdown}
          flash={flash}
          thumbs={thumbs}
          onStart={runSequence}
        />
      )}

      {phase === "review" && (
        <ReviewScreen
          format={format}
          onSelectFormat={selectFormat}
          previewUrl={previewUrl}
          generating={generating}
          layout={layout}
          setLayout={setLayout}
          themeKey={themeKey}
          setThemeKey={setThemeKey}
          error={error}
          note={note}
          shareFilesOk={shareFilesOk}
          onSave={saveToPhone}
          onDownload={downloadCurrent}
          onShowSaveHelp={() => setShowSaveHelp(true)}
          onRetake={retake}
        />
      )}

      <SaveHelp open={showSaveHelp} onClose={() => setShowSaveHelp(false)} />
      {showGallery && (
        <GalleryScreen
          onClose={() => setShowGallery(false)}
          onSave={shareFile}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- screens */

function IdleScreen({
  onStart,
  onOpenGallery,
  error,
}: {
  onStart: () => void;
  onOpenGallery: () => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="text-7xl">📸</div>
      <h1 className="mt-4 text-5xl font-black tracking-tight">PhotoBlast</h1>
      <p className="mt-3 max-w-xs text-pretty text-white/70">
        Your phone is the photo booth. Tap start, strike four poses back to
        back, then grab your strip, GIF, or video.
      </p>

      <button
        onClick={onStart}
        className="mt-8 rounded-full bg-pink-500 px-10 py-4 text-lg font-bold shadow-lg shadow-pink-500/30 transition active:scale-95"
      >
        Insert Coin — Start
      </button>

      <button
        onClick={onOpenGallery}
        className="mt-3 text-sm font-semibold text-white/70 underline-offset-4 hover:underline"
      >
        🖼️ My Photos
      </button>

      <ol className="mt-10 space-y-1 text-sm text-white/50">
        <li>1. Allow camera access</li>
        <li>2. Prop up your phone in selfie mode</li>
        <li>3. Strike a pose on each countdown ✨</li>
      </ol>

      <p className="mt-6 text-xs font-medium text-white/40">
        🔒 No accounts · No uploads · No cloud
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <InstallHint />
    </div>
  );
}

/** Detect whether we're already running as an installed (standalone) app. */
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function InstallHint() {
  const [open, setOpen] = useState(false);

  // Already installed? Nothing to prompt.
  if (isStandalone()) return null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div className="mt-10 w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        <span>📲 Install as an app</span>
        <span className="text-white/40">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2 text-sm text-white/60">
          {isIOS ? (
            <ol className="space-y-1.5">
              <li>
                1. Tap the <strong>Share</strong> button{" "}
                <span className="text-white/40">(square with an ↑)</span> in
                Safari's toolbar.
              </li>
              <li>
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                3. Tap <strong>Add</strong> — PhotoBlast lands on your home
                screen and opens fullscreen, like a real app.
              </li>
            </ol>
          ) : (
            <ol className="space-y-1.5">
              <li>
                1. Open your browser menu{" "}
                <span className="text-white/40">(⋮ or the address bar)</span>.
              </li>
              <li>
                2. Choose <strong>Install app</strong> /{" "}
                <strong>Add to Home Screen</strong>.
              </li>
              <li>3. Launch it anytime from your home screen.</li>
            </ol>
          )}
          <p className="pt-1 text-xs text-white/40">
            Once installed it works offline — no connection needed.
          </p>
        </div>
      )}
    </div>
  );
}

function CameraScreen({
  videoRef,
  phase,
  countdown,
  flash,
  thumbs,
  onStart,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  phase: Phase;
  countdown: number | null;
  flash: boolean;
  thumbs: string[];
  onStart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />

        {phase === "capturing" && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-sm font-semibold backdrop-blur">
            <span className="pulse inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            {thumbs.length}/{SHOTS}
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              key={countdown}
              className="countpop text-[10rem] font-black leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
            >
              {countdown}
            </span>
          </div>
        )}

        {flash && <div className="flash absolute inset-0 bg-white" />}
      </div>

      {/* Filling photo slots */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {Array.from({ length: SHOTS }).map((_, i) => (
          <div
            key={i}
            className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5"
          >
            {thumbs[i] && (
              <img
                src={thumbs[i]}
                alt={`Shot ${i + 1}`}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 text-center">
        {phase === "preview" ? (
          <button
            onClick={onStart}
            className="w-full rounded-full bg-pink-500 px-8 py-4 text-lg font-bold shadow-lg shadow-pink-500/30 transition active:scale-95"
          >
            Take 4 Photos
          </button>
        ) : (
          <p className="text-white/60">Strike a pose! 💃</p>
        )}
      </div>
    </div>
  );
}

function ReviewScreen({
  format,
  onSelectFormat,
  previewUrl,
  generating,
  layout,
  setLayout,
  themeKey,
  setThemeKey,
  error,
  note,
  shareFilesOk,
  onSave,
  onDownload,
  onShowSaveHelp,
  onRetake,
}: {
  format: Format;
  onSelectFormat: (f: Format) => void;
  previewUrl: string | null;
  generating: null | "gif" | "video";
  layout: Layout;
  setLayout: (l: Layout) => void;
  themeKey: keyof typeof THEMES;
  setThemeKey: (k: keyof typeof THEMES) => void;
  error: string | null;
  note: string | null;
  shareFilesOk: boolean;
  onSave: () => void;
  onDownload: () => void;
  onShowSaveHelp: () => void;
  onRetake: () => void;
}) {
  const videoOk = isVideoSupported();
  const tabs: { id: Format; label: string; disabled?: boolean }[] = [
    { id: "strip", label: "🖼️ Strip" },
    { id: "gif", label: "🎞️ GIF" },
    { id: "video", label: "🎬 Video", disabled: !videoOk },
  ];
  const isBusy = generating !== null;

  return (
    <div className="flex flex-1 flex-col items-center py-4">
      {/* Format tabs */}
      <div className="flex w-full gap-1 rounded-full bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectFormat(t.id)}
            disabled={t.disabled}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition disabled:opacity-30 ${
              format === t.id ? "bg-pink-500" : "text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live preview of the selected output */}
      <div className="mt-4 flex min-h-[48vh] w-full items-center justify-center">
        {isBusy ? (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-pink-500" />
            {generating === "gif" ? "Making your GIF…" : "Recording your video…"}
          </div>
        ) : format === "video" && previewUrl ? (
          <video
            src={previewUrl}
            className="max-h-[48vh] w-auto rounded-2xl shadow-2xl"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={`Your ${format}`}
            className="max-h-[48vh] w-auto rounded-2xl shadow-2xl"
          />
        ) : null}
      </div>

      {/* Strip-only styling controls */}
      {format === "strip" ? (
        <>
          <div className="mt-4 flex gap-2 rounded-full bg-white/5 p-1">
            {(["4x1", "2x2"] as Layout[]).map((l) => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  layout === l ? "bg-pink-500" : "text-white/60"
                }`}
              >
                {l === "4x1" ? "Strip" : "Grid"}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-3">
            {Object.entries(THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setThemeKey(key)}
                aria-label={key}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  themeKey === key ? "border-white scale-110" : "border-white/20"
                }`}
                style={{ background: theme.background }}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 text-center text-xs text-white/40">
          {format === "gif" ? "GIF" : "Video"} uses your four photos in sequence.
        </p>
      )}

      {/* Save (opens the iOS share sheet) */}
      <button
        onClick={onSave}
        disabled={isBusy || !previewUrl}
        className="mt-5 w-full rounded-2xl bg-pink-500 py-4 text-lg font-bold transition active:scale-95 disabled:opacity-50"
      >
        {shareFilesOk ? "📲 Save to iPhone" : "⬇️ Download Photo"}
      </button>

      {shareFilesOk && (
        <button
          onClick={onDownload}
          disabled={isBusy || !previewUrl}
          className="mt-2 text-sm font-semibold text-white/55 underline-offset-4 hover:underline disabled:opacity-50"
        >
          or just download the file
        </button>
      )}

      {note && (
        <p className="mt-3 text-center text-sm text-white/75">{note}</p>
      )}

      <p className="mt-3 max-w-xs text-center text-xs text-white/40">
        Photos stay on this device. PhotoBlast never uploads or stores them.
      </p>

      <button
        onClick={onShowSaveHelp}
        className="mt-3 text-xs font-semibold text-pink-300 underline-offset-4 hover:underline"
      >
        How to save into a {ALBUM_NAME} album →
      </button>

      <button
        onClick={onRetake}
        className="mt-5 text-sm font-semibold text-white/60 underline-offset-4 hover:underline"
      >
        ↻ Retake
      </button>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}

function SaveHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#15131f] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Save into a {ALBUM_NAME} album</h2>
          <button onClick={onClose} className="px-2 text-xl text-white/50">
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-white/60">
          iPhone won't let a web app drop photos straight into your Photos
          library. A tiny one-time Shortcut fixes that — then saving is two taps.
        </p>

        <h3 className="mt-4 text-sm font-bold text-white/80">Every time</h3>
        <ol className="mt-2 space-y-1.5 text-sm text-white/70">
          <li>
            1. Tap <strong>Save to iPhone</strong>.
          </li>
          <li>
            2. In the Share Sheet, tap{" "}
            <strong>Save to {ALBUM_NAME} Album</strong>.
          </li>
          <li>
            3. Find them in{" "}
            <strong>Photos → Albums → {ALBUM_NAME}</strong>.
          </li>
        </ol>

        <h3 className="mt-4 text-sm font-bold text-white/80">
          One-time setup
        </h3>
        {SHORTCUT_URL ? (
          <>
            <a
              href={SHORTCUT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-2xl bg-pink-500 py-3 text-center font-bold"
            >
              Install the Save Shortcut
            </a>
            <ol className="mt-2 space-y-1 text-sm text-white/70">
              <li>
                1. Tap <strong>Install the Save Shortcut</strong> above.
              </li>
              <li>
                2. Tap <strong>Add Shortcut</strong>.
              </li>
              <li>3. Done — that's it.</li>
            </ol>
            <p className="mt-2 text-xs text-white/50">
              The shortcut makes your {ALBUM_NAME} album by itself the first time
              you save — you never have to create it.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/60">
              No shortcut link is set up yet. You can build a smart one in the{" "}
              <strong>Shortcuts</strong> app that creates the album on its own:
            </p>
            <ol className="mt-2 space-y-1.5 text-sm text-white/70">
              <li>
                1. New shortcut → turn on <strong>Show in Share Sheet</strong>,
                accepted input <strong>Images</strong>.
              </li>
              <li>
                2. <strong>Find Albums</strong> where Name is{" "}
                <strong>{ALBUM_NAME}</strong>.
              </li>
              <li>
                3. <strong>If</strong> the result has no items →{" "}
                <strong>Create Album</strong> named <strong>{ALBUM_NAME}</strong>.
              </li>
              <li>
                4. <strong>Save to Album</strong> → the {ALBUM_NAME} album, using
                the Shortcut Input.
              </li>
              <li>
                5. Name it <strong>Save to {ALBUM_NAME} Album</strong>.
              </li>
            </ol>
            <p className="mt-2 text-xs text-white/50">
              The <strong>Create Album</strong> action needs a recent iOS; on
              current versions this works and no manual album is required.
            </p>
          </>
        )}

        <h3 className="mt-4 text-sm font-bold text-white/80">
          Don't see the shortcut?
        </h3>
        <p className="mt-2 text-sm text-white/60">
          Scroll to the end of the Share Sheet, tap{" "}
          <strong>Edit Actions…</strong>, and add{" "}
          <strong>Save to {ALBUM_NAME} Album</strong>.
        </p>

        <p className="mt-4 rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-white/50">
          🔒 No accounts. No uploads. No cloud. The camera runs only in your
          browser, photos are made on your device, and the Shortcut saves them
          straight to your Photos app. You can inspect or delete the Shortcut
          anytime.
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-white/10 py-3 font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function GalleryScreen({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (blob: Blob, filename: string) => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const stripBlobRef = useRef<Blob | null>(null);

  const reload = () => listSessions().then(setSessions);
  useEffect(() => {
    reload();
  }, []);

  // Compose the selected session's strip on demand.
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (!selected) {
      setStripUrl(null);
      stripBlobRef.current = null;
      return;
    }
    (async () => {
      const canvases = await Promise.all(selected.photos.map((b) => blobToCanvas(b)));
      const strip = composeStrip(canvases, "4x1", THEMES.classic);
      const blob = await new Promise<Blob>((res) =>
        strip.toBlob((b) => res(b!), "image/png"),
      );
      if (cancelled) return;
      stripBlobRef.current = blob;
      url = URL.createObjectURL(blob);
      setStripUrl(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [selected]);

  async function removeSelected() {
    if (!selected) return;
    await deleteSession(selected.id);
    setSelected(null);
    reload();
  }

  async function clearAll() {
    if (!window.confirm("Delete all saved photos from this device?")) return;
    await clearSessions();
    setSelected(null);
    reload();
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#0b0b12]">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">My Photos</h2>
          <button onClick={onClose} className="px-2 text-xl text-white/60">
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-white/40">
          🔒 Saved privately on this device only — never uploaded.
        </p>

        {sessions === null ? (
          <p className="mt-16 text-center text-white/50">Loading…</p>
        ) : sessions.length === 0 ? (
          <div className="mt-16 text-center text-white/50">
            <div className="text-5xl">🖼️</div>
            <p className="mt-3">No photos yet.</p>
            <p className="text-sm text-white/40">
              Your booth sessions are saved here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {sessions.map((s) => (
                <Cover
                  key={s.id}
                  blob={s.photos[0]}
                  onClick={() => setSelected(s)}
                />
              ))}
            </div>
            <button
              onClick={clearAll}
              className="mt-6 w-full text-sm font-semibold text-red-300/80 underline-offset-4 hover:underline"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Detail view for the selected session */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-black/80 px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex w-full max-w-md flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="self-end px-2 text-xl text-white/60"
            >
              ✕
            </button>
            {stripUrl ? (
              <img
                src={stripUrl}
                alt="Saved strip"
                className="max-h-[60vh] w-auto rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="flex h-40 items-center text-white/50">Loading…</div>
            )}

            <button
              onClick={() => {
                if (stripBlobRef.current) {
                  onSave(stripBlobRef.current, `photoblast-${stamp()}.png`);
                }
              }}
              disabled={!stripUrl}
              className="mt-5 w-full rounded-2xl bg-pink-500 py-3.5 font-bold transition active:scale-95 disabled:opacity-50"
            >
              📲 Save to iPhone
            </button>
            <button
              onClick={removeSelected}
              className="mt-3 text-sm font-semibold text-red-300/80 underline-offset-4 hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Grid thumbnail that owns its object URL lifecycle. */
function Cover({ blob, onClick }: { blob: Blob; onClick: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <button
      onClick={onClick}
      className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5 transition active:scale-95"
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </button>
  );
}

/* ----------------------------------------------------------------- helpers */

function stripBlob(
  frames: HTMLCanvasElement[],
  layout: Layout,
  theme: (typeof THEMES)[keyof typeof THEMES],
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    composeStrip(frames, layout, theme).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("strip failed"))),
      "image/png",
    );
  });
}

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
}
