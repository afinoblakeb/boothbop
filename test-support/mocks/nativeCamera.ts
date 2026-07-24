import { expect, type Page } from "@playwright/test";

type PreviewCallStatus = "pending" | "resolved" | "rejected";

export interface NativeCameraMockSnapshot {
  running: boolean;
  previewVisible: boolean;
  starts: number;
  stops: number;
  pendingStarts: number;
  previewCalls: Array<{ id: number; status: PreviewCallStatus }>;
}

interface NativeCameraMockControl {
  snapshot(): NativeCameraMockSnapshot;
  resolvePreview(id: number): void;
  rejectPreview(id: number): void;
  resolveStart(): void;
}

declare global {
  interface Window {
    __nativeCameraMock?: NativeCameraMockControl;
  }
}

export async function installNativeCameraMock(
  page: Page,
  options: { deferStart?: boolean } = {},
): Promise<void> {
  await page.addInitScript(({ deferStart }) => {
    type PreviewCall = {
      id: number;
      status: PreviewCallStatus;
      resolve: (value: { visible: boolean }) => void;
      reject: (reason: Error) => void;
    };

    const camera = {
      running: false,
      previewVisible: false,
      starts: 0,
      stops: 0,
      pendingStartResolvers: [] as Array<() => void>,
      nextPreviewId: 1,
      previewCalls: [] as PreviewCall[],
    };

    const findPendingPreview = (id: number) => {
      const call = camera.previewCalls.find((candidate) => candidate.id === id);
      if (!call) throw new Error(`Unknown native preview call ${id}`);
      if (call.status !== "pending") {
        throw new Error(`Native preview call ${id} is already ${call.status}`);
      }
      return call;
    };

    window.__nativeCameraMock = {
      snapshot: () => ({
        running: camera.running,
        previewVisible: camera.previewVisible,
        starts: camera.starts,
        stops: camera.stops,
        pendingStarts: camera.pendingStartResolvers.length,
        previewCalls: camera.previewCalls.map(({ id, status }) => ({
          id,
          status,
        })),
      }),
      resolvePreview: (id) => {
        const call = findPendingPreview(id);
        call.status = "resolved";
        camera.previewVisible = true;
        call.resolve({ visible: true });
      },
      rejectPreview: (id) => {
        const call = findPendingPreview(id);
        call.status = "rejected";
        call.reject(new Error(`Native preview call ${id} failed after churn`));
      },
      resolveStart: () => {
        const resolve = camera.pendingStartResolvers.shift();
        if (!resolve) throw new Error("No pending native camera start");
        resolve();
      },
    };

    Object.defineProperty(window, "webkit", {
      configurable: true,
      value: { messageHandlers: { bridge: {} } },
    });
    window.Capacitor = {
      PluginHeaders: [
        {
          name: "BoothBopCamera",
          methods: [
            ...[
              "isAvailable",
              "bopFXCapabilities",
              "setBopFX",
              "start",
              "setPreviewFrame",
              "capture",
              "finishShutterFreeze",
              "release",
              "stop",
              "removeListener",
            ].map((name) => ({ name, rtype: "promise" })),
            { name: "addListener", rtype: "callback" },
          ],
        },
      ],
      nativeCallback: async (
        pluginName: string,
        methodName: string,
        _options: Record<string, unknown>,
        _callback: (result: Record<string, unknown>) => void,
      ) => {
        if (pluginName !== "BoothBopCamera" || methodName !== "addListener") {
          throw new Error(
            `Unexpected native callback: ${pluginName}.${methodName}`,
          );
        }
        return "camera-state-listener";
      },
      nativePromise: async (
        pluginName: string,
        methodName: string,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown>> => {
        if (pluginName !== "BoothBopCamera") {
          throw new Error(`Unexpected native plugin: ${pluginName}`);
        }
        if (methodName === "isAvailable") return { available: true };
        if (methodName === "bopFXCapabilities") {
          return {
            nativePreview: true,
            faceLandmarks: true,
            personSegmentation: true,
            metalRendering: true,
            arFaceTracking: true,
            maximumTrackedFaces: 3,
            trueDepthCamera: true,
            depthStream: true,
            effects: [
              "original",
              "spectralEcho",
              "funhouse",
              "cutoutChorus",
              "mirrorBloom",
            ],
          };
        }
        if (methodName === "setBopFX") {
          return { effect: options.effect ?? "original" };
        }
        if (methodName === "start") {
          camera.starts += 1;
          if (deferStart) {
            await new Promise<void>((resolve) => {
              camera.pendingStartResolvers.push(resolve);
            });
          }
          camera.running = true;
          return { width: 1920, height: 1080 };
        }
        if (methodName === "stop") {
          camera.stops += 1;
          camera.running = false;
          camera.previewVisible = false;
          return { stopped: true };
        }
        if (methodName === "setPreviewFrame") {
          if (!camera.running) throw new Error("Camera is not running");
          const id = camera.nextPreviewId++;
          return new Promise((resolve, reject) => {
            camera.previewCalls.push({
              id,
              status: "pending",
              resolve,
              reject,
            });
          });
        }
        if (methodName === "capture") {
          throw new Error("Native capture is unavailable in this mock");
        }
        if (methodName === "finishShutterFreeze") {
          return { finished: true };
        }
        if (methodName === "removeListener") return { removed: true };
        if (methodName === "release") return { released: true };
        throw new Error(`Unexpected camera method: ${methodName}`);
      },
    } as typeof window.Capacitor;

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException(
          "Native camera owns the device",
          "NotReadableError",
        );
      },
    });
  }, options);
}

export async function nativeCameraSnapshot(
  page: Page,
): Promise<NativeCameraMockSnapshot> {
  return page.evaluate(() => {
    if (!window.__nativeCameraMock) {
      throw new Error("Native camera mock is not installed");
    }
    return window.__nativeCameraMock.snapshot();
  });
}

export async function waitForNativeCamera(
  page: Page,
  expected: Partial<NativeCameraMockSnapshot>,
): Promise<void> {
  await expect.poll(() => nativeCameraSnapshot(page)).toMatchObject(expected);
}

export async function settleNativePreview(
  page: Page,
  id: number,
  outcome: "resolve" | "reject",
): Promise<void> {
  await page.evaluate(
    ({ id, outcome }) => {
      const control = window.__nativeCameraMock;
      if (!control) throw new Error("Native camera mock is not installed");
      if (outcome === "resolve") control.resolvePreview(id);
      else control.rejectPreview(id);
    },
    { id, outcome },
  );
}

export async function resolveNativeStart(page: Page): Promise<void> {
  await page.evaluate(() => {
    const control = window.__nativeCameraMock;
    if (!control) throw new Error("Native camera mock is not installed");
    control.resolveStart();
  });
}

export async function requestNativePreviewUpdate(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
}

export async function setDocumentVisibility(
  page: Page,
  visibilityState: "hidden" | "visible",
): Promise<void> {
  await page.evaluate((state) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, visibilityState);
}
