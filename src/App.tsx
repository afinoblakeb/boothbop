import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAMERA_MSG,
  cameraError,
  captureSquareFrame,
  startCamera,
  stopCamera,
  videoReady,
} from "./lib/camera";
import {
  composeStrip,
  stripBlob,
  THEMES,
  type Layout,
  type StripTheme,
} from "./lib/strip";
import { encodeGif } from "./lib/gif";
import { encodeVideo, isVideoSupported, type VideoResult } from "./lib/video";
import { encodeVideoNative } from "./lib/videoNative";
import { canShareFiles, isNativeShell, probeShareFiles } from "./lib/platform";
import {
  blobToCanvas,
  canvasToBlob,
  requestPersistence,
  saveSession,
  updateSessionPhotos,
  type Session,
} from "./lib/gallery";
import {
  GIF_SIZE,
  PHOTO_CAPTURE,
  VIDEO_PROFILE,
  loadQuality,
  loadBranding,
  planAutosaveTasks,
  saveQuality,
  saveBranding,
  type AutosaveSettings,
  type AutosaveTask,
  type Quality,
  type QualityMedia,
  type QualitySettings,
} from "./lib/settings";
import {
  ensurePhotosPermission,
  openIosSettings,
  saveToPhotos,
  type PermissionResult,
} from "./lib/photosAlbum";
import { loadWatermark } from "./lib/watermark";
import { nativeShareFile } from "./lib/nativeShare";
import { SHOTS } from "./constants";
import type { Format, InstallPromptEvent, Phase } from "./types";
import { TopBar } from "./components/TopBar";
import { IdleScreen } from "./screens/IdleScreen";
import { MigrationScreen } from "./screens/MigrationScreen";
import { CameraScreen } from "./screens/CameraScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { GalleryScreen } from "./screens/GalleryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { useAutosave } from "./hooks/useAutosave";
import { type FilterId } from "./lib/filter";
import { replaceFrame } from "./lib/session";

interface MediaResult {
  url: string;
  blob: Blob;
  filename: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Screenshot mode: a flag-gated sample loader (see lib/demo.ts) for producing
// App Store screenshots without a camera. Off in the submission build.
const DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO === "1";

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
  const [filter, setFilter] = useState<FilterId>(() => {
    const stored = localStorage.getItem("bb.filter");
    return stored === "warm" ||
      stored === "cool" ||
      stored === "bw" ||
      stored === "sepia" ||
      stored === "inverse"
      ? stored
      : "original";
  });
  const [boom, setBoom] = useState(
    () => localStorage.getItem("bb.boom") === "1",
  );
  const [branding, setBranding] = useState(loadBranding);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [note, setNote] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [shareFilesOk, setShareFilesOk] = useState(false);

  // Export quality per media type (photo strip / GIF / video), persisted.
  const [quality, setQuality] = useState<QualitySettings>(loadQuality);
  function changeQuality(media: QualityMedia, q: Quality) {
    saveQuality(media, q);
    setQuality((prev) => ({ ...prev, [media]: q }));
  }
  // The horizontal BoothBop logo drawn in the strip footer (same mark as the
  // GIF/video watermark). Loaded once; the strip shows the text wordmark until
  // it's ready, then re-renders with the logo.
  const [brandLogo, setBrandLogo] = useState<HTMLImageElement | null>(null);

  // Auto-save-to-Photos settings + permission handling (native iOS).
  const {
    autosave,
    showSettings,
    setShowSettings,
    error: autosaveError,
    tipSeen: autosaveTipSeen,
    changeDest: changeAutosaveDest,
    toggleFormat: toggleAutosaveFormat,
    dismissTip: dismissAutosaveTip,
    openSettings,
  } = useAutosave();

