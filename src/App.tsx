import { useEffect, useMemo, useRef, useState } from "react";
import { captureSquareFrame, startCamera, stopCamera } from "./lib/camera";
import { composeStrip, THEMES, type Layout } from "./lib/strip";
import { encodeGif } from "./lib/gif";
import { encodeVideo, isVideoSupported } from "./lib/video";

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

  async function shareCurrent() {
    const media = await currentMedia();
    if (!media) return;
    const file = new File([media.blob], media.filename, {
      type: media.blob.type,
    });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    try {
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "PhotoBlast" });
      } else {
        // No file-sharing support (e.g. desktop) — fall back to a download.
        triggerDownload(media.blob, media.filename);
      }
    } catch (e) {
      // The user dismissing the share sheet throws AbortError — ignore that.
      if ((e as Error)?.name !== "AbortError") {
        setError("Couldn't open the share sheet.");
      }
    }
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
      {phase === "idle" && <IdleScreen onStart={openCamera} error={error} />}

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
          onShare={shareCurrent}
          onDownload={downloadCurrent}
          onRetake={retake}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- screens */

function IdleScreen({
  onStart,
  error,
}: {
  onStart: () => void;
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

      <ol className="mt-10 space-y-1 text-sm text-white/50">
        <li>1. Allow camera access</li>
        <li>2. Prop up your phone in selfie mode</li>
        <li>3. Strike a pose on each countdown ✨</li>
      </ol>

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
  onShare,
  onDownload,
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
  onShare: () => void;
  onDownload: () => void;
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

      {/* Share + download */}
      <div className="mt-5 grid w-full grid-cols-2 gap-3">
        <button
          onClick={onShare}
          disabled={isBusy || !previewUrl}
          className="rounded-2xl bg-pink-500 py-3.5 font-bold transition active:scale-95 disabled:opacity-50"
        >
          📤 Share
        </button>
        <button
          onClick={onDownload}
          disabled={isBusy || !previewUrl}
          className="rounded-2xl bg-white/10 py-3.5 font-semibold transition active:scale-95 disabled:opacity-50"
        >
          ⬇️ Save
        </button>
      </div>

      <button
        onClick={onRetake}
        className="mt-4 text-sm font-semibold text-white/60 underline-offset-4 hover:underline"
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
