import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CAMERA_MSG,
  cameraError,
  captureBestSquareFrame,
  captureSquareFrame,
  startCamera,
  stopCamera,
  videoReady,
} from "./lib/camera";
import {
  composeStrip,
  PREVIEW_CELL,
  stripBlob,
  stripCellForFrames,
  THEMES,
  type Layout,
  type StripTheme,
} from "./lib/strip";
import { encodeGif } from "./lib/gif";
import {
  encodeVideo,
  isSocialVideoSupported,
  isVideoSupported,
  type VideoResult,
} from "./lib/video";
import { encodeVideoNative } from "./lib/videoNative";
import { canShareFiles, isNativeShell, probeShareFiles } from "./lib/platform";
import {
  blobToCanvas,
  canvasToCoverBlob,
  canvasesToBlobs,
  requestPersistence,
  saveSession,
  updateSessionPhotos,
  type Session,
} from "./lib/gallery";
import {
  GIF_SIZE,
  PHOTO_CAPTURE,
  VIDEO_PROFILE,
  loadBranding,
  planAutosaveTasks,
  saveBranding,
  type AutosaveSettings,
  type AutosaveTask,
} from "./lib/settings";
import {
  canSaveWithPermission,
  ensurePhotosPermission,
  openIosSettings,
  saveToPhotos,
  type PermissionResult,
} from "./lib/photosAlbum";
import { loadWatermark } from "./lib/watermark";
import { onceAfterSuccess } from "./lib/onceAfterSuccess";
import { storageGet, storageSet } from "./lib/safeStorage";
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
import { configureHighQualityScaling, type FilterId } from "./lib/filter";
import { replaceFrame, SessionPersistenceQueue } from "./lib/session";
import {
  boomFrameDelay,
  loadBoomSpeed,
  saveBoomSpeed,
  type BoomSpeed,
} from "./lib/boom";
import { useRemoteConfig } from "./hooks/useRemoteConfig";
import {
  planSocialVideo,
  SOCIAL_VIDEO_BACKGROUND,
  shareAction,
  SOCIAL_VIDEO_MIME,
} from "./lib/socialShare";
import {
  dismissReleaseAnnouncement,
  loadReleaseAnnouncement,
} from "./lib/whatsNew";
import { RenderJob } from "./lib/renderJob";
import { mediaRenderKey } from "./lib/renderKey";
import {
  canUseNativeCamera,
  captureNativeSquareFrame,
  finishNativeShutterFreeze,
  observeNativeCameraFailures,
  setNativePreviewFrame,
  startNativeCamera,
  stopNativeCamera,
} from "./lib/cameraNative";

interface MediaResult {
  url: string;
  blob: Blob;
  filename: string;
}

interface FrozenCapture {
  frame: HTMLCanvasElement;
  releaseFreeze: () => Promise<void>;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const SHUTTER_FREEZE_MS = 600;
const LIVE_PREVIEW_RECOVERY_MS = 50;
const FINAL_CAPTURE_CONFIRMATION_MS = 150;
const REVIEW_PRELOAD_TIMEOUT_MS = 1_500;
const FIRST_SHOT_COUNTDOWN_SECONDS = 3;
const afterPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

async function prepareImageForPaint(src: string): Promise<void> {
  const image = new Image();
  if (typeof image.decode === "function") {
    image.src = src;
    try {
      await Promise.race([image.decode(), wait(REVIEW_PRELOAD_TIMEOUT_MS)]);
    } catch {
      // Review still has its normal image loading path if pre-decoding fails.
    }
    return;
  }
  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    image.onload = finish;
    image.onerror = finish;
    image.src = src;
    if (image.complete) {
      queueMicrotask(finish);
    }
  });
}

function thumbnailUrl(frame: HTMLCanvasElement, size = 160): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  configureHighQualityScaling(context);
  context.drawImage(frame, 0, 0, frame.width, frame.height, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.82);
}

// Screenshot mode: a flag-gated sample loader (see lib/demo.ts) for producing
// App Store screenshots without a camera. Off in the submission build.
const DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO === "1";

