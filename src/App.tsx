import { useEffect, useMemo, useRef, useState } from "react";
import { captureSquareFrame, startCamera, stopCamera } from "./lib/camera";
import { composeStrip, THEMES, type Layout } from "./lib/strip";
import { encodeGif } from "./lib/gif";
import { encodeVideo, isVideoSupported } from "./lib/video";

type Phase = "idle" | "preview" | "capturing" | "review";

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
  const [busy, setBusy] = useState<null | "gif" | "video">(null);

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
    setPhase("review");
  }

  function retake() {
    setFrames([]);
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

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function downloadStrip() {
    composeStrip(frames, layout, THEMES[themeKey]).toBlob((blob) => {
      if (blob) download(blob, `photoblast-${stamp()}.png`);
    }, "image/png");
  }

  async function downloadGif() {
    setBusy("gif");
    try {
      await wait(30); // let the spinner paint
      download(encodeGif(frames), `photoblast-${stamp()}.gif`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadVideo() {
    setBusy("video");
    try {
      const { blob, extension } = await encodeVideo(frames);
      download(blob, `photoblast-${stamp()}.${extension}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't record the video.");
    } finally {
      setBusy(null);
    }
  }

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

      {phase === "review" && stripUrl && (
        <ReviewScreen
          stripUrl={stripUrl}
          layout={layout}
          setLayout={setLayout}
          themeKey={themeKey}
          setThemeKey={setThemeKey}
          busy={busy}
          error={error}
          onDownloadStrip={downloadStrip}
          onDownloadGif={downloadGif}
          onDownloadVideo={downloadVideo}
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
  stripUrl,
  layout,
  setLayout,
  themeKey,
  setThemeKey,
  busy,
  error,
  onDownloadStrip,
  onDownloadGif,
  onDownloadVideo,
  onRetake,
}: {
  stripUrl: string;
  layout: Layout;
  setLayout: (l: Layout) => void;
  themeKey: keyof typeof THEMES;
  setThemeKey: (k: keyof typeof THEMES) => void;
  busy: null | "gif" | "video";
  error: string | null;
  onDownloadStrip: () => void;
  onDownloadGif: () => void;
  onDownloadVideo: () => void;
  onRetake: () => void;
}) {
  const videoOk = isVideoSupported();
  return (
    <div className="flex flex-1 flex-col items-center py-4">
      <img
        src={stripUrl}
        alt="Your photo strip"
        className="max-h-[52vh] w-auto rounded-2xl shadow-2xl"
      />

      {/* Layout toggle */}
      <div className="mt-5 flex gap-2 rounded-full bg-white/5 p-1">
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

      {/* Theme swatches */}
      <div className="mt-4 flex gap-3">
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

      {/* Downloads */}
      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        <button
          onClick={onDownloadStrip}
          className="col-span-2 rounded-2xl bg-pink-500 py-3.5 font-bold transition active:scale-95"
        >
          ⬇️ Download Photo Strip
        </button>
        <button
          onClick={onDownloadGif}
          disabled={busy !== null}
          className="rounded-2xl bg-white/10 py-3.5 font-semibold transition active:scale-95 disabled:opacity-50"
        >
          {busy === "gif" ? "Making GIF…" : "🎞️ GIF"}
        </button>
        <button
          onClick={onDownloadVideo}
          disabled={busy !== null || !videoOk}
          title={videoOk ? "" : "Video recording isn't supported in this browser"}
          className="rounded-2xl bg-white/10 py-3.5 font-semibold transition active:scale-95 disabled:opacity-50"
        >
          {busy === "video" ? "Recording…" : "🎬 Video"}
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

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .replace(/\..+/, "");
}
