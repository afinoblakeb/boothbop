import { useEffect, useMemo, useRef, useState } from "react";
import { captureSquareFrame, startCamera, stopCamera } from "./lib/camera";
import { composeStrip, THEMES, type Layout } from "./lib/strip";
import { encodeGif } from "./lib/gif";
import { encodeVideo, isVideoSupported } from "./lib/video";
import {
  canShareFiles,
  isIOS,
  isNativeShell,
  probeShareFiles,
} from "./lib/platform";
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
import {
  BrandIcon,
  DownloadIcon,
  GearIcon,
  RefreshIcon,
  ShareIcon,
  TrashIcon,
} from "./icons";
import { loadWatermark } from "./lib/watermark";
import {
  loadAutosave,
  planAutosaveTasks,
  saveAutosaveDest,
  saveAutosaveFormat,
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
  type AutosaveTask,
} from "./lib/settings";
import { ensurePhotosPermission, saveToPhotos } from "./lib/photosAlbum";
import { nativeShareFile } from "./lib/nativeShare";

type Phase = "idle" | "preview" | "capturing" | "review";
type Format = "strip" | "gif" | "video";

interface MediaResult {
  url: string;
  blob: Blob;
  filename: string;
}

const SHOTS = 4;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Public asset, base-path aware.
const LOGO = `${import.meta.env.BASE_URL}logo-wide.png`;

// Vintage countdown: Ready (teal) → Set (mustard) → Go (orange).
const COUNTDOWN_COLOR: Record<number, string> = {
  3: "var(--color-teal)",
  2: "var(--color-mustard)",
  1: "var(--color-orange)",
};

const CAMERA_MSG = "BoothBop requires camera permission. Please try again.";