  // Auto-dismiss the transient success/info note after a few seconds. The
  // cleanup cancels the prior timer whenever `note` changes or on unmount.
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(id);
  }, [note]);

  interface RenderChoices {
    filter: FilterId;
    boom: boolean;
    branding: boolean;
  }
  const renderRevision = useRef(0);
  const currentChoices = (): RenderChoices => ({ filter, boom, branding });

  async function getGifBlob(
    src: HTMLCanvasElement[],
    choices: RenderChoices = currentChoices(),
  ): Promise<Blob> {
    const watermarkImg = choices.branding ? await loadWatermark() : null;
    return encodeGif(src, {
      watermark: choices.branding,
      watermarkImg,
      filter: choices.filter,
      boom: choices.boom,
      size: GIF_SIZE[quality.gif],
    });
  }
  async function getVideoResult(
    src: HTMLCanvasElement[],
    choices: RenderChoices = currentChoices(),
  ): Promise<VideoResult> {
    const watermarkImg = choices.branding ? await loadWatermark() : null;
    const opts = {
      watermark: choices.branding,
      watermarkImg,
      filter: choices.filter,
      ...VIDEO_PROFILE[quality.video],
    };
    return isNativeShell()
      ? encodeVideoNative(src, opts)
      : encodeVideo(src, opts);
  }

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
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const retakeIndexRef = useRef<number | null>(null);
  const cameraRequestRef = useRef(0);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

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

  // Retake failures preserve the original four frames; new-shoot failures go home.
  function failCamera(msg: string) {
    const preserveReview =
      retakeIndexRef.current !== null && framesRef.current.length === SHOTS;
    abortRef.current = true;
    cameraRequestRef.current += 1;
    setCountdown(null);
    setFlash(false);
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (!preserveReview) setFrames([]);
    setRetakeIndex(null);
    retakeIndexRef.current = null;
    setPhase(preserveReview ? "review" : "idle");
    setError(msg);
  }

  // If the user revokes camera permission (Settings, site controls, etc.),
  // preserve an in-progress retake or send a new shoot home with a clear message.
  useEffect(() => {
    let status: PermissionStatus | undefined;
    navigator.permissions
      ?.query?.({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        s.onchange = () => {
          if (s.state === "denied") failCamera(CAMERA_MSG);
        };
      })
      .catch(() => {});
    return () => {
      if (status) status.onchange = null;
    };
    // failCamera only touches stable setters and refs, so a one-time bind is fine.
  }, []);

  function clearResults() {
    renderRevision.current += 1;
    setGenerating(null);
    setGifResult((r) => (r && URL.revokeObjectURL(r.url), null));
    setVideoResult((r) => (r && URL.revokeObjectURL(r.url), null));
  }

  async function openCamera(index: number | null = null) {
    const request = ++cameraRequestRef.current;
    setError(null);
    abortRef.current = false;
    setRetakeIndex(index);
    retakeIndexRef.current = index;
    try {
      const stream = await startCamera();
      if (request !== cameraRequestRef.current || abortRef.current) {
        stopCamera(stream);
        return;
      }
      streamRef.current = stream;
      // If the camera track ends mid-use (revoked, taken by another app),
      // drop the user back home with the permission message.
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => failCamera(CAMERA_MSG));
      });
      if (index === null) {
        setFrames([]);
        setActiveSessionId(null);
      }
      setPhase("preview");
    } catch (e) {
      setError(cameraError(e));
      setRetakeIndex(null);
      retakeIndexRef.current = null;
      setPhase(index === null ? "idle" : "review");
    }
  }

  // Stop everything and go back to the start screen.
  function cancelToHome() {
    abortRef.current = true;
    cameraRequestRef.current += 1;
    setCountdown(null);
    setFlash(false);
    stopCamera(streamRef.current);
    streamRef.current = null;
    setFrames([]);
    setActiveSessionId(null);
    setRetakeIndex(null);
    retakeIndexRef.current = null;
    setError(null);
    setPhase("idle");
  }

  function cancelCamera() {
    const returnToReview = retakeIndexRef.current !== null;
    abortRef.current = true;
    cameraRequestRef.current += 1;
    setCountdown(null);
    setFlash(false);
    stopCamera(streamRef.current);
    streamRef.current = null;
    setRetakeIndex(null);
    retakeIndexRef.current = null;
    if (!returnToReview) setFrames([]);
    setPhase(returnToReview ? "review" : "idle");
  }

  async function runSequence() {
    const video = videoRef.current;
    // Don't count down onto a dead/black stream — make sure we have real pixels.
    if (!video || !(await videoReady(video))) {
      failCamera("The camera isn't ready. Check camera access and try again.");
      return;
    }
    if (abortRef.current) return;

    setPhase("capturing");
    clearResults();
    const replacing = retakeIndexRef.current;

    if (replacing !== null) {
      await wait(400);
      for (let n = delay; n >= 1; n--) {
        if (abortRef.current) return;
        setCountdown(n);
        await wait(1000);
      }
      if (abortRef.current) return;
      setCountdown(null);

      try {
        void tapHaptic("Medium");
        setFlash(true);
        const replacement = captureSquareFrame(
          video,
          PHOTO_CAPTURE[quality.photo],
        );
        const updated = replaceFrame(framesRef.current, replacing, replacement);
        framesRef.current = updated;
        setFrames(updated);
        await wait(240);
        setFlash(false);
        stopCamera(streamRef.current);
        streamRef.current = null;

        if (activeSessionId) {
          try {
            const photos = await Promise.all(
              updated.map((c) => canvasToBlob(c)),
            );
            await updateSessionPhotos(activeSessionId, photos);
          } catch {
            setNote("Photo replaced, but My Photos couldn't be updated.");
          }
        }

        setRetakeIndex(null);
        retakeIndexRef.current = null;
        setFormat("strip");
        setPhase("review");
      } catch {
        setFlash(false);
        failCamera("Couldn't retake that photo. Your original is still here.");
      }
      return;
    }

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

      void tapHaptic("Medium"); // light native shutter feel; never awaited (timing-sensitive)
      setFlash(true);
      const frame = captureSquareFrame(video, PHOTO_CAPTURE[quality.photo]);
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
      const session = await saveSession(photos);
      setActiveSessionId(session.id);
    } catch {
      /* storage is best-effort — never block the flow on it */
    }

    // Auto-save is best-effort and never blocks the review screen.
    void autoSaveToAlbum(captured, autosave);

    setFormat("strip");
    setPhase("review");
  }

  function retake() {
    clearResults();
    setFrames([]);
    setFormat("strip");
    void openCamera();
  }

  // Screenshot mode: inject a staged set of photos as the four frames and jump
  // straight to review, rendering a real strip/GIF/video. Gated by DEMO.
  async function loadSampleSession(setNum: number) {
    setError(null);
    try {
      const { loadSampleFrames } = await import("./lib/demo");
      const canvases = await loadSampleFrames(
        setNum,
        PHOTO_CAPTURE[quality.photo],
      );
      clearResults();
      setFrames(canvases);
      setActiveSessionId(null);
      setFormat("strip");
      setPhase("review");
    } catch {
      setError(`Add public/demo/set${setNum}-1.jpg … set${setNum}-4.jpg`);
    }
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
    setActiveSessionId(session.id);
    setFormat("strip");
    setShowGallery(false);
    setPhase("review");
  }

  // Strip preview (re-rendered when frames / layout / theme change).
  const stripUrl = useMemo(() => {
    if (frames.length < SHOTS) return null;
    return composeStrip(frames, layout, THEMES[themeKey], {
      logo: brandLogo,
      cell: PHOTO_CAPTURE[quality.photo],
      branding,
      filter,
    }).toDataURL("image/png");
  }, [frames, layout, themeKey, brandLogo, quality.photo, branding, filter]);

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

  async function ensureGif(choices: RenderChoices = currentChoices()) {
    const revision = renderRevision.current;
    setGenerating("gif");
    try {
      await wait(30); // let the spinner paint before the (sync) encode
      const blob = await getGifBlob(framesRef.current, choices);
      if (revision !== renderRevision.current) return;
      setGifResult((r) =>
        r
          ? r
          : {
              url: URL.createObjectURL(blob),
              blob,
              filename: `boothbop-${stamp()}.gif`,
            },
      );
    } catch {
      if (revision === renderRevision.current)
        setError("Couldn't create the GIF.");
    } finally {
      if (revision === renderRevision.current) setGenerating(null);
    }
  }

  async function ensureVideo(choices: RenderChoices = currentChoices()) {
    if (!isVideoSupported()) {
      setError("Video recording isn't supported in this browser.");
      return;
    }
    const revision = renderRevision.current;
    setGenerating("video");
    try {
      const { blob, extension } = await getVideoResult(
        framesRef.current,
        choices,
      );
      if (revision !== renderRevision.current) return;
      setVideoResult((r) =>
        r
          ? r
          : {
              url: URL.createObjectURL(blob),
              blob,
              filename: `boothbop-${stamp()}.${extension}`,
            },
      );
    } catch (e) {
      if (revision === renderRevision.current)
        setError(e instanceof Error ? e.message : "Couldn't record the video.");
    } finally {
      if (revision === renderRevision.current) setGenerating(null);
    }
  }

  function changeFilter(next: FilterId) {
    localStorage.setItem("bb.filter", next);
    setFilter(next);
    clearResults();
    const choices = { ...currentChoices(), filter: next };
    if (format === "gif") void ensureGif(choices);
    if (format === "video") void ensureVideo(choices);
  }

  function changeBoom(on: boolean) {
    localStorage.setItem("bb.boom", on ? "1" : "0");
    setBoom(on);
    clearResults();
    if (format === "gif") void ensureGif({ ...currentChoices(), boom: on });
  }

  function changeBranding(on: boolean) {
    saveBranding(on);
    setBranding(on);
    clearResults();
    const choices = { ...currentChoices(), branding: on };
    if (format === "gif") void ensureGif(choices);
    if (format === "video") void ensureVideo(choices);
  }

  // The blob for one auto-save task. Reuses the shared GIF/video cache so they
  // are never encoded twice (the review tabs draw from the same cache).
  async function renderForAutosave(
    src: HTMLCanvasElement[],
    task: AutosaveTask,
    theme: StripTheme,
  ): Promise<Blob> {
    if (task.layout)
      return stripBlob(src, task.layout, theme, {
        cell: PHOTO_CAPTURE[quality.photo],
        branding,
        filter,
      });
    if (task.format === "gif") return getGifBlob(src);
    return (await getVideoResult(src)).blob;
  }

  // Fire-and-forget after a capture: save the enabled formats to Photos. Best-
  // effort — never blocks or breaks the capture/review flow.
  async function autoSaveToAlbum(
    captured: HTMLCanvasElement[],
    settings: AutosaveSettings,
  ) {
    if (!isNativeShell()) return;
    const tasks = planAutosaveTasks(settings, {
      videoSupported: isVideoSupported(),
    });
    if (!tasks.length) return;
    // Access was granted when the toggle was enabled; re-check WITHOUT prompting
    // (the user may have revoked it in iOS Settings since).
    let status: PermissionResult;
    try {
      status = await ensurePhotosPermission(settings.dest, false);
    } catch {
      status = "denied";
    }
    if (status !== "granted") return;

    // Snapshot the theme so a set saved over a few seconds stays consistent even
    // if the user changes the color on the review screen mid-save.
    const theme = THEMES[themeKey];
    let savedAny = false;
    for (const task of tasks) {
      try {
        const blob = await renderForAutosave(captured, task, theme);
        if (await saveToPhotos(blob, task.kind, settings.dest)) savedAny = true;
      } catch {
        /* per-task best-effort */
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
    const blob = await stripBlob(frames, layout, THEMES[themeKey], {
      cell: PHOTO_CAPTURE[quality.photo],
      branding,
      filter,
    });
    return { url: "", blob, filename: `boothbop-${stamp()}.png` };
  }

  // Best-effort native haptic. No-ops on web; never blocks or throws into the flow.
  async function tapHaptic(style: "Medium" | "Light" = "Medium") {
    if (!isNativeShell()) return;
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle[style] });
    } catch {
      /* haptics are best-effort — never block the flow */
    }
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
        void tapHaptic("Light");
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
    <div className="mx-auto flex h-full max-w-md flex-col px-4">
      <TopBar
        onHome={cancelToHome}
        onAlbum={() => setShowGallery(true)}
        onSettings={openSettings}
        showActions={(phase === "idle" || phase === "review") && !showMigration}
      />

      {phase === "idle" &&
        (showMigration ? (
          <MigrationScreen onContinue={dismissMigration} />
        ) : (
          <IdleScreen
            onStart={() => void openCamera()}
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
          onCancel={cancelCamera}
          retakeIndex={retakeIndex}
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
          filter={filter}
          onFilter={changeFilter}
          boom={boom}
          onBoom={changeBoom}
          thumbs={thumbs}
          onRetakeOne={(index) => void openCamera(index)}
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
          quality={quality}
          native={isNativeShell()}
          videoSupported={isVideoSupported()}
          error={autosaveError}
          onDest={changeAutosaveDest}
          onToggle={toggleAutosaveFormat}
          onQuality={changeQuality}
          onOpenIosSettings={() => void openIosSettings()}
          onClose={() => setShowSettings(false)}
          branding={branding}
          onBranding={changeBranding}
        />
      )}

      {DEMO && phase === "idle" && !showMigration && (
        <div className="fixed bottom-2 left-2 z-50 flex gap-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => loadSampleSession(n)}
              className="border-2 border-ink bg-paper px-2 py-1 font-display text-xs uppercase tracking-wide text-ink"
            >
              Demo {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
}
