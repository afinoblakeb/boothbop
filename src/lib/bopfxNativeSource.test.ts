import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("ios/App/App/BopFXRenderer.swift", "utf8");
const pickerSource = readFileSync("ios/App/App/BopFXLabPicker.swift", "utf8");
const tuningFrameSource = readFileSync(
  "ios/App/App/BopFXTuningFrameView.swift",
  "utf8",
);
const fixtureSource = readFileSync(
  "ios/App/App/BopFXFixtureViewController.swift",
  "utf8",
);
const videoWriterSource = readFileSync(
  "ios/App/App/BopFXLabVideoWriter.swift",
  "utf8",
);
const livingCaptureSource = readFileSync(
  "ios/App/App/BopFXLivingCaptureBuffer.swift",
  "utf8",
);
const livingWriterSource = readFileSync(
  "ios/App/App/BopFXLivingStripWriter.swift",
  "utf8",
);
const livingSelectorSource = readFileSync(
  "ios/CameraCore/Sources/CameraCore/LivingFrameWindowSelector.swift",
  "utf8",
);
const livingRecorderSource = readFileSync(
  "ios/CameraCore/Sources/CameraCore/LivingCaptureTimelineRecorder.swift",
  "utf8",
);
const livingPlaybackSource = readFileSync(
  "ios/CameraCore/Sources/CameraCore/LivingStripPlaybackPlan.swift",
  "utf8",
);
const fixtureScriptSource = readFileSync(
  "scripts/ios-bopfx-fixture.mjs",
  "utf8",
);
const cameraSource = readFileSync("ios/App/App/AppDelegate.swift", "utf8");

