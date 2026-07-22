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