// The Chromium "install app" event (Android / desktop). Not in lib.dom.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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
  const [showGallery, setShowGallery] = useState(false);
  const [shareFilesOk, setShareFilesOk] = useState(false);
  // The horizontal BoothBop logo drawn in the strip footer (same mark as the
  // GIF/video watermark). Loaded once; the strip shows the text wordmark until
  // it's ready, then re-renders with the logo.
  const [brandLogo, setBrandLogo] = useState<HTMLImageElement | null>(null);

  // Auto-save-to-Photos settings (native iOS feature; opt-in, persisted).
  const [autosave, setAutosave] = useState<AutosaveSettings>(loadAutosave);
  const [showSettings, setShowSettings] = useState(false);
  const [autosaveTipSeen, setAutosaveTipSeen] = useState(
    () => localStorage.getItem("bb.autosave.tipSeen") === "1",
  );

  // Shutter delay (seconds counted down before each shot), persisted.
  const [delay, setDelay] = useState<number>(() => {
    const v = Number(localStorage.getItem("bb.delay"));
    return v === 1 || v === 2 || v === 3 ? v : 2;
  });
  useEffect(() => {
    localStorage.setItem("bb.delay", String(delay));
  }, [delay]);

  useEffect(() => setShareFilesOk(probeShareFiles()), []);
  // Best-effort: ask the browser to keep the private gallery through eviction.
  useEffect(() => requestPersistence(), []);
  // Preload the strip-footer logo.
  useEffect(() => {
    loadWatermark().then(setBrandLogo);
  }, []);

  // Native app: hide the launch splash as soon as React has mounted, rather
  // than letting it auto-hide on a timeout (which logs a warning).
  useEffect(() => {
    if (!isNativeShell()) return;
    import("@capacitor/splash-screen").then(({ SplashScreen }) => {
      SplashScreen.hide().catch(() => {});
    });
  }, []);

  // Detect arrival from the retired PhotoBlast app — its migration page links to
  // boothbop.com/?from=photoblast. Persist it so the welcome-back guidance
  // survives reloads until they've installed BoothBop.
  const [migrated, setMigrated] = useState(
    () => localStorage.getItem("bb.migrated") === "1",
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "photoblast") {
      localStorage.setItem("bb.migrated", "1");
      setMigrated(true);
      // Strip the marker so it doesn't linger on reload or get bookmarked.
      params.delete("from");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }
  }, []);

  // A migrated user gets a dedicated install-only landing (no photo UI) whose
  // sole job is to convert them to the new app. "Continue" is an escape hatch.
  const [migrationDismissed, setMigrationDismissed] = useState(
    () => localStorage.getItem("bb.migrationDismissed") === "1",
  );
  // Never show the install nudge or the PhotoBlast migration landing inside the
  // native App Store build — both point users to the web/PWA, which Apple rejects.
  const showMigration = migrated && !migrationDismissed && !isNativeShell();
  function dismissMigration() {
    localStorage.setItem("bb.migrationDismissed", "1");
    setMigrationDismissed(true);
  }

  // Capture the Chromium install prompt for a real one-tap "Add to Home
  // Screen" button (Android / desktop). iOS has no such event — handled with
  // visual steps instead.
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef(false); // set when the user cancels a session

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

  // If the user revokes camera permission (Settings, site controls, etc.),
  // send them home with a clear message.
  useEffect(() => {
    let status: PermissionStatus | undefined;
    navigator.permissions
      ?.query?.({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        s.onchange = () => {
          if (s.state === "denied") failToHome(CAMERA_MSG);
        };
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
    // failToHome only touches stable setters/refs, so a one-time bind is fine.
  }, []);

  // Bail to the home screen and explain why (camera lost / denied).
  function failToHome(msg: string) {
    abortRef.current = true;
    setCountdown(null);
    setFlash(false);
    stopCamera(streamRef.current);
    streamRef.current = null;
    setFrames([]);
    setPhase("idle");
    setError(msg);
  }

  function clearResults() {
    setGifResult((r) => (r && URL.revokeObjectURL(r.url), null));
    setVideoResult((r) => (r && URL.revokeObjectURL(r.url), null));
  }

  async function openCamera() {
    setError(null);
    abortRef.current = false;
    try {
      const stream = await startCamera();
      streamRef.current = stream;
      // If the camera track ends mid-use (revoked, taken by another app),
      // drop the user back home with the permission message.
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => failToHome(CAMERA_MSG));
      });
      setFrames([]);
      setPhase("preview");
    } catch (e) {
      setError(cameraError(e));
      setPhase("idle");
    }
  }

  // Stop everything and go back to the start screen.
  function cancelToHome() {
    abortRef.current = true;
    setCountdown(null);
    setFlash(false);
    stopCamera(streamRef.current);
    streamRef.current = null;
    setFrames([]);
    setError(null);
    setPhase("idle");
  }

  async function runSequence() {
    const video = videoRef.current;
    // Don't count down onto a dead/black stream — make sure we have real pixels.
    if (!video || !(await videoReady(video))) {
      setError("The camera isn't ready. Check camera access and try again.");
      return;
    }

    abortRef.current = false;
    setPhase("capturing");
    const captured: HTMLCanvasElement[] = [];
    setFrames([]);
    await wait(400);

    for (let shot = 0; shot < SHOTS; shot++) {
      for (let n = delay; n >= 1; n--) {
        if (abortRef.current) return;
        setCountdown(n);
        await wait(1000);
      }
      if (abortRef.current) return;
      setCountdown(null);

      setFlash(true);
      const frame = captureSquareFrame(video);
      captured.push(frame);
      setFrames([...captured]);
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

    // Native: auto-save the enabled formats to Photos in the background.
    void autoSaveToAlbum(captured, autosave);

    setFormat("strip");
    setPhase("review");
  }

  function retake() {
    clearResults();
    setFrames([]);
    setFormat("strip");
    openCamera();
  }

  // Reopen a saved session in the review screen so the user can get the strip,
  // GIF, or video (and re-share) from any past shoot — not just the strip.
  async function openSession(session: Session) {
    clearResults();
    setError(null);
    setNote(null);
    const canvases = await Promise.all(
      session.photos.map((b) => blobToCanvas(b)),
    );
    setFrames(canvases);
    setFormat("strip");
    setShowGallery(false);
    setPhase("review");
  }

  // Strip preview (re-rendered when frames / layout / theme change).
  const stripUrl = useMemo(() => {
    if (frames.length < SHOTS) return null;
    return composeStrip(frames, layout, THEMES[themeKey], brandLogo).toDataURL(
      "image/png",
    );
  }, [frames, layout, themeKey, brandLogo]);

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
      const watermarkImg = await loadWatermark();
      await wait(30); // let the spinner paint before the (sync) encode
      const blob = encodeGif(frames, { watermarkImg });
      setGifResult({
        url: URL.createObjectURL(blob),
        blob,
        filename: `boothbop-${stamp()}.gif`,
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
      const watermarkImg = await loadWatermark();
      const { blob, extension } = await encodeVideo(frames, { watermarkImg });
      setVideoResult({
        url: URL.createObjectURL(blob),
        blob,
        filename: `boothbop-${stamp()}.${extension}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't record the video.");
    } finally {
      setGenerating(null);
    }
  }

  // ---- Auto-save to Photos (native iOS) -----------------------------------

  function openSettings() {
    setShowSettings(true);
    dismissAutosaveTip();
  }

  function dismissAutosaveTip() {
    if (autosaveTipSeen) return;
    localStorage.setItem("bb.autosave.tipSeen", "1");
    setAutosaveTipSeen(true);
  }

  function changeAutosaveDest(dest: AutosaveDest) {
    saveAutosaveDest(dest);
    setAutosave((s) => ({ ...s, dest }));
  }

  // Turning a format on may surface that the user declined Photos access — in
  // which case we revert the toggle so it never lies about its state.
  async function toggleAutosaveFormat(format: AutosaveFormat, on: boolean) {
    saveAutosaveFormat(format, on);
    setAutosave((s) => ({ ...s, [format]: on }));
    if (!on || !isNativeShell()) return;
    if ((await ensurePhotosPermission(autosave.dest)) === "denied") {
      saveAutosaveFormat(format, false);
      setAutosave((s) => ({ ...s, [format]: false }));
      setNote(
        "Photos access is off — turn it on in Settings ▸ BoothBop ▸ Photos.",
      );
    }
  }

  // Encode one format's blob for auto-saving. Independent of the review-screen
  // encoders — this is opt-in background work, so a rare double-encode (if the
  // user also opens that tab) is acceptable.
  async function renderForAutosave(
    captured: HTMLCanvasElement[],
    task: AutosaveTask,
  ): Promise<Blob> {
    if (task.layout) return stripBlob(captured, task.layout, THEMES[themeKey]);
    const watermarkImg = await loadWatermark();
    if (task.format === "gif") return encodeGif(captured, { watermarkImg });
    const { blob } = await encodeVideo(captured, { watermarkImg });
    return blob;
  }

  // Fire-and-forget after a capture: save the enabled formats to Photos. Best-
  // effort throughout — never blocks or breaks the capture/review flow.
  async function autoSaveToAlbum(
    captured: HTMLCanvasElement[],
    settings: AutosaveSettings,
  ) {
    if (!isNativeShell()) return;
    const tasks = planAutosaveTasks(settings, {
      videoSupported: isVideoSupported(),
    });
    if (!tasks.length) return;
    if ((await ensurePhotosPermission(settings.dest)) === "denied") return;

    let savedAny = false;
    for (const task of tasks) {
      try {
        const blob = await renderForAutosave(captured, task);
        if (await saveToPhotos(blob, task.kind, settings.dest)) savedAny = true;
      } catch {
        /* per-task best-effort; never break the flow */
      }
    }
    if (savedAny) {
      setNote(
        settings.dest === "album"
          ? "Saved to your BoothBop album"
          : "Saved to Photos",
      );
    }
  }

  // Resolve the blob + filename for whatever format is currently shown.
  async function currentMedia(): Promise<MediaResult | null> {
    if (format === "gif") return gifResult;
    if (format === "video") return videoResult;
    const blob = await stripBlob(frames, layout, THEMES[themeKey]);
    return { url: "", blob, filename: `boothbop-${stamp()}.png` };
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

  // Open the native share sheet (Messages, Save Image, AirDrop, …). Falls back
  // to a download where file sharing isn't available (most desktops).
  async function shareMedia(blob: Blob, filename: string) {
    setError(null);
    setNote(null);

    // Native app: use the Capacitor share sheet, which (unlike Web Share in a
    // WKWebView) offers "Save Image" / "Save Video" to the Photos library.
    if (isNativeShell()) {
      try {
        await nativeShareFile(blob, filename);
      } catch (e) {
        const msg = (e as Error)?.message ?? "";
        if (/cancel/i.test(msg)) setNote("Share canceled.");
        else setError("Couldn't open the share sheet.");
      }
      return;
    }

    const file = new File([blob], filename, { type: blob.type });

    if (!canShareFiles(file)) {
      triggerDownload(blob, filename);
      return;
    }

    try {
      await navigator.share({ files: [file], title: "BoothBop" });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setNote("Share canceled."); // dismissed the sheet — not an error
      } else {
        triggerDownload(blob, filename); // graceful fallback
      }
    }
  }

  async function shareCurrent() {
    const media = await currentMedia();
    if (media) await shareMedia(media.blob, media.filename);
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
      <TopBar
        onHome={cancelToHome}
        onAlbum={() => setShowGallery(true)}
        onSettings={openSettings}
        showActions={phase !== "capturing" && !showMigration}
      />

      {phase === "idle" &&
        (showMigration ? (
          <MigrationScreen onContinue={dismissMigration} />
        ) : (
          <IdleScreen
            onStart={openCamera}
            onOpenGallery={() => setShowGallery(true)}
            installPrompt={installPrompt}
            error={error}
          />
        ))}

      {(phase === "preview" || phase === "capturing") && (
        <CameraScreen
          videoRef={videoRef}
          phase={phase}
          countdown={countdown}
          flash={flash}
          thumbs={thumbs}
          delay={delay}
          setDelay={setDelay}
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
          autosaveTip={isNativeShell() && !autosaveTipSeen}
          onOpenSettings={openSettings}
          onDismissTip={dismissAutosaveTip}
          onShare={shareCurrent}
          onDownload={downloadCurrent}
          onRetake={retake}
        />
      )}

      {showGallery && (
        <GalleryScreen
          onClose={() => setShowGallery(false)}
          onOpen={openSession}
        />
      )}

      {showSettings && (
        <SettingsScreen
          settings={autosave}
          native={isNativeShell()}
          videoSupported={isVideoSupported()}
          onDest={changeAutosaveDest}
          onToggle={toggleAutosaveFormat}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- nav bar */

function TopBar({
  onHome,
  onAlbum,
  onSettings,
  showActions,
}: {
  onHome: () => void;
  onAlbum: () => void;
  onSettings: () => void;
  showActions: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-2">
      <button
        onClick={onHome}
        aria-label="Home"
        className="font-display text-2xl uppercase tracking-wide text-ink"
      >
        Booth<span className="text-orange">Bop</span>
      </button>
      {showActions && (
        <div className="flex items-center gap-2">
          <button
            onClick={onAlbum}
            className="inline-flex items-center gap-1.5 border-2 border-ink bg-paper px-3 py-1 font-display text-lg uppercase tracking-wide text-ink transition active:translate-y-px active:bg-cream"
          >
            <BrandIcon name="gallery" className="h-5 w-5" />
            My Photos
          </button>
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="inline-flex items-center border-2 border-ink bg-paper p-1.5 text-ink transition active:translate-y-px active:bg-cream"
          >
            <GearIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}

/* ---------------------------------------------------------------- screens */

const btnPrimary =
  "inline-flex items-center justify-center gap-2 border-2 border-ink bg-orange text-cream font-display text-2xl uppercase tracking-wide transition active:bg-orange-dark active:translate-y-px disabled:opacity-40";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 border-2 border-ink bg-paper text-ink font-display text-xl uppercase tracking-wide transition active:bg-cream active:translate-y-px disabled:opacity-40";

function IdleScreen({
  onStart,
  onOpenGallery,
  installPrompt,
  error,
}: {
  onStart: () => void;
  onOpenGallery: () => void;
  installPrompt: InstallPromptEvent | null;
  error: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <img src={LOGO} alt="BoothBop" className="w-full max-w-xs" />

      <p className="mt-2 max-w-xs text-pretty font-sans text-base text-brown">
        Your phone is the photo booth. Tap the button, strike four poses, and
        grab your photo strip!
      </p>

      <button
        onClick={onStart}
        className={`mt-7 w-full max-w-xs px-8 py-5 text-3xl ${btnPrimary}`}
      >
        <BrandIcon name="camera" className="h-8 w-8" />
        Take Photos
      </button>

      <button
        onClick={onOpenGallery}
        className={`mt-3 w-full max-w-xs px-8 py-4 ${btnSecondary}`}
      >
        <BrandIcon name="gallery" className="h-7 w-7" />
        My Photos
      </button>

      <InstallCard installPrompt={installPrompt} />

      <p className="mt-8 font-sans text-xs font-semibold uppercase tracking-widest text-warmgray">
        No accounts · No uploads · No cloud
      </p>
      <p className="mt-2 font-sans text-xs text-warmgray">
        <a href="/privacy/" className="underline">
          Privacy
        </a>{" "}
        ·{" "}
        <a href="/terms/" className="underline">
          Terms
        </a>{" "}
        ·{" "}
        <a href="/support/" className="underline">
          Support
        </a>
      </p>

      {error && (
        <p className="mt-6 max-w-xs border-2 border-orange-dark bg-orange/10 px-4 py-3 font-sans text-sm text-orange-dark">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Dedicated landing for users arriving from the retired PhotoBlast app
 * (boothbop.com/?from=photoblast). Its only job is to convert them to the new
 * app, so it shows no photo-taking UI — just the logo, the install steps, and
 * the delete-the-old-icon reminder. The quiet "Continue" link is an escape
 * hatch into the normal app; tapping it persists so the landing never returns.
 */
function MigrationScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <img src={LOGO} alt="BoothBop" className="w-full max-w-xs" />
      <div className="mt-4 w-full max-w-xs border-2 border-ink bg-mustard/25 p-4 text-left">
        <p className="font-display text-2xl uppercase tracking-wide text-ink">
          Welcome back!
        </p>
        <p className="mt-1 font-sans text-sm text-brown">
          PhotoBlast is now{" "}
          <span className="font-bold text-orange">BoothBop</span> — same booth,
          new name. To keep it on your phone:
        </p>
        <InstallSteps />
        <p className="mt-3 font-sans text-sm text-brown">
          Then <strong>delete the old PhotoBlast icon</strong> — it's retired
          and won't update.
        </p>
      </div>
      <button
        onClick={onContinue}
        className="mt-6 font-sans text-xs uppercase tracking-widest text-warmgray underline"
      >
        Continue to BoothBop
      </button>
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

/**
 * Prominent, benefit-led nudge to install the app. One-tap on Chromium
 * (Android/desktop) via the captured prompt; simple, browser-agnostic steps
 * everywhere else (notably iOS, which has no install event). Never blocks
 * browser use, and disappears once installed.
 */
function InstallCard({
  installPrompt,
}: {
  installPrompt: InstallPromptEvent | null;
}) {
  const [showSteps, setShowSteps] = useState(false);

  // Hide in the native app (it's installed via the App Store — no "add to home
  // screen / no app store" nudge allowed) and when already a standalone PWA.
  if (isNativeShell() || isStandalone()) return null;

  async function oneTapInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
  }

  return (
    <div className="mt-8 w-full max-w-xs border-2 border-ink bg-orange/15 p-4 text-left">
      <p className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-ink">
        <BrandIcon name="install" className="h-7 w-7" />
        Get the full app
      </p>
      <p className="mt-1 font-sans text-sm text-brown">
        Add BoothBop to your home screen — it opens full-screen, loads
        instantly, and works with no signal. No app store, free.
      </p>

      {installPrompt ? (
        <button
          onClick={oneTapInstall}
          className={`mt-3 w-full px-6 py-3 text-xl ${btnPrimary}`}
        >
          <BrandIcon name="install" className="h-6 w-6" />
          Add to Home Screen
        </button>
      ) : (
        <>
          <button
            onClick={() => setShowSteps((v) => !v)}
            className={`mt-3 w-full px-6 py-3 text-xl ${btnPrimary}`}
          >
            <BrandIcon name="install" className="h-6 w-6" />
            Add to Home Screen
          </button>
          {showSteps && <InstallSteps />}
        </>
      )}
    </div>
  );
}

function InstallSteps() {
  const ios = isIOS();
  return (
    <ol className="mt-3 space-y-1.5 font-sans text-sm text-brown">
      {ios ? (
        <>
          <li className="flex items-center gap-1">
            <span>1. Tap the</span>
            <strong>Share</strong>
            <ShareIcon className="inline h-4 w-4" />
            <span>icon in Safari's toolbar.</span>
          </li>
          <li>
            2. Tap <strong>View More</strong> (scroll down) if you don't see the
            next step.
          </li>
          <li>
            3. Tap <strong>Add to Home Screen</strong>.
          </li>
          <li>
            4. Make sure <strong>Open as Web App</strong> is toggled{" "}
            <strong>ON</strong>.
          </li>
          <li>
            5. Tap <strong>Add</strong>. Done!
          </li>
        </>
      ) : (
        <>
          <li>
            1. Open your browser's menu (the <strong>⋮</strong> or{" "}
            <strong>⋯</strong> icon).
          </li>
          <li>
            2. Tap <strong>Install app</strong> or{" "}
            <strong>Add to Home screen</strong>.
          </li>
          <li>3. Open BoothBop from your home screen anytime.</li>
        </>
      )}
    </ol>
  );
}

function CameraScreen({
  videoRef,
  phase,
  countdown,
  flash,
  thumbs,
  delay,
  setDelay,
  onStart,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  phase: Phase;
  countdown: number | null;
  flash: boolean;
  thumbs: string[];
  delay: number;
  setDelay: (n: number) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col py-4">
      <div className="relative aspect-square w-full overflow-hidden border-2 border-ink bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full -scale-x-100 object-cover"
        />

        {phase === "capturing" && (
          <div className="absolute left-2 top-2 flex items-center gap-2 border-2 border-ink bg-cream px-2 py-1 font-display text-lg uppercase tracking-wide text-ink">
            <span className="pulse inline-block h-2.5 w-2.5 rounded-full bg-orange" />
            {thumbs.length}/{SHOTS}
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              key={countdown}
              className="countpop font-display text-[14rem] leading-none"
              style={{
                color: COUNTDOWN_COLOR[countdown] ?? "var(--color-orange)",
                WebkitTextStroke: "5px var(--color-ink)",
                paintOrder: "stroke fill",
              }}
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
            className="aspect-square overflow-hidden border-2 border-ink bg-paper"
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
          <>
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="font-display text-lg uppercase tracking-wide text-brown">
                Countdown
              </span>
              <div className="flex divide-x-2 divide-ink border-2 border-ink">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDelay(n)}
                    className={`px-4 py-2 font-display text-lg uppercase ${
                      delay === n ? "bg-orange text-cream" : "bg-paper text-ink"
                    }`}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={onStart}
              className={`w-full px-8 py-5 text-3xl ${btnPrimary}`}
            >
              <BrandIcon name="camera" className="h-8 w-8" />
              Take Photos
            </button>
          </>
        ) : (
          <p className="font-display text-3xl uppercase tracking-wide text-orange">
            Strike a pose!
          </p>
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
  autosaveTip,
  onOpenSettings,
  onDismissTip,
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
  note: string | null;
  shareFilesOk: boolean;
  autosaveTip: boolean;
  onOpenSettings: () => void;
  onDismissTip: () => void;
  onShare: () => void;
  onDownload: () => void;
  onRetake: () => void;
}) {
  const videoOk = isVideoSupported();
  const tabs: { id: Format; label: string; disabled?: boolean }[] = [
    { id: "strip", label: "Strip" },
    { id: "gif", label: "GIF" },
    { id: "video", label: "Video", disabled: !videoOk },
  ];
  const isBusy = generating !== null;

  return (
    <div className="flex flex-1 flex-col items-center py-4">
      {/* Format tabs */}
      <div className="flex w-full divide-x-2 divide-ink border-2 border-ink bg-paper">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectFormat(t.id)}
            disabled={t.disabled}
            className={`flex-1 py-3 font-display text-xl uppercase tracking-wide transition disabled:opacity-30 ${
              format === t.id ? "bg-orange text-cream" : "text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live preview of the selected output */}
      <div className="mt-4 flex min-h-[46vh] w-full items-center justify-center">
        {isBusy ? (
          <div className="flex flex-col items-center gap-3 font-display text-xl uppercase tracking-wide text-brown">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink/20 border-t-orange" />
            {generating === "gif" ? "Making your GIF…" : "Recording video…"}
          </div>
        ) : format === "video" && previewUrl ? (
          <video
            src={previewUrl}
            className="max-h-[46vh] w-auto border-2 border-ink"
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
            className="max-h-[46vh] w-auto border-2 border-ink"
          />
        ) : null}
      </div>

      {/* Strip-only styling controls */}
      {format === "strip" ? (
        <>
          <div className="mt-4">
            <p className="mb-1 text-center font-sans text-xs font-bold uppercase tracking-widest text-warmgray">
              Layout
            </p>
            <div className="mx-auto flex w-max divide-x-2 divide-ink border-2 border-ink bg-paper">
              {(["4x1", "2x2"] as Layout[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`px-6 py-2 font-display text-lg uppercase tracking-wide transition ${
                    layout === l ? "bg-orange text-cream" : "text-ink"
                  }`}
                >
                  {l === "4x1" ? "Strip" : "Grid"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-1 text-center font-sans text-xs font-bold uppercase tracking-widest text-warmgray">
              Color
            </p>
            <div className="flex justify-center gap-3">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => setThemeKey(key)}
                  aria-label={key}
                  className={`h-11 w-11 border-2 border-ink transition ${
                    themeKey === key
                      ? "ring-4 ring-ink ring-offset-2 ring-offset-cream"
                      : ""
                  }`}
                  style={{ background: theme.background }}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-center font-sans text-xs uppercase tracking-wide text-warmgray">
          {format === "gif" ? "GIF" : "Video"} plays your four photos in a loop.
        </p>
      )}

      {/* One-time nudge: surface the native auto-save-to-Photos feature. */}
      {autosaveTip && (
        <div className="mt-4 flex w-full items-center gap-2 border-2 border-teal bg-teal/10 px-3 py-2 text-left">
          <p className="flex-1 font-sans text-xs text-ink">
            New: auto-save your photos to a BoothBop album.{" "}
            <button
              onClick={onOpenSettings}
              className="font-semibold text-teal underline"
            >
              Open Settings
            </button>
          </p>
          <button
            onClick={onDismissTip}
            aria-label="Dismiss"
            className="px-1 text-lg leading-none text-brown"
          >
            ✕
          </button>
        </div>
      )}

      {/* Actions: one dominant primary, clear secondaries */}
      {shareFilesOk ? (
        <>
          <button
            onClick={onShare}
            disabled={isBusy || !previewUrl}
            className={`mt-5 w-full px-8 py-5 text-3xl ${btnPrimary}`}
          >
            <ShareIcon className="h-7 w-7" />
            Save / Share
          </button>
          <button
            onClick={onRetake}
            className={`mt-3 w-full px-6 py-4 ${btnSecondary}`}
          >
            <RefreshIcon className="h-6 w-6" />
            Take Again
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onDownload}
            disabled={isBusy || !previewUrl}
            className={`mt-5 w-full px-8 py-5 text-3xl ${btnPrimary}`}
          >
            <DownloadIcon className="h-7 w-7" />
            Save Photo
          </button>
          <button
            onClick={onRetake}
            className={`mt-3 w-full px-6 py-4 ${btnSecondary}`}
          >
            <RefreshIcon className="h-6 w-6" />
            Take Again
          </button>
        </>
      )}

      {note && (
        <p className="mt-3 text-center font-sans text-sm text-teal">{note}</p>
      )}

      <p className="mt-3 max-w-xs text-center font-sans text-xs text-warmgray">
        Photos stay on this device. BoothBop never uploads or stores them.
      </p>

      {error && (
        <p className="mt-4 border-2 border-orange-dark bg-orange/10 px-4 py-3 font-sans text-sm text-orange-dark">
          {error}
        </p>
      )}
    </div>
  );
}

function SettingsScreen({
  settings,
  native,
  videoSupported,
  onDest,
  onToggle,
  onClose,
}: {
  settings: AutosaveSettings;
  native: boolean;
  videoSupported: boolean;
  onDest: (dest: AutosaveDest) => void;
  onToggle: (format: AutosaveFormat, on: boolean) => void;
  onClose: () => void;
}) {
  const formats: { key: AutosaveFormat; label: string; disabled?: boolean }[] =
    [
      { key: "strip", label: "Photo strip" },
      { key: "grid", label: "Grid (2×2)" },
      { key: "gif", label: "Animated GIF" },
      { key: "video", label: "Looping video", disabled: !videoSupported },
    ];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream text-ink">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-4xl uppercase tracking-wide">
            Settings
          </h2>
          <button onClick={onClose} className="px-2 text-2xl text-brown">
            ✕
          </button>
        </div>

        <h3 className="mt-6 font-display text-2xl uppercase tracking-wide">
          Auto-save to Photos
        </h3>
        <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
          Save your booth creations to the iOS Photos app automatically.
        </p>

        {!native ? (
          <p className="mt-4 border-2 border-ink/30 bg-paper px-4 py-3 font-sans text-sm text-brown">
            Available in the BoothBop iOS app.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <p className="font-display text-lg uppercase tracking-wide text-brown">
                Save to
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["album", "cameraRoll"] as AutosaveDest[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => onDest(d)}
                    aria-pressed={settings.dest === d}
                    className={`border-2 border-ink px-3 py-2 font-display text-base uppercase tracking-wide transition active:translate-y-px ${
                      settings.dest === d
                        ? "bg-orange text-cream"
                        : "bg-paper text-ink"
                    }`}
                  >
                    {d === "album" ? "BoothBop album" : "Camera roll"}
                  </button>
                ))}
              </div>
              <p className="mt-1 font-sans text-xs text-warmgray">
                {settings.dest === "album"
                  ? "Creates a dedicated “BoothBop” album. Needs full Photos access — we only ever add to that album."
                  : "Saves into your main camera roll."}
              </p>
            </div>

            <ul className="mt-5 divide-y-2 divide-ink/10 border-2 border-ink bg-paper">
              {formats.map((f) => (
                <li
                  key={f.key}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span
                    className={`font-display text-xl uppercase tracking-wide ${
                      f.disabled ? "text-warmgray" : "text-ink"
                    }`}
                  >
                    {f.label}
                  </span>
                  <Toggle
                    on={settings[f.key]}
                    disabled={f.disabled}
                    onChange={(v) => onToggle(f.key, v)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 font-sans text-xs text-warmgray">
              BoothBop only adds your own creations — it never reads or uploads
              your library.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Small brand-styled on/off switch. */
function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 border-2 border-ink transition disabled:opacity-40 ${
        on ? "bg-orange" : "bg-cream"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 bg-ink transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function GalleryScreen({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (session: Session) => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  const reload = () => listSessions().then(setSessions);
  useEffect(() => {
    reload();
  }, []);

  async function remove(id: string) {
    await deleteSession(id);
    reload();
  }

  async function clearAll() {
    if (!window.confirm("Delete all saved photos from this device?")) return;
    await clearSessions();
    reload();
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream text-ink">
      <div className="mx-auto max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-4xl uppercase tracking-wide">
            My Photos
          </h2>
          <button onClick={onClose} className="px-2 text-2xl text-brown">
            ✕
          </button>
        </div>

        <p className="mt-1 font-sans text-xs uppercase tracking-wide text-warmgray">
          Tap a set to get its strip, GIF, or video. Saved on this device only.
        </p>

        {sessions === null ? (
          <p className="mt-16 text-center font-display text-xl uppercase text-brown">
            Loading…
          </p>
        ) : sessions.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center text-brown">
            <BrandIcon name="gallery" className="h-16 w-16" />
            <p className="mt-3 font-display text-2xl uppercase tracking-wide">
              No photos yet
            </p>
            <p className="font-sans text-sm text-warmgray">
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
                  onOpen={() => onOpen(s)}
                  onDelete={() => remove(s.id)}
                />
              ))}
            </div>
            <button
              onClick={clearAll}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 border-2 border-orange-dark bg-paper px-6 py-3 font-display text-lg uppercase tracking-wide text-orange-dark transition active:translate-y-px active:bg-cream"
            >
              <TrashIcon className="h-5 w-5" />
              Clear all
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Grid thumbnail: tap to open the set, small corner button to delete it. */
function Cover({
  blob,
  onOpen,
  onDelete,
}: {
  blob: Blob;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <div className="relative">
      <button
        onClick={onOpen}
        className="block aspect-square w-full overflow-hidden border-2 border-ink bg-paper transition active:translate-y-px"
      >
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border-2 border-ink bg-cream text-ink"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- helpers */

async function stripBlob(
  frames: HTMLCanvasElement[],
  layout: Layout,
  theme: (typeof THEMES)[keyof typeof THEMES],
): Promise<Blob> {
  const logo = await loadWatermark();
  return new Promise((resolve, reject) => {
    composeStrip(frames, layout, theme, logo).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("strip failed"))),
      "image/png",
    );
  });
}

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
}

/** Friendly message for a getUserMedia failure. */
function cameraError(e: unknown): string {
  const name = (e as Error)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return CAMERA_MSG;
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is in use by another app. Close it and try again.";
  }
  return "Couldn't access the camera. Please try again.";
}

/** Resolve once the video has real pixels (so we never capture black). */
function videoReady(
  video: HTMLVideoElement,
  timeoutMs = 2500,
): Promise<boolean> {
  if (video.videoWidth > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (video.videoWidth > 0) return resolve(true);
      if (Date.now() > deadline) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
