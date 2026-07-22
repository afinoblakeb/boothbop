import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("ios/App/App/AppDelegate.swift", "utf8");
const cameraSource = source
  .split("// MARK: - BoothBopCamera")[1]
  .split("// MARK: - BoothBopVideo")[0];

describe("native camera source contract", () => {
  it("prepares full-quality photo resources before reporting the camera ready", () => {
    expect(source).toContain("setPreparedPhotoSettingsArray");
    expect(source).toContain("photoPreparationComplete");
    expect(source).toContain("finishStartIfReady");
    expect(source).toContain("isResponsiveCaptureEnabled = true");
    expect(source).not.toContain("isFastCapturePrioritizationEnabled = true");
  });

  it("renders face tracking as a temporary, re-armable confidence cue", () => {
    expect(source).toContain("let cueDuration: CFTimeInterval = 1.2");
    expect(source).toContain("let redetectionDelay: CFTimeInterval = 0.45");
    expect(source).toContain(".insetBy(dx: 8, dy: 8)");
    expect(source).toContain(".withAlphaComponent(0.5).cgColor");
  });

  it("moves a ready-to-use square through a temporary file instead of base64", () => {
    expect(cameraSource).toContain("renderSquareJPEG");
    expect(cameraSource).toContain("FileManager.default.temporaryDirectory");
    expect(cameraSource).toContain('"path": photo.fileURL.absoluteString');
    expect(cameraSource).not.toContain("base64EncodedString()");
  });

  it("keeps JPEG scaling and file work off capture lifecycle queues", () => {
    expect(cameraSource).toContain("photoProcessingQueue.async");
    expect(cameraSource).toContain("finishCaptureIfReady");
    expect(cameraSource).toContain("captureCompletionReceived");

    const processingDelegate = cameraSource
      .split("didFinishProcessingPhoto photo: AVCapturePhoto")[1]
      .split("didFinishCaptureFor resolvedSettings")[0];
    const sessionWork = processingDelegate.split(
      "photoProcessingQueue.async",
    )[0];
    expect(sessionWork).not.toContain("renderSquareJPEG");
    expect(sessionWork).not.toContain("writeTemporaryPhoto");

    const firstFrameDelegate = cameraSource
      .split("didOutput sampleBuffer: CMSampleBuffer")[1]
      .split("public func metadataOutput")[0];
    expect(firstFrameDelegate).toContain("photoProcessingQueue.async");
  });

  it("commits camera topology and starts running before asynchronous prewarming", () => {
    const makeSession = cameraSource
      .split("private func makeSession() throws")[1]
      .split("private func frontCamera()")[0];
    expect(makeSession.indexOf("commitConfiguration()")).toBeGreaterThan(
      makeSession.indexOf("beginConfiguration()"),
    );
    expect(makeSession.indexOf("commitConfiguration()")).toBeLessThan(
      makeSession.indexOf("return ("),
    );

    const startFlow = cameraSource
      .split("private func configureAndStart(id: UUID)")[1]
      .split("private func makePhotoSettings(")[0];
    expect(startFlow.indexOf("startRunning()")).toBeLessThan(
      startFlow.indexOf("setPreparedPhotoSettingsArray"),
    );
  });

  it("rejects false preview readiness and watches for lost native captures", () => {
    expect(cameraSource).toContain(
      "The native camera preview could not be installed",
    );
    expect(cameraSource).toContain("captureTimedOut");
    expect(cameraSource).toContain("self.videoOutput === output");
  });

  it("reports iOS capture interruptions and runtime errors to the app", () => {
    expect(cameraSource).toContain(
      "AVCaptureSession.wasInterruptedNotification",
    );
    expect(cameraSource).toContain("AVCaptureSession.runtimeErrorNotification");
    expect(cameraSource).toContain('notifyListeners("stateChanged"');
  });
});