describe("native BopFX renderer source contract", () => {
  it("keeps native and TypeScript effect identifiers aligned", () => {
    for (const id of [
      "original",
      "spectralEcho",
      "funhouse",
      "cutoutChorus",
      "mirrorBloom",
      "spinCycle",
    ]) {
      expect(source).toContain(`case ${id}`);
    }
  });

  it("uses Vision for geometry and segmentation without identity analysis", () => {
    expect(source).toContain("VNDetectFaceLandmarksRequest");
    expect(source).toContain("VNGeneratePersonSegmentationRequest");
    expect(source).not.toMatch(/recogniz|identity|embedding/i);
  });

  it("reports enhanced capabilities from runtime APIs", () => {
    expect(source).toContain("import ARKit");
    expect(source).toContain("ARFaceTrackingConfiguration.isSupported");
    expect(source).toContain(
      "ARFaceTrackingConfiguration.supportedNumberOfTrackedFaces",
    );
    expect(source).toContain(".builtInTrueDepthCamera");
    expect(source).toContain("supportedDepthDataFormats");
    for (const key of [
      "arFaceTracking",
      "maximumTrackedFaces",
      "trueDepthCamera",
      "depthStream",
    ]) {
      expect(source).toContain(`"${key}"`);
    }
  });

  it("uses a Metal-backed Core Image context for rendering", () => {
    expect(source).toContain("MTLCreateSystemDefaultDevice()");
    expect(source).toContain("CIContext(mtlDevice:");
    expect(source).toContain("MTKView");
  });

  it("bounds analysis separately from frame rendering", () => {
    expect(source).toContain("analysisQueue");
    expect(source).toContain("analysisInFlight");
    expect(source).toContain("analysisGeneration");
    expect(source).toContain("minimumAnalysisInterval");
    const setEffect = source
      .split("func setEffect(_ effect: BopFXEffect)")[1]
      .split("func consume(_ pixelBuffer: CVPixelBuffer)")[0];
    expect(setEffect).toContain("analysisGeneration &+= 1");
    expect(setEffect).not.toContain("analysisInFlight = false");
    expect(source).toContain("self.analysisGeneration == generation");
    expect(cameraSource).toContain("alwaysDiscardsLateVideoFrames = true");
  });

  it("supports full-resolution still rendering independently of preview", () => {
    expect(source).toContain("renderStillImage");
    expect(source).toContain("renderAnimationFrames");
    expect(source).toContain("quality: .accurate");
    expect(source).toContain("autoreleasepool");
  });

  it("uses stable fallbacks and edge-safe spatial transforms", () => {
    const spectral = source
      .split("private func spectralEcho")[1]
      .split("private func funhouse")[0];
    const cutout = source
      .split("private func cutoutChorus")[1]
      .split("private func mirrorBloom")[0];
    const funhouse = source
      .split("private func funhouse")[1]
      .split("private func cutoutChorus")[0];
    expect(spectral).toMatch(
      /guard !analysis\.faces\.isEmpty else \{\s*return image\s*\}/,
    );
    expect(cutout).toMatch(
      /guard let pixelBuffer = analysis\.personMask else \{\s*return image\s*\}/,
    );
    expect(source).toContain("image.clampedToExtent()");
    expect(source).toContain('"CISixfoldReflectedTile"');
    expect(source).toContain("private func spinCycle");
    expect(source).toContain("for index in 0..<4");
    expect(source).toContain("CGAffineTransform(rotationAngle:");
    const spin = source
      .split("private func spinCycle")[1]
      .split("private func applying")[0];
    expect(spin).not.toContain("analysis.faces");
    expect(spin).not.toContain("sourceCenter");
    expect(spin).toContain("center: CGPoint(x: extent.midX, y: extent.midY)");
    expect(funhouse).toContain("softRoundedMask");
    expect(funhouse).toContain("blend(");
    expect(funhouse).toContain("dx: -faceRect.width * 0.34");
    expect(funhouse).toContain("dy: -faceRect.height * 0.3");
    expect(source).toContain('"CIRoundedRectangleGenerator"');
  });

  it("applies one bounded tuning contract before every native effect", () => {
    expect(source).toContain("struct BopFXTuning: Equatable");
    expect(source).toContain("static let neutral = BopFXTuning");
    expect(source).toContain("private func applyTuning");
    expect(source).toContain('"CIHueAdjust"');
    expect(source).toContain('"CIColorControls"');
    expect(source).toContain('"CITemperatureAndTint"');
    expect(source).toMatch(
      /let tuned = applyTuning\(\s*image,\s*tuning: tuning\)/,
    );
    expect(source).toContain("func setTuning(_ tuning: BopFXTuning)");
    expect(source).toContain("tuning: BopFXTuning");
  });

  it("provides a native edge-driven tuning frame with a neutral reset", () => {
    expect(tuningFrameSource).toContain("final class BopFXTuningFrameView");
    expect(tuningFrameSource).toContain("var onChange:");
    expect(tuningFrameSource).toContain('"Hue"');
    expect(tuningFrameSource).toContain('"Saturation"');
    expect(tuningFrameSource).toContain('"Warmth"');
    expect(tuningFrameSource).toContain("UIImpactFeedbackGenerator");
    expect(tuningFrameSource).toContain("numberOfTapsRequired = 2");
    expect(tuningFrameSource).toContain(".neutral");
    expect(cameraSource).toContain("BopFXTuningFrameView(");
    expect(cameraSource).toContain("tuningFrame.onChange");
  });

  it("connects the effect view to the existing serialized camera session", () => {
    const camera = cameraSource
      .split("// MARK: - BoothBopCamera")[1]
      .split("// MARK: - BoothBopVideo")[0];
    expect(camera).toContain('CAPPluginMethod(name: "bopFXCapabilities"');
    expect(camera).toContain('CAPPluginMethod(name: "setBopFX"');
    expect(camera).toContain("private var activeBopFX = BopFXEffect.original");
    expect(camera).toContain("sampleBopFXPreviewView?.consume(pixelBuffer)");
    expect(camera).toMatch(
      /BopFXPreviewView\(\s*bopFXFrame: nativePreview\.bounds\)/,
    );
    expect(camera).toContain("bopFXPreviewView?.removeFromSuperview()");
  });

  it("provides a debug-only native picker without React ownership", () => {
    expect(pickerSource).toContain("final class BopFXLabPicker");
    expect(pickerSource).toContain("var onSelect:");
    expect(pickerSource).toContain("var onSelectSequence:");
    expect(pickerSource).toContain('"Sequence"');
    expect(pickerSource).toContain("UIAccessibility.post");
    expect(cameraSource).toContain("#if DEBUG");
    expect(cameraSource).toContain("BopFXLabPicker(");
    expect(cameraSource).toContain("picker.onSelect");
    expect(cameraSource).toContain("picker.onSelectSequence");
    expect(cameraSource).toContain("previewHost.addSubview(picker)");
    expect(cameraSource).not.toContain("nativePreview.addSubview(picker)");
    expect(cameraSource).toContain("bopFXLabPicker?.removeFromSuperview()");
  });

  it("advances the four-effect lab sequence only after confirmed captures", () => {
    expect(cameraSource).toContain("bopFXSequenceOrder");
    expect(cameraSource).toMatch(
      /bopFXSequenceOrder[\s\S]*\.spectralEcho,[\s\S]*\.funhouse,[\s\S]*\.cutoutChorus,[\s\S]*\.spinCycle,/,
    );
    expect(cameraSource).toContain("pendingCaptureBopFX = self.activeBopFX");
    expect(cameraSource).toContain("advanceBopFXLabSequence()");
    const finishCapture = cameraSource
      .split("private func finishCaptureIfReady()")[1]
      .split("private func failStart")[0];
    expect(finishCapture).toContain("advanceBopFXLabSequence()");
    const failCapture = cameraSource
      .split("private func failCapture")[1]
      .split("private func tearDownSession")[0];
    expect(failCapture).not.toContain("advanceBopFXLabSequence()");
  });

  it("renders the selected native effect into the captured square", () => {
    const squareRenderer = cameraSource
      .split("private func renderSquareJPEG")[1]
      .split("private func writeTemporaryPhoto")[0];
    expect(squareRenderer).toContain("effect: BopFXEffect");
    expect(squareRenderer).toContain("tuning: BopFXTuning");
    expect(squareRenderer).toContain("renderStillImage");
    expect(cameraSource).toContain("effect: captureEffect");
    expect(cameraSource).toContain("tuning: captureTuning");
  });

  it("freezes the tuned effect without delaying the hardware shutter", () => {
    const capture = cameraSource
      .split("@objc func capture(_ call: CAPPluginCall)")[1]
      .split("@objc func release")[0];
    expect(capture).toContain("self.latestPreviewPixelBuffer");
    expect(capture).toContain("pendingCaptureBopFXPhase");
    expect(capture).toContain("output.capturePhoto(with: settings");
    expect(capture).toContain("freezeCurrentFrame()");
    expect(capture).toContain("beginShutterFreeze(");
    expect(capture).toContain("renderRawShutterFreeze(");
    expect(capture.indexOf("output.capturePhoto(with: settings")).toBeLessThan(
      capture.indexOf("freezeCurrentFrame()"),
    );
    expect(capture.indexOf("output.capturePhoto(with: settings")).toBeLessThan(
      capture.indexOf("beginShutterFreeze("),
    );
    expect(source).toContain("func freezeCurrentFrame()");
    expect(source).toContain("func resumeAfterFreeze()");
    expect(source).toContain("guard !displayFrozen else {");
    expect(source).toContain("inFlightCommandBuffer");
    expect(source).toContain("addCompletedHandler");
    expect(source).toContain("waitUntilCompleted()");
    const draw = source
      .split("override func draw(_ rect: CGRect)")[1]
      .split("func freezeCurrentFrame()")[0];
    expect(draw.indexOf("currentDrawable")).toBeLessThan(
      draw.indexOf("lastRenderedPhase = phase"),
    );
    expect(cameraSource).toContain("shutterFreezeUsesEffectSurface");
    expect(cameraSource).toContain("bopFXPreviewView?.resumeAfterFreeze()");
    expect(cameraSource).not.toContain("rendered ?? fallbackImage");
    expect(cameraSource).toContain("showShutterFreeze(");
    expect(cameraSource).toContain("generation:");
  });

  it("can render deterministic native comparison fixtures", () => {
    expect(cameraSource).toContain('--bopfx-fixture"');
    expect(cameraSource).toContain("BopFXFixtureViewController()");
    expect(fixtureSource).toContain("BopFXRenderer()");
    expect(fixtureSource).toContain("renderStillResult");
    expect(fixtureSource).toContain("BopFXEffect.allCases");
    expect(fixtureSource).toContain("pngData()");
    expect(fixtureSource).toContain("BopFXLab");
    expect(fixtureSource).toContain("BopFXNativeSupport.payload");
    expect(fixtureSource).toContain('"capabilities.json"');
    expect(fixtureSource).toContain('"coldDurationMs"');
    expect(fixtureSource).toContain('"warmDurationMs"');
    expect(fixtureSource).toContain("BopFXLabVideoWriter.write");
    expect(videoWriterSource).toContain("AVAssetWriter");
    expect(videoWriterSource).toContain("renderAnimationFrames");
    expect(videoWriterSource).toContain(".mp4");
    expect(videoWriterSource).toContain("frameCount = 60");
    expect(videoWriterSource).not.toContain("context.translateBy");
    expect(videoWriterSource).not.toContain("context.scaleBy");
  });

  it("bounds a native half-second living-shot window around the shutter", () => {
    expect(livingCaptureSource).toContain("BopFXLivingCaptureBuffer");
    expect(livingCaptureSource).toContain("BopFXLivingCaptureUpdate");
    expect(livingCaptureSource).toContain("case collecting");
    expect(livingCaptureSource).toContain("case completed(BopFXLivingShot)");
    expect(livingCaptureSource).toContain("case failed(");
    expect(livingCaptureSource).toContain("playbackDescriptor");
    expect(livingCaptureSource).toContain("LivingStripClipDescriptor");
    expect(livingCaptureSource).toContain(
      "CMSampleBufferGetPresentationTimeStamp",
    );
    expect(livingCaptureSource).toContain("CVPixelBuffer");
    expect(livingCaptureSource).toContain("LivingCaptureTimelineRecorder");
    expect(livingCaptureSource).toContain("func startSession(");
    expect(livingCaptureSource).toContain("func armShot(");
    expect(livingCaptureSource).toContain("func resolveShutter(");
    expect(livingCaptureSource).toContain("func cancelSession(");
    expect(livingCaptureSource).toContain("retainedFrameIDs");
    expect(livingCaptureSource).toContain("LivingCaptureRecorderFailure");
    expect(livingCaptureSource).not.toContain("DispatchQueue.main");
  });

  it("renders a portable living-strip fixture without replacing still masters", () => {
    expect(livingWriterSource).toContain("BopFXLivingStripWriter");
    expect(livingWriterSource).toContain("BopFXLivingClip");
    expect(livingWriterSource).toContain("clips: [BopFXLivingClip]");
    expect(livingWriterSource).toContain("clips.map(\\.descriptor)");
    expect(livingWriterSource).toContain("LivingStripPlaybackPlan");
    expect(livingWriterSource).toContain("AVAssetWriter");
    expect(livingWriterSource).toContain("living-strip.mp4");
    expect(livingWriterSource).toContain("BopFXRenderer");
    expect(livingWriterSource).toContain("2.5 / 7.0");
    expect(livingWriterSource).toContain("frameRate: Int32 = 30");
    expect(livingWriterSource).toContain("plan.outputFrameCount");
    expect(fixtureSource).toContain("BopFXLivingStripWriter.write");
    expect(fixtureSource).toContain('"livingStripRecording"');
  });

  it("uses a native exact-timestamp selector with generation-scoped state", () => {
    expect(livingSelectorSource).toContain("LivingFrameWindowSelector");
    expect(livingSelectorSource).toContain("targetFrameRate: Double = 30");
    expect(livingSelectorSource).toContain("minimumUniqueFrames: Int = 8");
    expect(livingSelectorSource).toContain("monotonicSegments");
    expect(livingRecorderSource).toContain("LivingCaptureTimelineRecorder");
    expect(livingRecorderSource).toContain("resolveShutter");
    expect(livingRecorderSource).toContain("generation: UInt64");
    expect(livingRecorderSource).toContain("maximumFrames: Int = 30");
    expect(livingRecorderSource).toContain("lastAcceptedBucket");
    expect(livingRecorderSource).toContain("frameBucket(");
    expect(livingRecorderSource).toContain("clockDiscontinuity");
    expect(livingPlaybackSource).toContain("LivingStripPlaybackPlan");
    expect(livingPlaybackSource).toContain("LivingStripClipDescriptor");
    expect(livingPlaybackSource).toContain("sourceFrameIndex(");
    expect(livingPlaybackSource).toContain("clips.count == 4");
    expect(livingPlaybackSource).toContain("mixedGenerations");
    expect(livingPlaybackSource).toContain("duplicateCaptureID");
    expect(livingPlaybackSource).toContain("invalidCaptureOrder");
    expect(fixtureScriptSource).toContain('"swift-format"');
    expect(fixtureScriptSource).toContain('"--strict"');
    expect(fixtureScriptSource).toContain('"swift"');
    expect(fixtureScriptSource).toContain('"test"');
    expect(fixtureScriptSource).toContain('"CameraCore"');
  });
});