export default function App() {
  const remoteConfig = useRemoteConfig();
  const runtimeFeatures = {
    ...remoteConfig.features,
    video: remoteConfig.features.video && isVideoSupported(),
  };
  const [phase, setPhase] = useState<Phase>("idle");
  const [frames, setFrames] = useState<HTMLCanvasElement[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [freezeFrame, setFreezeFrame] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [layout, setLayout] = useState<Layout>("4x1");
  const [themeKey, setThemeKey] = useState<keyof typeof THEMES>("classic");
  const [error, setError] = useState<string | null>(null);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [nativeCameraActive, setNativeCameraActive] = useState(false);
  const [nativePreviewVisible, setNativePreviewVisible] = useState(false);

  const [format, setFormat] = useState<Format>("strip");
  const [generating, setGenerating] = useState<
    null | "gif" | "video" | "share"
  >(null);
  const [gifResult, setGifResult] = useState<MediaResult | null>(null);
  const [videoResult, setVideoResult] = useState<MediaResult | null>(null);
  const [socialVideoResult, setSocialVideoResult] =
    useState<MediaResult | null>(null);
  const [socialPreparation, setSocialPreparation] = useState<
    "idle" | "preparing" | "ready" | "error"
  >("idle");
  const [filter, setFilter] = useState<FilterId>(() => {
    const stored = storageGet("bb.filter");
    return stored === "warm" ||
      stored === "cool" ||
      stored === "bw" ||
      stored === "sepia" ||
      stored === "inverse"
      ? stored
      : "original";
  });
  const [boom, setBoom] = useState(() => storageGet("bb.boom") === "1");
  const [boomSpeed, setBoomSpeed] = useState<BoomSpeed>(loadBoomSpeed);
  const [branding, setBranding] = useState(loadBranding);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const pendingSessionSaveRef = useRef<Promise<Session | null> | null>(null);
  const stripPreviewRef = useRef<string | null>(null);
  const sessionPersistenceRef = useRef(new SessionPersistenceQueue());

  const [note, setNote] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [shareFilesOk, setShareFilesOk] = useState(false);
  const [releaseAnnouncement, setReleaseAnnouncement] = useState(
    loadReleaseAnnouncement,
  );

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
    boomSpeed: BoomSpeed;
    branding: boolean;
  }
  const renderRevision = useRef(0);
  const gifJob = useRef(new RenderJob<Blob>());
  const videoJob = useRef(new RenderJob<VideoResult>());
  const socialVideoJob = useRef(new RenderJob<VideoResult>());
  const stripJob = useRef(new RenderJob<Blob>());
  const socialMediaRef = useRef<MediaResult | null>(null);
  const prewarmTimer = useRef<number | null>(null);
  const generatingOwner = useRef<symbol | null>(null);
  const mediaUrls = useRef(new Set<string>());
  const shareInFlight = useRef(false);
  const currentChoices = (): RenderChoices => ({
    filter,
    boom: runtimeFeatures.boom && boom,
    boomSpeed,
    branding,
  });
  const renderKey = (
    kind: string,
    choices: RenderChoices,
    extra = "",
    revision = renderRevision.current,
  ) => mediaRenderKey(revision, kind, choices, extra);

  function beginGenerating(kind: "gif" | "video" | "share"): symbol {
    const owner = Symbol(kind);
    generatingOwner.current = owner;
    setGenerating(kind);
    return owner;
  }

  function endGenerating(owner: symbol): void {
    if (generatingOwner.current !== owner) return;
    generatingOwner.current = null;
    setGenerating(null);
  }

  function mediaUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    mediaUrls.current.add(url);
    return url;
  }

  async function getGifBlob(
    src: HTMLCanvasElement[],
    choices: RenderChoices = currentChoices(),
    revision = renderRevision.current,
    owner?: symbol,
  ): Promise<Blob> {
    return gifJob.current.get(
      renderKey("gif", choices, "", revision),
      async (signal) => {
        const watermarkImg = choices.branding ? await loadWatermark() : null;
        return encodeGif(src, {
          watermark: choices.branding,
          watermarkImg,
          filter: choices.filter,
          boom: choices.boom,
          delay: choices.boom ? boomFrameDelay(choices.boomSpeed) : undefined,
          size: GIF_SIZE.high,
          signal,
        });
      },
      owner,
    );
  }
  async function getVideoResult(
    src: HTMLCanvasElement[],
    choices: RenderChoices = currentChoices(),
    revision = renderRevision.current,
    owner?: symbol,
  ): Promise<VideoResult> {
    return videoJob.current.get(
      renderKey("video", choices, "", revision),
      async (signal) => {
        const watermarkImg = choices.branding ? await loadWatermark() : null;
        const opts = {
          watermark: choices.branding,
          watermarkImg,
          filter: choices.filter,
          ...VIDEO_PROFILE.high,
          signal,
        };
        return isNativeShell()
          ? encodeVideoNative(src, opts)
          : encodeVideo(src, opts);
      },
      owner,
    );
  }

  async function getSocialVideoResult(
    src: HTMLCanvasElement[],
    choices: RenderChoices = currentChoices(),
    revision = renderRevision.current,
  ): Promise<VideoResult> {
    return socialVideoJob.current.get(
      renderKey("social", choices, "", revision),
      async (signal) => {
        const profile = VIDEO_PROFILE.high;
        const plan = planSocialVideo({
          frameCount: src.length,
          boom: choices.boom,
          boomSpeed: choices.boomSpeed,
        });
        const orderedFrames = plan.frameIndexes.map((index) => src[index]);
        const watermarkImg = choices.branding ? await loadWatermark() : null;
        const options = {
          watermark: choices.branding,
          watermarkImg,
          filter: choices.filter,
          width: plan.width,
          height: plan.height,
          backgroundColor: SOCIAL_VIDEO_BACKGROUND,
          bitrate: profile.bitrate,
          frameMs: plan.frameMs,
          loops: plan.loops,
          signal,
        };
        const result = isNativeShell()
          ? await encodeVideoNative(orderedFrames, options)
          : await encodeVideo(orderedFrames, options);

        if (
          result.extension !== "mp4" ||
          !result.blob.type.startsWith("video/mp4")
        ) {
          throw new Error("This device did not produce a compatible MP4.");
        }
        return result;
      },
    );
  }

  // Shutter delay (seconds counted down before each shot), persisted.
  const [delay, setDelay] = useState<number>(() => {
    const v = Number(storageGet("bb.delay"));
    return v === 1 || v === 2 || v === 3 ? v : 2;
  });
  useEffect(() => {
    storageSet("bb.delay", String(delay));
  }, [delay]);

  useEffect(() => {
    if (
      (format === "gif" && !runtimeFeatures.gif) ||
      (format === "video" && !runtimeFeatures.video)
    ) {
      setFormat("strip");
    }
  }, [format, runtimeFeatures.gif, runtimeFeatures.video]);

  useEffect(() => setShareFilesOk(isNativeShell() || probeShareFiles()), []);
  // Best-effort: ask the browser to keep the private gallery through eviction.
  useEffect(() => requestPersistence(), []);
  // Preload the strip-footer logo.
  useEffect(() => {
    loadWatermark().then(setBrandLogo);
  }, []);

  // Detect arrival from the retired PhotoBlast app — its migration page links to
  // boothbop.com/?from=photoblast. Persist it so the welcome-back guidance
  // survives reloads until they've installed BoothBop.
  const [migrated, setMigrated] = useState(
    () => storageGet("bb.migrated") === "1",
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "photoblast") {
      storageSet("bb.migrated", "1");
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
    () => storageGet("bb.migrationDismissed") === "1",
  );
  // Never show the install nudge or the PhotoBlast migration landing inside the
  // native App Store build — both point users to the web/PWA, which Apple rejects.
  const showMigration = migrated && !migrationDismissed && !isNativeShell();
  function dismissMigration() {
    storageSet("bb.migrationDismissed", "1");
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
  const cameraOpeningRef = useRef(false);
  const activeCameraOpenRequestRef = useRef<number | null>(null);
  const pendingCameraOpenRef = useRef<{
    request: number;
    index: number | null;
  } | null>(null);
  const sequenceOwnerRef = useRef<symbol | null>(null);
  const galleryOpenRequestRef = useRef(0);
  const nativeLaunchStartedRef = useRef(false);
  const hideNativeSplashRef = useRef<(() => Promise<void>) | null>(null);
  const hideNativeSplashRetryRef = useRef<number | null>(null);
  const hideNativeSplashAttemptsRef = useRef(0);
  const nativeCameraActiveRef = useRef(false);
  const nativeCameraStartPendingRef = useRef(false);
  const nativeCameraStopPromiseRef = useRef<Promise<void> | null>(null);
  const resumeCameraAfterOverlayRef = useRef<number | null | undefined>(
    undefined,
  );
  const resumeCameraAfterVisibilityRef = useRef<number | null | undefined>(
    undefined,
  );
  const openCameraRef = useRef<
    ((index?: number | null) => Promise<void>) | null
  >(null);

  const hideNativeSplash = useCallback(async function hideNativeSplash() {
    if (!isNativeShell()) return;
    hideNativeSplashRef.current ??= onceAfterSuccess(async () => {
      await afterPaint();
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();
    });
    try {
      await hideNativeSplashRef.current();
      hideNativeSplashAttemptsRef.current = 0;
      if (hideNativeSplashRetryRef.current !== null) {
        window.clearTimeout(hideNativeSplashRetryRef.current);
        hideNativeSplashRetryRef.current = null;
      }
    } catch {
      if (
        hideNativeSplashRetryRef.current === null &&
        hideNativeSplashAttemptsRef.current < 3
      ) {
        hideNativeSplashAttemptsRef.current += 1;
        hideNativeSplashRetryRef.current = window.setTimeout(() => {
          hideNativeSplashRetryRef.current = null;
          void hideNativeSplash();
        }, 250);
      }
    }
  }, []);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  function framesAreCurrent(expected: HTMLCanvasElement[]): boolean {
    return (
      framesRef.current.length === expected.length &&
      framesRef.current.every((frame, index) => frame === expected[index])
    );
  }

  const stopActiveCamera = useCallback(() => {
    stopCamera(streamRef.current);
    streamRef.current = null;
    setNativePreviewVisible(false);
    if (nativeCameraActiveRef.current || nativeCameraStartPendingRef.current) {
      nativeCameraActiveRef.current = false;
      setNativeCameraActive(false);
      nativeCameraStopPromiseRef.current ??= stopNativeCamera().finally(() => {
        nativeCameraStopPromiseRef.current = null;
      });
    }
  }, []);

  function suspendCameraForOverlay() {
    if (phase !== "preview" && !cameraOpeningRef.current) return;
    resumeCameraAfterOverlayRef.current = retakeIndexRef.current;
    abortRef.current = true;
    cameraRequestRef.current += 1;
    pendingCameraOpenRef.current = null;
    stopActiveCamera();
  }

  function resumeCameraAfterOverlay() {
    const index = resumeCameraAfterOverlayRef.current;
    resumeCameraAfterOverlayRef.current = undefined;
    if (index !== undefined) void openCameraRef.current?.(index);
  }

  function openGalleryFromTopBar() {
    suspendCameraForOverlay();
    setShowSettings(false);
    setShowGallery(true);
  }

  function openSettingsFromTopBar() {
    suspendCameraForOverlay();
    setShowGallery(false);
    openSettings();
  }

  function openCameraFromGallery() {
    galleryOpenRequestRef.current += 1;
    resumeCameraAfterOverlayRef.current = undefined;
    setShowGallery(false);
    void openCameraRef.current?.();
  }

  // Retake failures preserve the original four frames. Native camera failures
  // stay on a recoverable camera surface; only the web app returns home.
  const failCamera = useCallback(
    (msg: string) => {
      const preserveReview =
        retakeIndexRef.current !== null && framesRef.current.length === SHOTS;
      abortRef.current = true;
      cameraRequestRef.current += 1;
      pendingCameraOpenRef.current = null;
      sequenceOwnerRef.current = null;
      setCountdown(null);
      setFreezeFrame(null);
      stopActiveCamera();
      if (!preserveReview) setFrames([]);
      setRetakeIndex(null);
      retakeIndexRef.current = null;
      setPhase(
        preserveReview ? "review" : isNativeShell() ? "preview" : "idle",
      );
      setError(msg);
    },
    [stopActiveCamera],
  );

  async function captureActiveCameraFrame(
    video: HTMLVideoElement | null,
  ): Promise<HTMLCanvasElement> {
    if (nativeCameraActiveRef.current) return captureNativeSquareFrame();
    if (!video) throw new Error("Camera preview unavailable");
    return captureBestSquareFrame(video);
  }

  async function captureCameraFrameWithFreeze(
    video: HTMLVideoElement | null,
  ): Promise<FrozenCapture> {
    const nativeFreeze = nativeCameraActiveRef.current;
    const preview =
      !nativeFreeze && video ? captureSquareFrame(video, 720) : null;
    if (preview) setFreezeFrame(preview);

    let released = false;
    const releaseFreeze = async () => {
      if (released) return;
      released = true;
      if (preview) {
        setFreezeFrame((current) => (current === preview ? null : current));
      } else if (nativeFreeze) {
        await finishNativeShutterFreeze();
      }
    };

    try {
      const [frame] = await Promise.all([
        captureActiveCameraFrame(video),
        wait(SHUTTER_FREEZE_MS),
      ]);
      return { frame, releaseFreeze };
    } catch (error) {
      await releaseFreeze();
      throw error;
    }
  }

  // Attach the live stream whenever we are showing the camera.
  useEffect(() => {
    if (phase !== "preview" && phase !== "capturing") return;
    if (nativeCameraActive) {
      let cancelled = false;
      const request = cameraRequestRef.current;
      const preview = document.querySelector<HTMLElement>(".camera-preview");
      if (!preview) return;
      const positionPreview = async () => {
        const cornerRadius =
          Number.parseFloat(getComputedStyle(preview).borderTopLeftRadius) || 0;
        await setNativePreviewFrame(
          preview.getBoundingClientRect(),
          cornerRadius,
        );
        if (cancelled || request !== cameraRequestRef.current) return;
        document.documentElement.classList.add("native-camera-active");
        setNativePreviewVisible(true);
      };
      const handlePositionFailure = () => {
        if (!cancelled && request === cameraRequestRef.current) {
          failCamera("Couldn't start the iPhone camera.");
        }
      };
      const updatePreview = () => {
        void positionPreview().catch(handlePositionFailure);
      };
      void positionPreview()
        .then(() => {
          if (!cancelled && request === cameraRequestRef.current) {
            void hideNativeSplash();
          }
        })
        .catch(handlePositionFailure);
      window.addEventListener("resize", updatePreview);
      return () => {
        cancelled = true;
        window.removeEventListener("resize", updatePreview);
        document.documentElement.classList.remove("native-camera-active");
        setNativePreviewVisible(false);
      };
    }
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video
        .play()
        .then(async () => {
          if (await videoReady(video)) await hideNativeSplash();
        })
        .catch(() => {});
    }
  }, [failCamera, hideNativeSplash, nativeCameraActive, phase]);

  useEffect(() => {
    if (error && isNativeShell()) void hideNativeSplash();
  }, [error, hideNativeSplash]);

  // Release the camera when the component goes away.
  useEffect(
    () => () => {
      if (hideNativeSplashRetryRef.current !== null) {
        window.clearTimeout(hideNativeSplashRetryRef.current);
      }
      nativeCameraStartPendingRef.current = false;
      stopCamera(streamRef.current);
      void stopNativeCamera();
    },
    [],
  );

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
  }, [failCamera]);

  useEffect(() => {
    if (!isNativeShell()) return;
    let disposed = false;
    let removeListener: (() => void) | undefined;
    void observeNativeCameraFailures((message) => failCamera(message)).then(
      (remove) => {
        if (disposed) remove();
        else removeListener = remove;
      },
    );
    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [failCamera]);

  function clearResults() {
    if (prewarmTimer.current !== null) {
      window.clearTimeout(prewarmTimer.current);
      prewarmTimer.current = null;
    }
    renderRevision.current += 1;
    gifJob.current.invalidate();
    videoJob.current.invalidate();
    socialVideoJob.current.invalidate();
    stripJob.current.invalidate();
    generatingOwner.current = null;
    setGenerating(null);
    setSocialPreparation("idle");
    socialMediaRef.current = null;
    for (const url of mediaUrls.current) URL.revokeObjectURL(url);
    mediaUrls.current.clear();
    setGifResult(null);
    setVideoResult(null);
    setSocialVideoResult(null);
  }

  useEffect(
    () => () => {
      if (prewarmTimer.current !== null)
        window.clearTimeout(prewarmTimer.current);
      gifJob.current.invalidateAll();
      videoJob.current.invalidateAll();
      socialVideoJob.current.invalidateAll();
      stripJob.current.invalidateAll();
      for (const url of mediaUrls.current) URL.revokeObjectURL(url);
      mediaUrls.current.clear();
    },
    [],
  );

  async function performCameraOpen(request: number, index: number | null) {
    const requestIsStale = () =>
      request !== cameraRequestRef.current || abortRef.current;
    sequenceOwnerRef.current = null;
    setError(null);
    setNativePreviewVisible(false);
    abortRef.current = false;
    setRetakeIndex(index);
    retakeIndexRef.current = index;
    try {
      let stream: MediaStream | null = null;
      let native = false;
      const nativeAvailable = await canUseNativeCamera();
      if (requestIsStale()) return;
      if (nativeAvailable) {
        try {
          if (nativeCameraStopPromiseRef.current) {
            await nativeCameraStopPromiseRef.current;
          }
          nativeCameraStartPendingRef.current = true;
          await startNativeCamera();
          nativeCameraStartPendingRef.current = false;
          native = true;
        } catch (nativeError) {
          nativeCameraStartPendingRef.current = false;
          if (nativeCameraStopPromiseRef.current) {
            await nativeCameraStopPromiseRef.current;
          } else {
            await stopNativeCamera();
          }
          if (requestIsStale()) return;
          throw nativeError;
        }
      }
      if (requestIsStale()) {
        if (native) {
          if (nativeCameraStopPromiseRef.current) {
            await nativeCameraStopPromiseRef.current;
          } else {
            await stopNativeCamera();
          }
        }
        return;
      }
      if (!native) stream = await startCamera();
      if (requestIsStale()) {
        if (native) await stopNativeCamera();
        else stopCamera(stream);
        return;
      }
      nativeCameraActiveRef.current = native;
      setNativeCameraActive(native);
      streamRef.current = stream;
      // If the camera track ends mid-use (revoked, taken by another app),
      // drop the user back home with the permission message.
      stream?.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          if (
            request === cameraRequestRef.current &&
            streamRef.current === stream
          ) {
            failCamera(CAMERA_MSG);
          }
        });
      });
      if (index === null) {
        setFrames([]);
        activeSessionIdRef.current = null;
        pendingSessionSaveRef.current = null;
      }
      setPhase("preview");
    } catch (e) {
      if (requestIsStale()) return;
      setError(cameraError(e));
      setRetakeIndex(null);
      retakeIndexRef.current = null;
      setPhase(
        index === null ? (isNativeShell() ? "preview" : "idle") : "review",
      );
    }
  }

  async function openCamera(index: number | null = null) {
    if (
      cameraOpeningRef.current &&
      activeCameraOpenRequestRef.current === cameraRequestRef.current &&
      pendingCameraOpenRef.current === null
    ) {
      return;
    }

    if (index === null) clearResults();

    const request = ++cameraRequestRef.current;
    pendingCameraOpenRef.current = { request, index };
    abortRef.current = false;
    if (cameraOpeningRef.current) return;

    cameraOpeningRef.current = true;
    setOpeningCamera(true);
    try {
      while (pendingCameraOpenRef.current) {
        const pending = pendingCameraOpenRef.current;
        pendingCameraOpenRef.current = null;
        activeCameraOpenRequestRef.current = pending.request;
        await performCameraOpen(pending.request, pending.index);
      }
    } finally {
      activeCameraOpenRequestRef.current = null;
      cameraOpeningRef.current = false;
      setOpeningCamera(false);
    }
  }
  useEffect(() => {
    openCameraRef.current = openCamera;
  });

  useEffect(() => {
    if (!isNativeShell()) return;

    const reconcileVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (phase === "capturing" && !showGallery && !showSettings) {
          resumeCameraAfterVisibilityRef.current = undefined;
          failCamera(
            "Photo session paused. Try again when BoothBop is active.",
          );
          return;
        }
        if (
          (phase !== "preview" && !cameraOpeningRef.current) ||
          showGallery ||
          showSettings
        ) {
          return;
        }

        resumeCameraAfterVisibilityRef.current = retakeIndexRef.current;
        abortRef.current = true;
        cameraRequestRef.current += 1;
        pendingCameraOpenRef.current = null;
        sequenceOwnerRef.current = null;
        setCountdown(null);
        setFreezeFrame(null);
        stopActiveCamera();
        return;
      }

      const index = resumeCameraAfterVisibilityRef.current;
      if (index === undefined || showGallery || showSettings) {
        return;
      }
      resumeCameraAfterVisibilityRef.current = undefined;
      void openCameraRef.current?.(index);
    };

    document.addEventListener("visibilitychange", reconcileVisibility);
    return () => {
      document.removeEventListener("visibilitychange", reconcileVisibility);
    };
  }, [failCamera, phase, showGallery, showSettings, stopActiveCamera]);

  // Native launches proceed directly into a single camera request. The iOS
  // launch view remains in place until the video element has real pixels, so
  // a cold WebKit startup can never expose a black or empty frame.
  useEffect(() => {
    if (!isNativeShell() || nativeLaunchStartedRef.current) return;
    nativeLaunchStartedRef.current = true;
    void openCameraRef.current?.();
  }, []);

  // Stop everything and go back to the start screen.
  function cancelToHome() {
    abortRef.current = true;
    cameraRequestRef.current += 1;
    pendingCameraOpenRef.current = null;
    sequenceOwnerRef.current = null;
    setCountdown(null);
    setFreezeFrame(null);
    stopActiveCamera();
    clearResults();
    setFrames([]);
    activeSessionIdRef.current = null;
    pendingSessionSaveRef.current = null;
    setRetakeIndex(null);
    retakeIndexRef.current = null;
    setError(null);
    setPhase("idle");
  }

  function cancelCamera() {
    const returnToReview = retakeIndexRef.current !== null;
    abortRef.current = true;
    sequenceOwnerRef.current = null;
    setCountdown(null);
    setFreezeFrame(null);
    setRetakeIndex(null);
    retakeIndexRef.current = null;
    if (returnToReview) {
      cameraRequestRef.current += 1;
      stopActiveCamera();
      setPhase("review");
      return;
    }
    setFrames([]);
    if (isNativeShell()) {
      setPhase("preview");
      return;
    }
    cameraRequestRef.current += 1;
    stopActiveCamera();
    setPhase("idle");
  }

  async function runSequence() {
    if (sequenceOwnerRef.current) return;
    if (!streamRef.current && !nativeCameraActiveRef.current) return;
    abortRef.current = false;
    const owner = Symbol("capture-sequence");
    const cameraRequest = cameraRequestRef.current;
    sequenceOwnerRef.current = owner;
    try {
      await executeSequence(cameraRequest, owner);
    } finally {
      if (sequenceOwnerRef.current === owner) {
        sequenceOwnerRef.current = null;
      }
    }
  }

  async function executeSequence(cameraRequest: number, owner: symbol) {
    const sequenceCancelled = () =>
      abortRef.current ||
      cameraRequest !== cameraRequestRef.current ||
      sequenceOwnerRef.current !== owner;
    const video = videoRef.current;
    // Don't count down onto a dead/black stream — make sure we have real pixels.
    if (!nativeCameraActiveRef.current) {
      const ready = Boolean(video && (await videoReady(video)));
      if (sequenceCancelled()) return;
      if (!ready) {
        failCamera(
          "The camera isn't ready. Check camera access and try again.",
        );
        return;
      }
    }
    if (sequenceCancelled()) return;

    setPhase("capturing");
    clearResults();
    const sessionRevision = renderRevision.current;
    const replacing = retakeIndexRef.current;
    const runCountdown = async (seconds: number): Promise<boolean> => {
      for (let n = seconds; n >= 1; n--) {
        if (sequenceCancelled()) return false;
        setCountdown(n);
        await wait(1000);
      }
      if (sequenceCancelled()) return false;
      setCountdown(null);
      return true;
    };

    if (replacing !== null) {
      await wait(400);
      if (!(await runCountdown(FIRST_SHOT_COUNTDOWN_SECONDS))) return;

      try {
        void tapHaptic("Medium");
        const { frame: replacement, releaseFreeze } =
          await captureCameraFrameWithFreeze(video);
        if (sequenceCancelled()) {
          await releaseFreeze();
          return;
        }
        const updated = replaceFrame(framesRef.current, replacing, replacement);
        framesRef.current = updated;
        setFrames(updated);

        setRetakeIndex(null);
        retakeIndexRef.current = null;
        setFormat("strip");
        if (sequenceOwnerRef.current === owner) {
          sequenceOwnerRef.current = null;
        }

        const pendingSave = pendingSessionSaveRef.current;
        void sessionPersistenceRef.current.enqueue(async () => {
          const pendingSession = await pendingSave;
          const sessionId =
            activeSessionIdRef.current ?? pendingSession?.id ?? null;
          if (!sessionId) return;
          try {
            const photos = await canvasesToBlobs(updated);
            const cover =
              replacing === 0 ? await canvasToCoverBlob(updated[0]) : undefined;
            await updateSessionPhotos(sessionId, photos, cover);
            if (framesAreCurrent(updated)) {
              activeSessionIdRef.current = sessionId;
            }
          } catch {
            if (framesAreCurrent(updated)) {
              setNote("Photo replaced, but My Photos couldn't be updated.");
            }
          }
        });
        setPhase("review");
        await afterPaint();
        await releaseFreeze();
        stopActiveCamera();
      } catch {
        setFreezeFrame(null);
        failCamera("Couldn't retake that photo. Your original is still here.");
      }
      return;
    }

    try {
      const captured: HTMLCanvasElement[] = [];
      let releaseFinalFreeze: (() => Promise<void>) | null = null;
      setFrames([]);
      await wait(400);

      for (let shot = 0; shot < SHOTS; shot++) {
        const countdownSeconds =
          shot === 0 ? FIRST_SHOT_COUNTDOWN_SECONDS : delay;
        if (!(await runCountdown(countdownSeconds))) return;

        void tapHaptic("Medium"); // light native shutter feel; never awaited (timing-sensitive)
        const { frame, releaseFreeze } =
          await captureCameraFrameWithFreeze(video);
        if (sequenceCancelled()) {
          await releaseFreeze();
          return;
        }
        captured.push(frame);
        setFrames([...captured]);
        if (shot < SHOTS - 1) {
          await releaseFreeze();
          await wait(LIVE_PREVIEW_RECOVERY_MS);
        } else {
          releaseFinalFreeze = releaseFreeze;
          // React batches state updates in one async turn. Force the completed
          // fourth slot to paint, then decode Review's strip while the snapped
          // frame is still covering the camera.
          await afterPaint();
          if (stripPreviewRef.current) {
            await prepareImageForPaint(stripPreviewRef.current);
          }
          await wait(FINAL_CAPTURE_CONFIRMATION_MS);
        }
      }

      framesRef.current = captured;
      setFormat("strip");
      if (sequenceOwnerRef.current === owner) {
        sequenceOwnerRef.current = null;
      }

      // Register persistence before Review can launch a Retake One write.
      const pendingSave = sessionPersistenceRef.current.enqueue(
        async (): Promise<Session | null> => {
          try {
            const photos = await canvasesToBlobs(captured);
            const cover = await canvasToCoverBlob(captured[0]);
            return await saveSession(photos, cover);
          } catch {
            if (framesAreCurrent(captured)) {
              setNote(
                "Photos captured, but My Photos couldn't save this session.",
              );
            }
            return null;
          }
        },
      );
      pendingSessionSaveRef.current = pendingSave;
      void pendingSave.then((session) => {
        if (
          session &&
          pendingSessionSaveRef.current === pendingSave &&
          framesAreCurrent(captured)
        ) {
          activeSessionIdRef.current = session.id;
        }
      });
      setPhase("review");
      await afterPaint();
      await releaseFinalFreeze?.();
      stopActiveCamera();

      // Auto-save is best-effort and never blocks the review screen.
      void autoSaveToAlbum(captured, autosave, sessionRevision);
    } catch {
      if (sequenceCancelled()) return;
      setFreezeFrame(null);
      failCamera("Couldn't take that photo. Try again.");
    }
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
      const canvases = await loadSampleFrames(setNum, PHOTO_CAPTURE.high);
      clearResults();
      setFrames(canvases);
      activeSessionIdRef.current = null;
      pendingSessionSaveRef.current = null;
      setFormat("strip");
      setPhase("review");
    } catch {
      setError(`Add public/demo/set${setNum}-1.jpg … set${setNum}-4.jpg`);
    }
  }

  // Reopen a saved session in the review screen so the user can get the strip,
  // GIF, or video (and re-share) from any past shoot — not just the strip.
  async function openSession(session: Session) {
    const request = ++galleryOpenRequestRef.current;
    clearResults();
    setError(null);
    setNote(null);
    try {
      const canvases = await Promise.all(
        session.photos.map((blob) => blobToCanvas(blob)),
      );
      if (request !== galleryOpenRequestRef.current) return;
      resumeCameraAfterOverlayRef.current = undefined;
      setFrames(canvases);
      activeSessionIdRef.current = session.id;
      pendingSessionSaveRef.current = null;
      setFormat("strip");
      setShowGallery(false);
      setPhase("review");
    } catch {
      if (request === galleryOpenRequestRef.current) {
        setError(
          "Couldn't open that photo set. Its saved copy was not changed.",
        );
      }
    }
  }

  // Strip preview (re-rendered when frames / layout / theme change).
  const stripUrl = useMemo(() => {
    if (frames.length < SHOTS) return null;
    return composeStrip(frames, layout, THEMES[themeKey], {
      logo: brandLogo,
      cell: PREVIEW_CELL,
      branding,
      filter,
    }).toDataURL("image/png");
  }, [frames, layout, themeKey, brandLogo, branding, filter]);
  useLayoutEffect(() => {
    stripPreviewRef.current = stripUrl;
  }, [stripUrl]);

  const thumbs = useMemo(
    () => frames.map((frame) => thumbnailUrl(frame)),
    [frames],
  );

  // Switching format lazily generates the GIF / video the first time.
  async function selectFormat(f: Format) {
    if (f === "gif" && !runtimeFeatures.gif) return;
    if (f === "video" && !runtimeFeatures.video) return;
    setFormat(f);
    setError(null);
    setNote(null);
    if (generating === "gif" && f !== "gif") {
      gifJob.current.invalidate();
      generatingOwner.current = null;
      setGenerating(null);
    }
    if (generating === "video" && f !== "video") {
      videoJob.current.invalidate();
      generatingOwner.current = null;
      setGenerating(null);
    }
    if (f !== "gif" && socialPreparation === "preparing") {
      if (prewarmTimer.current !== null) {
        window.clearTimeout(prewarmTimer.current);
        prewarmTimer.current = null;
      }
      socialVideoJob.current.invalidate();
      setSocialPreparation("idle");
    }
    if (f === "gif" && !gifResult) await ensureGif();
    if (f === "video" && !videoResult) await ensureVideo();
  }

  async function ensureGif(choices: RenderChoices = currentChoices()) {
    const revision = renderRevision.current;
    const owner = beginGenerating("gif");
    try {
      await wait(30); // let the spinner paint before the (sync) encode
      const sourceFrames = framesRef.current;
      const blob = await getGifBlob(sourceFrames, choices, revision);
      if (revision !== renderRevision.current) return;
      setGifResult((r) => {
        if (r) return r;
        return {
          url: mediaUrl(blob),
          blob,
          filename: `boothbop-${stamp()}.gif`,
        };
      });
      if (isSocialVideoSupported()) {
        if (prewarmTimer.current !== null)
          window.clearTimeout(prewarmTimer.current);
        prewarmTimer.current = window.setTimeout(() => {
          prewarmTimer.current = null;
          void prepareSocialVideo(false, sourceFrames, choices, revision);
        }, 100);
      }
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return;
      if (revision === renderRevision.current)
        setError("Couldn't create the GIF.");
    } finally {
      if (revision === renderRevision.current) endGenerating(owner);
    }
  }

  async function ensureVideo(choices: RenderChoices = currentChoices()) {
    if (!isVideoSupported()) {
      setError("Video recording isn't supported in this browser.");
      return;
    }
    const revision = renderRevision.current;
    const owner = beginGenerating("video");
    try {
      const { blob, extension } = await getVideoResult(
        framesRef.current,
        choices,
        revision,
      );
      if (revision !== renderRevision.current) return;
      setVideoResult((r) =>
        r
          ? r
          : {
              url: mediaUrl(blob),
              blob,
              filename: `boothbop-${stamp()}.${extension}`,
            },
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (revision === renderRevision.current)
        setError(e instanceof Error ? e.message : "Couldn't record the video.");
    } finally {
      if (revision === renderRevision.current) endGenerating(owner);
    }
  }

  function changeFilter(next: FilterId) {
    storageSet("bb.filter", next);
    setFilter(next);
    clearResults();
    const choices = { ...currentChoices(), filter: next };
    if (format === "gif") void ensureGif(choices);
    if (format === "video") void ensureVideo(choices);
  }

  function changeBoom(on: boolean) {
    storageSet("bb.boom", on ? "1" : "0");
    setBoom(on);
    clearResults();
    if (format === "gif") void ensureGif({ ...currentChoices(), boom: on });
  }

  function changeBoomSpeed(speed: BoomSpeed) {
    saveBoomSpeed(speed);
    setBoomSpeed(speed);
    clearResults();
    if (format === "gif")
      void ensureGif({ ...currentChoices(), boomSpeed: speed });
  }

  function changeBranding(on: boolean) {
    saveBranding(on);
    setBranding(on);
    clearResults();
    const choices = { ...currentChoices(), branding: on };
    if (format === "gif") void ensureGif(choices);
    if (format === "video") void ensureVideo(choices);
  }

  function getStripBlob(
    src: HTMLCanvasElement[],
    selectedLayout: Layout,
    theme: StripTheme,
    choices: RenderChoices = currentChoices(),
    revision = renderRevision.current,
    owner?: symbol,
  ): Promise<Blob> {
    const extra = JSON.stringify([selectedLayout, theme]);
    return stripJob.current.get(
      renderKey("strip", choices, extra, revision),
      async (signal) => {
        signal.throwIfAborted();
        const blob = await stripBlob(src, selectedLayout, theme, {
          cell: stripCellForFrames(src, PHOTO_CAPTURE.high),
          branding: choices.branding,
          filter: choices.filter,
        });
        signal.throwIfAborted();
        return blob;
      },
      owner,
    );
  }

  function cachedStripBlob(
    selectedFrames = frames,
    selectedLayout = layout,
    selectedTheme = THEMES[themeKey],
    choices = currentChoices(),
    revision = renderRevision.current,
  ): Blob | undefined {
    const extra = JSON.stringify([selectedLayout, selectedTheme]);
    if (selectedFrames.length < SHOTS) return undefined;
    return stripJob.current.peek(renderKey("strip", choices, extra, revision));
  }

  // The blob for one auto-save task. Reuses the shared GIF/video cache so they
  // are never encoded twice (the review tabs draw from the same cache).
  async function renderForAutosave(
    src: HTMLCanvasElement[],
    task: AutosaveTask,
    theme: StripTheme,
    choices: RenderChoices,
    revision: number,
    owner: symbol,
  ): Promise<Blob> {
    if (task.layout)
      return getStripBlob(src, task.layout, theme, choices, revision, owner);
    if (task.format === "gif") return getGifBlob(src, choices, revision, owner);
    return (await getVideoResult(src, choices, revision, owner)).blob;
  }

  // Fire-and-forget after a capture: save the enabled formats to Photos. Best-
  // effort — never blocks or breaks the capture/review flow.
  async function autoSaveToAlbum(
    captured: HTMLCanvasElement[],
    settings: AutosaveSettings,
    revision: number,
  ) {
    if (!isNativeShell()) return;
    const theme = THEMES[themeKey];
    const choices = currentChoices();
    const tasks = planAutosaveTasks(settings, {
      gifSupported: runtimeFeatures.gif,
      videoSupported: runtimeFeatures.video,
    });
    if (!tasks.length) return;
    const owner = Symbol("photos-autosave");
    try {
      // Access was granted when the toggle was enabled; re-check WITHOUT
      // prompting because the user may have revoked it in iOS Settings.
      let status: PermissionResult;
      try {
        status = await ensurePhotosPermission(settings.dest, false);
      } catch {
        status = "denied";
      }
      if (!canSaveWithPermission(settings.dest, status)) return;

      // Theme, choices, frames, and revision are immutable snapshots. Review
      // edits may release their render ownership without cancelling this save.
      let savedAny = false;
      for (const task of tasks) {
        try {
          const blob = await renderForAutosave(
            captured,
            task,
            theme,
            choices,
            revision,
            owner,
          );
          if (await saveToPhotos(blob, task.kind, settings.dest))
            savedAny = true;
        } catch {
          /* per-task best-effort */
        }
      }
      if (savedAny && revision === renderRevision.current) {
        setNote(
          settings.dest === "album"
            ? "Saved to your BoothBop album"
            : "Saved to Photos",
        );
      }
    } finally {
      gifJob.current.invalidate(owner);
      videoJob.current.invalidate(owner);
      stripJob.current.invalidate(owner);
    }
  }

  // Resolve the blob + filename for whatever format is currently shown.
  async function currentMedia(): Promise<MediaResult | null> {
    if (format === "gif") return gifResult;
    if (format === "video") return videoResult;
    const blob = await getStripBlob(
      frames,
      layout,
      THEMES[themeKey],
      currentChoices(),
    );
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
      if (shareInFlight.current) return;
      shareInFlight.current = true;
      const owner = beginGenerating("share");
      try {
        await afterPaint();
        await nativeShareFile(blob, filename);
        void tapHaptic("Light");
      } catch (e) {
        const msg = (e as Error)?.message ?? "";
        if (/cancel/i.test(msg)) setNote("Share canceled.");
        else setError("Couldn't open the share sheet.");
      } finally {
        shareInFlight.current = false;
        endGenerating(owner);
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
    const action = shareAction(format, shareFilesOk, isSocialVideoSupported());
    if (action.kind === "socialVideo") {
      await shareSocialAnimation();
      return;
    }
    if (format === "strip" && !cachedStripBlob()) {
      const revision = renderRevision.current;
      const owner = beginGenerating("share");
      setError(null);
      setNote(null);
      try {
        await afterPaint();
        const media = await currentMedia();
        if (!media || revision !== renderRevision.current) return;
        if (!isNativeShell()) {
          setNote("Your high-quality photo is ready. Tap Share Photo again.");
          return;
        }
        await shareMedia(media.blob, media.filename);
        return;
      } catch (caught) {
        if ((caught as Error).name !== "AbortError")
          setError("Couldn't prepare the photo.");
        return;
      } finally {
        if (revision === renderRevision.current) endGenerating(owner);
      }
    }
    const media = await currentMedia();
    if (media) await shareMedia(media.blob, media.filename);
  }

  async function prepareSocialVideo(
    userInitiated: boolean,
    sourceFrames = framesRef.current,
    choices = currentChoices(),
    revision = renderRevision.current,
  ): Promise<MediaResult | null> {
    if (socialMediaRef.current) return socialMediaRef.current;
    setSocialPreparation("preparing");
    const owner = userInitiated ? beginGenerating("share") : null;
    if (userInitiated) {
      setError(null);
      setNote(null);
    }
    try {
      await afterPaint();
      const result = await getSocialVideoResult(
        sourceFrames,
        choices,
        revision,
      );
      if (revision !== renderRevision.current) return null;
      const media = {
        url: "",
        blob: new Blob([result.blob], { type: SOCIAL_VIDEO_MIME }),
        filename: `boothbop-animation-${stamp()}.mp4`,
      };
      socialMediaRef.current = media;
      setSocialVideoResult(media);
      setSocialPreparation("ready");
      return media;
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return null;
      if (revision === renderRevision.current) {
        setSocialPreparation("error");
        if (userInitiated) {
          setError(
            "Couldn't prepare a social video. You can still share the original GIF.",
          );
        }
      }
      return null;
    } finally {
      if (owner && revision === renderRevision.current) endGenerating(owner);
    }
  }

  async function shareSocialAnimation() {
    if (!socialVideoResult && !isNativeShell()) {
      void prepareSocialVideo(true);
      setNote("Finishing your high-quality share. Tap Share when it's ready.");
      return;
    }
    const media = socialVideoResult ?? (await prepareSocialVideo(true));
    if (media) await shareMedia(media.blob, media.filename);
  }

  async function shareOriginalGif() {
    if (gifResult) await shareMedia(gifResult.blob, gifResult.filename);
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
  const primaryShare = shareAction(
    format,
    shareFilesOk,
    isSocialVideoSupported(),
  );

  return (
    <div
      className={`mx-auto flex h-full max-w-md flex-col px-4 text-text ${
        nativePreviewVisible ? "bg-transparent" : "bg-app-canvas"
      }`}
    >
      <TopBar
        onHome={isNativeShell() ? undefined : cancelToHome}
        onCamera={() => void openCamera()}
        onAlbum={openGalleryFromTopBar}
        onSettings={openSettingsFromTopBar}
        showActions={phase !== "capturing" && !showMigration}
        showCamera={phase !== "preview" && phase !== "capturing"}
      />

      {phase === "idle" &&
        (showMigration ? (
          <MigrationScreen onContinue={dismissMigration} />
        ) : (
          <IdleScreen
            onStart={() => void openCamera()}
            openingCamera={openingCamera}
            installPrompt={installPrompt}
            error={error}
            releaseAnnouncement={releaseAnnouncement}
            onDismissReleaseAnnouncement={() => {
              dismissReleaseAnnouncement();
              setReleaseAnnouncement(null);
            }}
          />
        ))}

      {(phase === "preview" || phase === "capturing") && (
        <CameraScreen
          videoRef={videoRef}
          phase={phase}
          countdown={countdown}
          freezeFrame={freezeFrame}
          thumbs={thumbs}
          delay={delay}
          setDelay={setDelay}
          onStart={runSequence}
          onCancel={cancelCamera}
          retakeIndex={retakeIndex}
          nativePreview={nativePreviewVisible}
          nativeShell={isNativeShell()}
          cameraError={error}
          onRetry={() => void openCamera()}
        />
      )}

      {phase === "review" && (
        <ReviewScreen
          format={format}
          onSelectFormat={selectFormat}
          previewUrl={previewUrl}
          generating={generating}
          socialPreparation={socialPreparation}
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
          shareLabel={primaryShare.label}
          onShareOriginalGif={shareOriginalGif}
          onDownload={downloadCurrent}
          onRetake={retake}
          filter={filter}
          onFilter={changeFilter}
          boom={boom}
          onBoom={changeBoom}
          boomSpeed={boomSpeed}
          onBoomSpeed={changeBoomSpeed}
          thumbs={thumbs}
          onRetakeOne={(index) => void openCamera(index)}
          features={runtimeFeatures}
        />
      )}

      {showGallery && (
        <GalleryScreen
          onCamera={openCameraFromGallery}
          onClose={() => {
            galleryOpenRequestRef.current += 1;
            setShowGallery(false);
            resumeCameraAfterOverlay();
          }}
          onOpen={openSession}
        />
      )}

      {showSettings && (
        <SettingsScreen
          settings={autosave}
          native={isNativeShell()}
          videoSupported={runtimeFeatures.video}
          error={autosaveError}
          onDest={changeAutosaveDest}
          onToggle={toggleAutosaveFormat}
          onOpenIosSettings={() => void openIosSettings()}
          onClose={() => {
            setShowSettings(false);
            resumeCameraAfterOverlay();
          }}
          branding={branding}
          onBranding={changeBranding}
          features={runtimeFeatures}
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
