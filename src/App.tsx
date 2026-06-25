import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAMERA_MSG,
  type CameraFacing,
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
  cleanSessionTitle,
  requestPersistence,
  saveSession,
  SESSION_TITLE_MAX,
  updateSessionMeta,
  updateSessionPhotos,
  updateSessionStyle,
  type Session,
} from "./lib/gallery";
import {
  EXPORT_SPEED_PROFILE,
  GIF_SIZE,
  PHOTO_CAPTURE,
  VIDEO_PROFILE,
  loadCaptureDelay,
  loadCaptureSound,
  loadExportSpeed,
  loadStripLayout,
  loadThemeKey,
  loadQuality,
  planAutosaveTasks,
  resetStripLayout,
  saveCaptureDelay,
  saveCaptureSound,
  saveExportSpeed,
  saveStripLayout,
  saveThemeKey,
  saveQuality,
  type AutosaveSettings,
  type AutosaveTask,
  type CaptureDelay,
  type ExportSpeed,
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
import {
  FILTERS,
  STICKERS,
  loadFilter,
  loadSticker,
  renderFrame,
  saveFilter,
  saveSticker,
  type FilterKey,
  type StickerKey,
} from "./lib/render";
import { STYLE_PRESETS, type StylePreset } from "./lib/templates";
import { loadImportedFrames } from "./lib/importPhotos";
import { moveItem, type MoveDirection } from "./lib/sequence";
import {
  cleanStyleCaption,
  type SessionStyle,
  type ThemeKey,
} from "./lib/style";
import {
  isPremiumFilter,
  isPremiumLayout,
  isPremiumQuality,
  isPremiumSticker,
} from "./lib/entitlements";
import {
  buyRemoveWatermark,
  getRemoveWatermarkProduct,
  isProCached,
  refreshPro,
  restorePurchases,
  type ProProduct,
} from "./lib/purchases";
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

interface MediaResult {
  url: string;
  blob: Blob;
  filename: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Screenshot mode: a flag-gated sample loader (see lib/demo.ts) for producing
// App Store screenshots without a camera. Off in the submission build.
const DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO === "1";
const DEMO_SETS = [
  { id: 1, label: "Birthday" },
  { id: 2, label: "Night Out" },
  { id: 3, label: "Friends" },
] as const;

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frames, setFrames] = useState<HTMLCanvasElement[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [demoSetNum, setDemoSetNum] = useState<number | null>(null);
  const [demoCameraFrames, setDemoCameraFrames] = useState<
    HTMLCanvasElement[] | null
  >(null);
  const [demoPreviewIndex, setDemoPreviewIndex] = useState(0);
  const [layout, setLayout] = useState<Layout>(loadStripLayout);
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(loadThemeKey);
  const [error, setError] = useState<string | null>(null);

  const [format, setFormat] = useState<Format>("strip");
  const [generating, setGenerating] = useState<
    null | "gif" | "boomerang" | "video"
  >(null);
  const [gifResult, setGifResult] = useState<MediaResult | null>(null);
  const [boomerangResult, setBoomerangResult] = useState<MediaResult | null>(
    null,
  );
  const [videoResult, setVideoResult] = useState<MediaResult | null>(null);

  const [note, setNote] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [shareFilesOk, setShareFilesOk] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitleState] = useState("");
  const [sessionFavorite, setSessionFavorite] = useState(false);

  // Export quality per media type (photo strip / GIF / video), persisted.
  const [quality, setQuality] = useState<QualitySettings>(loadQuality);
  function changeQuality(media: QualityMedia, q: Quality) {
    if (isPremiumQuality(q) && !isPro) {
      setNote("Unlock BoothBop Pro for high-quality exports.");
      setShowSettings(true);
      return;
    }
    saveQuality(media, q);
    setQuality((prev) => ({ ...prev, [media]: q }));
    clearResults();
  }

  const [exportSpeed, setExportSpeedState] =
    useState<ExportSpeed>(loadExportSpeed);
  const speedProfile = EXPORT_SPEED_PROFILE[exportSpeed];
  function changeExportSpeed(speed: ExportSpeed) {
    saveExportSpeed(speed);
    setExportSpeedState(speed);
    clearResults();
  }

  const [filter, setFilterState] = useState<FilterKey>(loadFilter);
  function changeFilter(f: FilterKey) {
    if (isPremiumFilter(f) && !isPro) {
      setNote("Unlock BoothBop Pro for premium looks.");
      setShowSettings(true);
      return;
    }
    saveFilter(f);
    setFilterState(f);
    persistActiveStyle(buildSessionStyle({ filter: f }));
    clearResults();
  }

  const [sticker, setStickerState] = useState<StickerKey>(loadSticker);
  function changeSticker(next: StickerKey) {
    if (isPremiumSticker(next) && !isPro) {
      setNote("Unlock BoothBop Pro for premium props.");
      setShowSettings(true);
      return;
    }
    saveSticker(next);
    setStickerState(next);
    persistActiveStyle(buildSessionStyle({ sticker: next }));
    clearResults();
  }

  function changeLayout(next: Layout) {
    if (isPremiumLayout(next) && !isPro) {
      setNote("Unlock BoothBop Pro for premium layouts.");
      setShowSettings(true);
      return;
    }
    saveStripLayout(next);
    setLayout(next);
    persistActiveStyle(buildSessionStyle({ layout: next }));
  }

  function changeThemeKey(next: ThemeKey) {
    saveThemeKey(next);
    setThemeKeyState(next);
    persistActiveStyle(buildSessionStyle({ themeKey: next }));
  }

  function resetFreshReviewLayout(): Layout {
    const next = resetStripLayout();
    setLayout(next);
    return next;
  }

  function applyStylePreset(preset: StylePreset) {
    if (preset.pro && !isPro) {
      setNote("Unlock BoothBop Pro for premium templates.");
      setShowSettings(true);
      return;
    }
    saveStripLayout(preset.layout);
    saveThemeKey(preset.theme);
    setLayout(preset.layout);
    setThemeKeyState(preset.theme);
    saveFilter(preset.filter);
    setFilterState(preset.filter);
    saveSticker(preset.sticker);
    setStickerState(preset.sticker);
    persistActiveStyle(
      buildSessionStyle({
        layout: preset.layout,
        themeKey: preset.theme,
        filter: preset.filter,
        sticker: preset.sticker,
      }),
    );
    clearResults();
    setFormat("strip");
  }

  // "Remove watermark" one-time purchase (native iOS). isPro drops the watermark
  // from GIF/video exports. StoreKit is the source of truth; cached for the UI.
  const [isPro, setIsPro] = useState(isProCached());
  const [proProduct, setProProduct] = useState<ProProduct | null>(null);
  const [customCaption, setCustomCaptionState] = useState(
    () => localStorage.getItem("bb.pro.caption") ?? "",
  );
  function setCustomCaption(value: string) {
    const next = cleanStyleCaption(value);
    localStorage.setItem("bb.pro.caption", next);
    setCustomCaptionState(next);
    persistActiveStyle(buildSessionStyle({ caption: isPro ? next : "" }));
  }
  const stripCaption = isPro ? customCaption.trim() : "";
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

  useEffect(() => {
    if (isPro) return;
    let changed = false;
    const nextQuality = { ...quality };
    for (const media of Object.keys(nextQuality) as QualityMedia[]) {
      if (isPremiumQuality(nextQuality[media])) {
        nextQuality[media] = "standard";
        saveQuality(media, "standard");
        changed = true;
      }
    }
    if (changed) {
      setQuality(nextQuality);
      clearResults();
    }
    if (isPremiumFilter(filter)) {
      saveFilter("none");
      setFilterState("none");
      clearResults();
    }
    if (isPremiumSticker(sticker)) {
      saveSticker("none");
      setStickerState("none");
      clearResults();
    }
    if (isPremiumLayout(layout)) {
      saveStripLayout("4x1");
      setLayout("4x1");
    }
  }, [filter, isPro, layout, quality, sticker]);

  function clearActiveSession() {
    setActiveSessionId(null);
    setSessionTitleState("");
    setSessionFavorite(false);
  }

  function activateSession(session: Session | null) {
    if (!session) {
      clearActiveSession();
      return;
    }
    setActiveSessionId(session.id);
    setSessionTitleState(session.title ?? "");
    setSessionFavorite(session.favorite === true);
  }

  function changeSessionTitle(value: string) {
    const next = value.slice(0, SESSION_TITLE_MAX);
    setSessionTitleState(next);
    if (!activeSessionId) return;
    void updateSessionMeta(activeSessionId, { title: cleanSessionTitle(next) });
  }

  function toggleSessionFavorite() {
    if (!activeSessionId) return;
    const next = !sessionFavorite;
    setSessionFavorite(next);
    void updateSessionMeta(activeSessionId, { favorite: next });
  }

  function buildSessionStyle(overrides: Partial<SessionStyle> = {}) {
    const caption = overrides.caption ?? stripCaption;
    const nextSticker = overrides.sticker ?? sticker;
    return {
      layout: overrides.layout ?? layout,
      themeKey: overrides.themeKey ?? themeKey,
      filter: overrides.filter ?? filter,
      ...(nextSticker !== "none" ? { sticker: nextSticker } : {}),
      ...(caption ? { caption: cleanStyleCaption(caption) } : {}),
    };
  }

  function persistActiveStyle(style: SessionStyle) {
    if (!activeSessionId) return;
    void updateSessionStyle(activeSessionId, style);
  }

  function restoreSessionStyle(style: SessionStyle | undefined): boolean {
    if (!style) return false;
    const nextLayout =
      isPremiumLayout(style.layout) && !isPro ? "4x1" : style.layout;
    const nextFilter =
      isPremiumFilter(style.filter) && !isPro ? "none" : style.filter;
    const styleSticker = style.sticker ?? "none";
    const nextSticker =
      isPremiumSticker(styleSticker) && !isPro ? "none" : styleSticker;
    const locked =
      nextLayout !== style.layout ||
      nextFilter !== style.filter ||
      nextSticker !== styleSticker;

    saveStripLayout(nextLayout);
    saveThemeKey(style.themeKey);
    saveFilter(nextFilter);
    saveSticker(nextSticker);
    setLayout(nextLayout);
    setThemeKeyState(style.themeKey);
    setFilterState(nextFilter);
    setStickerState(nextSticker);
    if (isPro) {
      const caption = cleanStyleCaption(style.caption ?? "");
      localStorage.setItem("bb.pro.caption", caption);
      setCustomCaptionState(caption);
    }
    return locked;
  }

  // Auto-dismiss the transient success/info note after a few seconds. The
  // cleanup cancels the prior timer whenever `note` changes or on unmount.
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(id);
  }, [note]);

  // GIF/video blobs for the current capture, encoded at most once and shared by
  // the review tabs and the auto-save path. Reset by clearResults().
  const mediaCache = useRef<{
    gif?: Promise<Blob>;
    boomerang?: Promise<Blob>;
    video?: Promise<VideoResult>;
  }>({});
  function getGifBlob(src: HTMLCanvasElement[]): Promise<Blob> {
    return (mediaCache.current.gif ??= loadWatermark()
      .then((watermarkImg) =>
        encodeGif(src, {
          watermarkImg,
          size: GIF_SIZE[quality.gif],
          delay: speedProfile.gifDelay,
          filter,
          sticker,
          watermark: !isPro,
        }),
      )
      .catch((e) => {
        mediaCache.current.gif = undefined; // let a re-tap retry
        throw e;
      }));
  }
  function getBoomerangBlob(src: HTMLCanvasElement[]): Promise<Blob> {
    return (mediaCache.current.boomerang ??= loadWatermark()
      .then((watermarkImg) =>
        encodeGif(src, {
          watermarkImg,
          size: GIF_SIZE[quality.gif],
          delay: speedProfile.boomerangDelay,
          filter,
          sticker,
          motion: "boomerang",
          watermark: !isPro,
        }),
      )
      .catch((e) => {
        mediaCache.current.boomerang = undefined;
        throw e;
      }));
  }
  function getVideoResult(src: HTMLCanvasElement[]): Promise<VideoResult> {
    return (mediaCache.current.video ??= loadWatermark()
      .then((watermarkImg) => {
        const opts = {
          watermarkImg,
          watermark: !isPro,
          filter,
          sticker,
          frameMs: speedProfile.videoFrameMs,
          ...VIDEO_PROFILE[quality.video],
        };
        // Native iOS: AVAssetWriter plugin (instant, reliable). Web: MediaRecorder.
        return isNativeShell()
          ? encodeVideoNative(src, opts)
          : encodeVideo(src, opts);
      })
      .catch((e) => {
        mediaCache.current.video = undefined; // let a re-tap retry
        throw e;
      }));
  }

  // Shutter delay (seconds counted down before each shot), persisted.
  const [delay, setDelayState] = useState<CaptureDelay>(loadCaptureDelay);
  function changeDelay(next: CaptureDelay) {
    saveCaptureDelay(next);
    setDelayState(next);
  }

  const [captureSound, setCaptureSoundState] = useState(loadCaptureSound);
  function toggleCaptureSound() {
    const next = !captureSound;
    saveCaptureSound(next);
    setCaptureSoundState(next);
  }

  const [cameraFacing, setCameraFacingState] = useState<CameraFacing>(() =>
    localStorage.getItem("bb.cameraFacing") === "environment"
      ? "environment"
      : "user",
  );
  const [mirrorPreview, setMirrorPreview] = useState(
    () => localStorage.getItem("bb.mirrorPreview") !== "0",
  );

  useEffect(() => setShareFilesOk(probeShareFiles()), []);
  // Best-effort: ask the browser to keep the private gallery through eviction.
  useEffect(() => requestPersistence(), []);
  // Preload the strip-footer logo.
  useEffect(() => {
    loadWatermark().then(setBrandLogo);
  }, []);

  // Native: confirm the Remove-Watermark entitlement from StoreKit on launch and
  // load the localized price for the paywall. Best-effort; no-ops on web.
  useEffect(() => {
    if (!isNativeShell()) return;
    refreshPro()
      .then(setIsPro)
      .catch(() => {});
    getRemoveWatermarkProduct()
      .then(setProProduct)
      .catch(() => {});
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
    setRetakeIndex(null);
    setPhase("idle");
    setError(msg);
  }

  function bindCameraEnded(stream: MediaStream) {
    stream.getVideoTracks().forEach((t) => {
      t.addEventListener("ended", () => failToHome(CAMERA_MSG));
    });
  }

  function saveCameraFacing(next: CameraFacing) {
    localStorage.setItem("bb.cameraFacing", next);
    setCameraFacingState(next);
  }

  async function restartCamera(nextFacing: CameraFacing) {
    stopCamera(streamRef.current);
    streamRef.current = null;
    try {
      const stream = await startCamera(nextFacing);
      streamRef.current = stream;
      bindCameraEnded(stream);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
    } catch (e) {
      failToHome(cameraError(e));
    }
  }

  function toggleCameraFacing() {
    const next = cameraFacing === "user" ? "environment" : "user";
    saveCameraFacing(next);
    if (next === "environment") setMirror(false);
    if (phase === "preview") void restartCamera(next);
  }

  function setMirror(on: boolean) {
    localStorage.setItem("bb.mirrorPreview", on ? "1" : "0");
    setMirrorPreview(on);
  }

  function clearResults() {
    setGifResult((r) => (r && URL.revokeObjectURL(r.url), null));
    setBoomerangResult((r) => (r && URL.revokeObjectURL(r.url), null));
    setVideoResult((r) => (r && URL.revokeObjectURL(r.url), null));
    mediaCache.current = {};
  }

  // Buy the watermark removal. On success, drop cached (watermarked) GIF/video
  // so they re-encode clean the next time their tab is opened.
  async function purchaseRemoveWatermark() {
    setError(null);
    try {
      if (await buyRemoveWatermark()) {
        setIsPro(true);
        clearResults();
        setNote("Watermark removed — thank you!");
      }
    } catch {
      setError("The purchase didn't go through. Please try again.");
    }
  }

  async function restoreRemoveWatermark() {
    setError(null);
    try {
      if (await restorePurchases()) {
        setIsPro(true);
        clearResults();
        setNote("Purchase restored.");
      } else {
        setNote("No previous purchase found.");
      }
    } catch {
      setError("Couldn't restore right now. Please try again.");
    }
  }

  async function openCamera({
    preserveFrames = false,
    retake = null,
  }: { preserveFrames?: boolean; retake?: number | null } = {}) {
    setError(null);
    abortRef.current = false;
    setDemoSetNum(null);
    setDemoCameraFrames(null);
    setDemoPreviewIndex(0);
    setRetakeIndex(retake);
    if (!preserveFrames) {
      clearActiveSession();
      resetFreshReviewLayout();
    }
    try {
      const stream = await startCamera(cameraFacing);
      streamRef.current = stream;
      // If the camera track ends mid-use (revoked, taken by another app),
      // drop the user back home with the permission message.
      bindCameraEnded(stream);
      if (!preserveFrames) setFrames([]);
      setPhase("preview");
    } catch (e) {
      setRetakeIndex(null);
      setError(cameraError(e));
      setPhase("idle");
    }
  }

  async function openDemoCamera(setNum: number) {
    if (!DEMO) return;
    setError(null);
    setNote(null);
    abortRef.current = false;
    stopCamera(streamRef.current);
    streamRef.current = null;
    try {
      const { loadSampleFrames } = await import("./lib/demo");
      const canvases = await loadSampleFrames(
        setNum,
        PHOTO_CAPTURE[quality.photo],
      );
      clearResults();
      clearActiveSession();
      resetFreshReviewLayout();
      setDemoSetNum(setNum);
      setDemoCameraFrames(canvases);
      setDemoPreviewIndex(0);
      setRetakeIndex(null);
      setFrames([]);
      setFormat("strip");
      setPhase("preview");
    } catch {
      setDemoSetNum(null);
      setDemoCameraFrames(null);
      setError(`Couldn't load demo set ${setNum}.`);
      setPhase("idle");
    }
  }

  async function importPhotos(files: FileList | File[]) {
    setError(null);
    setNote(null);
    abortRef.current = true;
    stopCamera(streamRef.current);
    streamRef.current = null;
    try {
      const canvases = await loadImportedFrames(
        files,
        PHOTO_CAPTURE[quality.photo],
      );
      clearResults();
      const freshLayout = resetFreshReviewLayout();
      setDemoSetNum(null);
      setDemoCameraFrames(null);
      setDemoPreviewIndex(0);
      setRetakeIndex(null);
      setFrames(canvases);
      setFormat("strip");
      setPhase("review");
      try {
        const photos = await Promise.all(canvases.map((c) => canvasToBlob(c)));
        activateSession(
          await saveSession(photos, buildSessionStyle({ layout: freshLayout })),
        );
      } catch {
        clearActiveSession();
      }
      pregenerate(canvases);
      setNote("Imported 4 photos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't import photos.");
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
    clearActiveSession();
    setDemoSetNum(null);
    setDemoCameraFrames(null);
    setDemoPreviewIndex(0);
    setRetakeIndex(null);
    setError(null);
    setPhase("idle");
  }

  async function runSequence() {
    if (demoCameraFrames) {
      await runDemoSequence(demoCameraFrames);
      return;
    }

    const video = videoRef.current;
    // Don't count down onto a dead/black stream — make sure we have real pixels.
    if (!video || !(await videoReady(video))) {
      setError("The camera isn't ready. Check camera access and try again.");
      return;
    }

    abortRef.current = false;
    setPhase("capturing");
    clearResults();
    const shotToReplace = retakeIndex;
    if (shotToReplace !== null) {
      await wait(400);
      for (let n = delay; n >= 1; n--) {
        if (abortRef.current) return;
        playCaptureTone(n === 1 ? 700 : 520, 70);
        setCountdown(n);
        await wait(1000);
      }
      if (abortRef.current) return;
      setCountdown(null);

      void tapHaptic("Medium");
      playCaptureTone(900, 120);
      setFlash(true);
      const frame = captureSquareFrame(
        video,
        PHOTO_CAPTURE[quality.photo],
        mirrorPreview,
      );
      const next = frames.map((existing, i) =>
        i === shotToReplace ? frame : existing,
      );
      setFrames(next);
      await wait(240);
      setFlash(false);
      stopCamera(streamRef.current);
      streamRef.current = null;
      setRetakeIndex(null);
      if (activeSessionId) {
        try {
          const photos = await Promise.all(next.map((c) => canvasToBlob(c)));
          const updated = await updateSessionPhotos(activeSessionId, photos);
          activateSession(updated);
        } catch {
          /* gallery update is best-effort */
        }
      }
      pregenerate(next);
      setFormat("strip");
      setPhase("review");
      return;
    }

    const freshLayout = resetFreshReviewLayout();
    const captured: HTMLCanvasElement[] = [];
    setFrames([]);
    await wait(400);

    for (let shot = 0; shot < SHOTS; shot++) {
      for (let n = delay; n >= 1; n--) {
        if (abortRef.current) return;
        playCaptureTone(n === 1 ? 700 : 520, 70);
        setCountdown(n);
        await wait(1000);
      }
      if (abortRef.current) return;
      setCountdown(null);

      void tapHaptic("Medium"); // light native shutter feel; never awaited (timing-sensitive)
      playCaptureTone(900, 120);
      setFlash(true);
      const frame = captureSquareFrame(
        video,
        PHOTO_CAPTURE[quality.photo],
        mirrorPreview,
      );
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
      activateSession(
        await saveSession(photos, buildSessionStyle({ layout: freshLayout })),
      );
    } catch {
      clearActiveSession();
      /* storage is best-effort — never block the flow on it */
    }

    // Start GIF + video encoding right now (foreground) so the review tabs are
    // instant and the short video finishes before the user can navigate away (a
    // backgrounded MediaRecorder stretches the clip). Then auto-save, also in
    // the background. Neither blocks the review screen.
    pregenerate(captured);
    void autoSaveToAlbum(captured, autosave);

    setFormat("strip");
    setPhase("review");
  }

  async function runDemoSequence(src: HTMLCanvasElement[]) {
    abortRef.current = false;
    setPhase("capturing");
    clearResults();
    const shotToReplace = retakeIndex;
    if (shotToReplace !== null) {
      setDemoPreviewIndex(shotToReplace);
      await wait(400);
      for (let n = delay; n >= 1; n--) {
        if (abortRef.current) return;
        playCaptureTone(n === 1 ? 700 : 520, 70);
        setCountdown(n);
        await wait(1000);
      }
      if (abortRef.current) return;
      setCountdown(null);

      void tapHaptic("Medium");
      playCaptureTone(900, 120);
      setFlash(true);
      const frame = src[shotToReplace];
      const next = frames.map((existing, i) =>
        i === shotToReplace ? frame : existing,
      );
      setFrames(next);
      await wait(240);
      setFlash(false);
      setRetakeIndex(null);
      pregenerate(next);
      setFormat("strip");
      setPhase("review");
      return;
    }

    resetFreshReviewLayout();
    const captured: HTMLCanvasElement[] = [];
    setFrames([]);
    await wait(400);

    for (let shot = 0; shot < SHOTS; shot++) {
      setDemoPreviewIndex(shot);
      for (let n = delay; n >= 1; n--) {
        if (abortRef.current) return;
        playCaptureTone(n === 1 ? 700 : 520, 70);
        setCountdown(n);
        await wait(1000);
      }
      if (abortRef.current) return;
      setCountdown(null);

      void tapHaptic("Medium");
      playCaptureTone(900, 120);
      setFlash(true);
      const frame = src[shot];
      captured.push(frame);
      setFrames([...captured]);
      await wait(240);
      setFlash(false);
      setDemoPreviewIndex(Math.min(shot + 1, SHOTS - 1));
      if (shot < SHOTS - 1) await wait(750);
    }

    pregenerate(captured);
    setNote("Demo shoot complete.");
    setFormat("strip");
    setPhase("review");
  }

  // Warm the GIF/video cache and populate the review results so switching tabs
  // is instant. Best-effort; never throws into the capture flow.
  function pregenerate(src: HTMLCanvasElement[]) {
    getGifBlob(src)
      .then((blob) =>
        setGifResult((r) =>
          r
            ? r
            : {
                url: URL.createObjectURL(blob),
                blob,
                filename: `boothbop-${stamp()}.gif`,
              },
        ),
      )
      .catch(() => {});
    getBoomerangBlob(src)
      .then((blob) =>
        setBoomerangResult((r) =>
          r
            ? r
            : {
                url: URL.createObjectURL(blob),
                blob,
                filename: `boothbop-boomerang-${stamp()}.gif`,
              },
        ),
      )
      .catch(() => {});
    if (isVideoSupported()) {
      getVideoResult(src)
        .then(({ blob, extension }) =>
          setVideoResult((r) =>
            r
              ? r
              : {
                  url: URL.createObjectURL(blob),
                  blob,
                  filename: `boothbop-${stamp()}.${extension}`,
                },
          ),
        )
        .catch(() => {});
    }
  }

  function retake() {
    if (demoSetNum !== null) {
      void openDemoCamera(demoSetNum);
      return;
    }
    clearResults();
    setFrames([]);
    setFormat("strip");
    openCamera();
  }

  function retakeShot(index: number) {
    if (demoCameraFrames) {
      clearResults();
      setDemoPreviewIndex(index);
      setRetakeIndex(index);
      setFormat("strip");
      setPhase("preview");
      return;
    }
    clearResults();
    setFormat("strip");
    openCamera({ preserveFrames: true, retake: index });
  }

  function moveShot(index: number, direction: MoveDirection) {
    clearResults();
    setFormat("strip");
    setFrames((current) => {
      const next = moveItem(current, index, direction);
      if (activeSessionId) void persistActivePhotos(next);
      return next;
    });
  }

  async function persistActivePhotos(next: HTMLCanvasElement[]) {
    if (!activeSessionId) return;
    try {
      const photos = await Promise.all(next.map((c) => canvasToBlob(c)));
      const updated = await updateSessionPhotos(activeSessionId, photos);
      activateSession(updated);
    } catch {
      /* gallery update is best-effort */
    }
  }

  // Reopen a saved session in the review screen so the user can get the strip,
  // GIF, or video (and re-share) from any past shoot — not just the strip.
  async function openSession(session: Session) {
    clearResults();
    setError(null);
    setNote(null);
    setDemoSetNum(null);
    setDemoCameraFrames(null);
    setDemoPreviewIndex(0);
    if (session.id.startsWith("demo-")) clearActiveSession();
    else activateSession(session);
    const lockedStyle = restoreSessionStyle(session.style);
    const canvases = await Promise.all(
      session.photos.map((b) => blobToCanvas(b)),
    );
    setFrames(canvases);
    setFormat("strip");
    setShowGallery(false);
    setPhase("review");
    if (lockedStyle) setNote("Some saved Pro styling is locked.");
  }

  // Strip preview (re-rendered when frames / layout / theme change).
  const stripUrl = useMemo(() => {
    if (frames.length < SHOTS) return null;
    return composeStrip(frames, layout, THEMES[themeKey], {
      logo: brandLogo,
      cell: PHOTO_CAPTURE[quality.photo],
      watermark: !isPro,
      filter,
      sticker,
      caption: stripCaption || undefined,
    }).toDataURL("image/png");
  }, [
    frames,
    layout,
    themeKey,
    brandLogo,
    quality.photo,
    isPro,
    filter,
    sticker,
    stripCaption,
  ]);

  const thumbs = useMemo(
    () => frames.map((f) => f.toDataURL("image/jpeg", 0.7)),
    [frames],
  );
  const demoPreviewUrl = useMemo(() => {
    if (!demoCameraFrames || phase === "review") return null;
    const frame = demoCameraFrames[demoPreviewIndex];
    return frame ? frame.toDataURL("image/jpeg", 0.82) : null;
  }, [demoCameraFrames, demoPreviewIndex, phase]);

  // Switching format lazily generates the GIF / video the first time.
  async function selectFormat(f: Format) {
    setFormat(f);
    setError(null);
    setNote(null);
    if (f === "gif" && !gifResult) await ensureGif();
    if (f === "boomerang" && !boomerangResult) await ensureBoomerang();
    if (f === "video" && !videoResult) await ensureVideo();
  }

  async function ensureGif() {
    setGenerating("gif");
    try {
      await wait(30); // let the spinner paint before the (sync) encode
      const blob = await getGifBlob(frames);
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
      setError("Couldn't create the GIF.");
    } finally {
      setGenerating(null);
    }
  }

  async function ensureBoomerang() {
    setGenerating("boomerang");
    try {
      await wait(30);
      const blob = await getBoomerangBlob(frames);
      setBoomerangResult((r) =>
        r
          ? r
          : {
              url: URL.createObjectURL(blob),
              blob,
              filename: `boothbop-boomerang-${stamp()}.gif`,
            },
      );
    } catch {
      setError("Couldn't create the boomerang.");
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
      const { blob, extension } = await getVideoResult(frames);
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
      setError(e instanceof Error ? e.message : "Couldn't record the video.");
    } finally {
      setGenerating(null);
    }
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
        watermark: !isPro,
        filter,
        sticker,
        caption: stripCaption || undefined,
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
    if (format === "boomerang") return boomerangResult;
    if (format === "video") return videoResult;
    const blob = await stripBlob(frames, layout, THEMES[themeKey], {
      cell: PHOTO_CAPTURE[quality.photo],
      watermark: !isPro,
      filter,
      sticker,
      caption: stripCaption || undefined,
    });
    return { url: "", blob, filename: `boothbop-${stamp()}.png` };
  }

  function renderedShot(frame: HTMLCanvasElement): HTMLCanvasElement {
    return renderFrame(frame, PHOTO_CAPTURE[quality.photo], {
      filter,
      sticker,
    });
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

  function playCaptureTone(frequency: number, durationMs: number) {
    if (!captureSound) return;
    try {
      const AudioCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationMs / 1000 + 0.02);
      osc.onended = () => void ctx.close().catch(() => {});
    } catch {
      /* audio is best-effort */
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

  async function saveAllCurrent() {
    if (frames.length < SHOTS || savingAll) return;
    setSavingAll(true);
    setError(null);
    setNote(null);
    try {
      const stampNow = stamp();
      const strip = await stripBlob(frames, layout, THEMES[themeKey], {
        cell: PHOTO_CAPTURE[quality.photo],
        watermark: !isPro,
        filter,
        sticker,
        caption: stripCaption || undefined,
      });
      const gif = await getGifBlob(frames);
      const boomerang = await getBoomerangBlob(frames);
      const results: {
        blob: Blob;
        filename: string;
        kind: "image" | "video";
      }[] = [
        {
          blob: strip,
          filename: `boothbop-strip-${stampNow}.png`,
          kind: "image",
        },
        {
          blob: gif,
          filename: `boothbop-loop-${stampNow}.gif`,
          kind: "image",
        },
        {
          blob: boomerang,
          filename: `boothbop-boomerang-${stampNow}.gif`,
          kind: "image",
        },
      ];
      if (isVideoSupported()) {
        const { blob, extension } = await getVideoResult(frames);
        results.push({
          blob,
          filename: `boothbop-video-${stampNow}.${extension}`,
          kind: "video",
        });
      }
      const shots = await Promise.all(
        frames.map((frame) =>
          canvasToBlob(renderedShot(frame), "image/jpeg", 0.92),
        ),
      );
      results.push(
        ...shots.map((blob, index) => ({
          blob,
          filename: `boothbop-shot-${index + 1}-${stampNow}.jpg`,
          kind: "image" as const,
        })),
      );

      if (isNativeShell()) {
        const status = await ensurePhotosPermission("cameraRoll", true);
        if (status !== "granted" && status !== "limited") {
          setError("Photos access is needed to save everything.");
          return;
        }
        for (const media of results) {
          await saveToPhotos(media.blob, media.kind, "cameraRoll");
        }
        setNote(`Saved ${results.length} files to Photos.`);
        return;
      }

      for (const media of results) {
        triggerDownload(media.blob, media.filename);
        await wait(120);
      }
      setNote(`Downloaded ${results.length} files.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save everything.");
    } finally {
      setSavingAll(false);
    }
  }

  const previewUrl =
    format === "strip"
      ? stripUrl
      : format === "gif"
        ? (gifResult?.url ?? null)
        : format === "boomerang"
          ? (boomerangResult?.url ?? null)
          : (videoResult?.url ?? null);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-4">
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
            onImportPhotos={(files) => void importPhotos(files)}
            demoSets={DEMO ? DEMO_SETS : []}
            onStartDemo={(setNum) => void openDemoCamera(setNum)}
            installPrompt={installPrompt}
            error={error}
          />
        ))}

      {(phase === "preview" || phase === "capturing") && (
        <CameraScreen
          videoRef={videoRef}
          phase={phase}
          retakeIndex={retakeIndex}
          demoPreviewUrl={demoPreviewUrl}
          countdown={countdown}
          flash={flash}
          thumbs={thumbs}
          delay={delay}
          setDelay={changeDelay}
          captureSound={captureSound}
          cameraFacing={cameraFacing}
          mirrorPreview={mirrorPreview}
          onToggleFacing={toggleCameraFacing}
          onToggleMirror={() => setMirror(!mirrorPreview)}
          onToggleSound={toggleCaptureSound}
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
          setLayout={changeLayout}
          themeKey={themeKey}
          setThemeKey={changeThemeKey}
          filter={filter}
          filters={FILTERS}
          setFilter={changeFilter}
          sticker={sticker}
          stickers={STICKERS}
          setSticker={changeSticker}
          stylePresets={STYLE_PRESETS}
          isPro={isPro}
          onApplyPreset={applyStylePreset}
          error={error}
          note={note}
          shareFilesOk={shareFilesOk}
          savingAll={savingAll}
          thumbs={thumbs}
          sessionTitle={sessionTitle}
          sessionFavorite={sessionFavorite}
          canManageSession={activeSessionId !== null}
          autosaveTip={isNativeShell() && !autosaveTipSeen}
          onOpenSettings={openSettings}
          onDismissTip={dismissAutosaveTip}
          onShare={shareCurrent}
          onDownload={downloadCurrent}
          onSaveAll={saveAllCurrent}
          onSessionTitle={changeSessionTitle}
          onToggleFavorite={toggleSessionFavorite}
          onRetake={retake}
          onRetakeShot={retakeShot}
          onMoveShot={moveShot}
        />
      )}

      {showGallery && (
        <GalleryScreen
          onClose={() => setShowGallery(false)}
          onOpen={openSession}
          demo={DEMO}
        />
      )}

      {showSettings && (
        <SettingsScreen
          settings={autosave}
          quality={quality}
          exportSpeed={exportSpeed}
          native={isNativeShell()}
          videoSupported={isVideoSupported()}
          error={autosaveError}
          isPro={isPro}
          proPrice={proProduct?.price ?? null}
          customCaption={customCaption}
          onDest={changeAutosaveDest}
          onToggle={toggleAutosaveFormat}
          onQuality={changeQuality}
          onExportSpeed={changeExportSpeed}
          onCustomCaption={setCustomCaption}
          onBuyRemoveWatermark={purchaseRemoveWatermark}
          onRestorePurchase={restoreRemoveWatermark}
          onOpenIosSettings={() => void openIosSettings()}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
}
