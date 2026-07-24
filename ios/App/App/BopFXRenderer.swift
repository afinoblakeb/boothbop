import UIKit
import AVFoundation
import ARKit
import CoreML
import CoreImage
import MetalKit
import Vision

enum BopFXEffect: String, CaseIterable {
    case original
    case spectralEcho
    case funhouse
    case cutoutChorus
    case mirrorBloom
}

struct BopFXTuning: Equatable {
    static let neutral = BopFXTuning(
        hue: 0,
        saturation: 0,
        warmth: 0)

    let hue: CGFloat
    let saturation: CGFloat
    let warmth: CGFloat

    init(
        hue: CGFloat,
        saturation: CGFloat,
        warmth: CGFloat
    ) {
        self.hue = min(1, max(-1, hue))
        self.saturation = min(1, max(-1, saturation))
        self.warmth = min(1, max(-1, warmth))
    }

    var isNeutral: Bool {
        return abs(hue) < 0.001 &&
            abs(saturation) < 0.001 &&
            abs(warmth) < 0.001
    }
}

enum BopFXNativeSupport {
    static var metalRendering: Bool {
        return MTLCreateSystemDefaultDevice() != nil
    }

    static var supportedEffects: [BopFXEffect] {
        guard metalRendering else { return [.original] }
        return BopFXEffect.allCases
    }

    static var payload: [String: Any] {
        let arFaceTracking = ARFaceTrackingConfiguration.isSupported
        let trueDepthDevice = AVCaptureDevice.default(
            .builtInTrueDepthCamera,
            for: .video,
            position: .front)
        let depthStream = trueDepthDevice?.formats.contains {
            !$0.supportedDepthDataFormats.isEmpty
        } ?? false
        let personSegmentation: Bool
        if #available(iOS 18.0, *) {
            personSegmentation =
                (try? VNGeneratePersonSegmentationRequest()
                    .supportedOutputPixelFormats())?.isEmpty == false
        } else {
            // The request itself is available from iOS 15; older SDKs expose
            // no capability-query API, so render-time failure remains the
            // authoritative fallback.
            personSegmentation = true
        }
        return [
            "nativePreview": metalRendering,
            "faceLandmarks": true,
            "personSegmentation": personSegmentation,
            "metalRendering": metalRendering,
            "arFaceTracking": arFaceTracking,
            "maximumTrackedFaces": arFaceTracking
                ? ARFaceTrackingConfiguration.supportedNumberOfTrackedFaces
                : 0,
            "trueDepthCamera": trueDepthDevice != nil,
            "depthStream": depthStream,
            "effects": supportedEffects.map(\.rawValue),
        ]
    }
}

private enum BopFXAnalysisQuality {
    case balanced
    case accurate
}

private struct BopFXFace {
    let bounds: CGRect
    let leftEye: CGPoint?
    let rightEye: CGPoint?
    let mouth: CGPoint?
}

private struct BopFXAnalysis {
    let faces: [BopFXFace]
    let personMask: CVPixelBuffer?
    let errorMessage: String?

    static let empty = BopFXAnalysis(
        faces: [],
        personMask: nil,
        errorMessage: nil)
}

struct BopFXStillRender {
    let image: UIImage
    let faceCount: Int
    let personMaskAvailable: Bool
    let analysisError: String?
    let durationMilliseconds: Int
}

private final class BopFXAnalyzer {
    func analyze(
        _ image: CIImage,
        effect: BopFXEffect,
        quality: BopFXAnalysisQuality
    ) -> BopFXAnalysis {
        guard effect != .original else { return .empty }

        let faceRequest = VNDetectFaceLandmarksRequest()
        let needsFaces = effect != .cutoutChorus
        let personRequest: VNGeneratePersonSegmentationRequest? =
            effect == .cutoutChorus ? VNGeneratePersonSegmentationRequest() : nil
        configureSimulatorComputeDevice(faceRequest)
        if let personRequest {
            configureSimulatorComputeDevice(personRequest)
            personRequest.qualityLevel =
                quality == .accurate ? .accurate : .balanced
            personRequest.outputPixelFormat =
                kCVPixelFormatType_OneComponent8
        }

        var requests: [VNRequest] = []
        if needsFaces {
            requests.append(faceRequest)
        }
        if let personRequest {
            requests.append(personRequest)
        }

        do {
            let handler = VNImageRequestHandler(ciImage: image, orientation: .up)
            try handler.perform(requests)
        } catch {
            return BopFXAnalysis(
                faces: [],
                personMask: nil,
                errorMessage: error.localizedDescription)
        }

        let faces = (faceRequest.results ?? []).map { observation in
            BopFXFace(
                bounds: observation.boundingBox,
                leftEye: self.center(
                    observation.landmarks?.leftEye,
                    inside: observation.boundingBox),
                rightEye: self.center(
                    observation.landmarks?.rightEye,
                    inside: observation.boundingBox),
                mouth: self.center(
                    observation.landmarks?.outerLips,
                    inside: observation.boundingBox))
        }
        let personMask = personRequest?.results?.first?.pixelBuffer
        return BopFXAnalysis(
            faces: faces,
            personMask: personMask,
            errorMessage: nil)
    }

    private func configureSimulatorComputeDevice(_ request: VNRequest) {
#if targetEnvironment(simulator)
        if #available(iOS 17.0, *) {
            guard let stageDevices = try? request.supportedComputeStageDevices
            else { return }
            for (stage, devices) in stageDevices {
                guard let cpu = devices.first(where: { device in
                    if case .cpu = device { return true }
                    return false
                }) else { continue }
                request.setComputeDevice(cpu, for: stage)
            }
        }
#endif
    }

    private func center(
        _ region: VNFaceLandmarkRegion2D?,
        inside faceBounds: CGRect
    ) -> CGPoint? {
        guard let region, region.pointCount > 0 else { return nil }
        var x: CGFloat = 0
        var y: CGFloat = 0
        for index in 0..<region.pointCount {
            let point = region.normalizedPoints[index]
            x += point.x
            y += point.y
        }
        let count = CGFloat(region.pointCount)
        return CGPoint(
            x: faceBounds.minX + (x / count) * faceBounds.width,
            y: faceBounds.minY + (y / count) * faceBounds.height)
    }
}

final class BopFXRenderer {
    let device: MTLDevice
    private let context: CIContext
    private let analyzer = BopFXAnalyzer()
    private let colorSpace = CGColorSpaceCreateDeviceRGB()

    init?(device: MTLDevice? = MTLCreateSystemDefaultDevice()) {
        guard let device else { return nil }
        self.device = device
        self.context = CIContext(mtlDevice: device, options: [
            .cacheIntermediates: false,
            .workingColorSpace: colorSpace,
        ])
    }

    static func animationPhase(
        at time: CFTimeInterval = CACurrentMediaTime()
    ) -> CGFloat {
        return CGFloat(time.truncatingRemainder(dividingBy: 4) / 4)
    }

    fileprivate func render(
        _ image: CIImage,
        effect: BopFXEffect,
        analysis: BopFXAnalysis,
        phase: CGFloat,
        tuning: BopFXTuning
    ) -> CIImage {
        let tuned = applyTuning(
            image,
            tuning: tuning)
        switch effect {
        case .original:
            return tuned
        case .spectralEcho:
            return spectralEcho(tuned, analysis: analysis, phase: phase)
        case .funhouse:
            return funhouse(tuned, analysis: analysis, phase: phase)
        case .cutoutChorus:
            return cutoutChorus(tuned, analysis: analysis, phase: phase)
        case .mirrorBloom:
            return mirrorBloom(tuned, analysis: analysis, phase: phase)
        }
    }

    func renderStillImage(
        _ image: UIImage,
        effect: BopFXEffect,
        phase: CGFloat,
        tuning: BopFXTuning = .neutral
    ) -> UIImage? {
        return renderStillResult(
            image,
            effect: effect,
            phase: phase,
            tuning: tuning)?.image
    }

    func renderStillResult(
        _ image: UIImage,
        effect: BopFXEffect,
        phase: CGFloat,
        tuning: BopFXTuning = .neutral
    ) -> BopFXStillRender? {
        return autoreleasepool {
            let startedAt = CACurrentMediaTime()
            guard let input = normalizedCIImage(image) else { return nil }
            let analysis = analyzer.analyze(
                input,
                effect: effect,
                quality: .accurate)
            let output = render(
                input,
                effect: effect,
                analysis: analysis,
                phase: phase,
                tuning: tuning).cropped(to: input.extent)
            guard let cgImage = context.createCGImage(
                output,
                from: input.extent,
                format: .RGBA8,
                colorSpace: colorSpace) else { return nil }
            let rendered = UIImage(
                cgImage: cgImage,
                scale: 1,
                orientation: .up)
            return BopFXStillRender(
                image: rendered,
                faceCount: analysis.faces.count,
                personMaskAvailable: analysis.personMask != nil,
                analysisError: analysis.errorMessage,
                durationMilliseconds: Int(
                    (CACurrentMediaTime() - startedAt) * 1_000))
        }
    }

    func renderAnimationFrames(
        _ image: UIImage,
        effect: BopFXEffect,
        frameCount: Int,
        pixelSize: Int,
        tuning: BopFXTuning = .neutral,
        frameHandler: (CGImage, Int) -> Bool
    ) -> Bool {
        guard frameCount > 0, pixelSize > 0 else { return false }
        return autoreleasepool {
            guard let input = normalizedCIImage(image) else { return false }
            let analysis = analyzer.analyze(
                input,
                effect: effect,
                quality: .accurate)
            let destination = CGRect(
                x: 0,
                y: 0,
                width: pixelSize,
                height: pixelSize)

            for index in 0..<frameCount {
                let accepted = autoreleasepool {
                    let phase = CGFloat(index) / CGFloat(frameCount)
                    let rendered = aspectFill(
                        render(
                            input,
                            effect: effect,
                            analysis: analysis,
                            phase: phase,
                            tuning: tuning),
                        into: destination)
                    guard let frame = context.createCGImage(
                        rendered,
                        from: destination,
                        format: .RGBA8,
                        colorSpace: colorSpace) else { return false }
                    return frameHandler(frame, index)
                }
                if !accepted { return false }
            }
            return true
        }
    }

    fileprivate func renderPreview(
        _ image: CIImage,
        effect: BopFXEffect,
        analysis: BopFXAnalysis,
        phase: CGFloat,
        tuning: BopFXTuning,
        into texture: MTLTexture,
        commandBuffer: MTLCommandBuffer
    ) {
        let destination = CGRect(
            x: 0,
            y: 0,
            width: texture.width,
            height: texture.height)
        let fitted = aspectFill(
            render(
                image,
                effect: effect,
                analysis: analysis,
                phase: phase,
                tuning: tuning),
            into: destination)
        context.render(
            fitted,
            to: texture,
            commandBuffer: commandBuffer,
            bounds: destination,
            colorSpace: colorSpace)
    }

    private func applyTuning(
        _ image: CIImage,
        tuning: BopFXTuning
    ) -> CIImage {
        guard !tuning.isNeutral else { return image }
        var result = image
        if abs(tuning.hue) >= 0.001 {
            result = applying(
                "CIHueAdjust",
                to: result,
                values: [
                    kCIInputAngleKey: tuning.hue * .pi,
                ])
        }
        if abs(tuning.saturation) >= 0.001 {
            let saturation = tuning.saturation < 0
                ? 1 + tuning.saturation * 0.95
                : 1 + tuning.saturation * 0.8
            result = applying(
                "CIColorControls",
                to: result,
                values: [
                    kCIInputSaturationKey: saturation,
                ])
        }
        if abs(tuning.warmth) >= 0.001 {
            result = applying(
                "CITemperatureAndTint",
                to: result,
                values: [
                    "inputNeutral": CIVector(x: 6_500, y: 0),
                    "inputTargetNeutral": CIVector(
                        x: 6_500 + tuning.warmth * 3_000,
                        y: 0),
                ])
        }
        return result.cropped(to: image.extent)
    }

    private func spectralEcho(
        _ image: CIImage,
        analysis: BopFXAnalysis,
        phase: CGFloat
    ) -> CIImage {
        guard !analysis.faces.isEmpty else { return image }

        let colors = [
            CIColor(red: 1, green: 0.12, blue: 0.18),
            CIColor(red: 0, green: 0.82, blue: 0.82),
            CIColor(red: 1, green: 0.82, blue: 0.04),
        ]
        var result = applying(
            "CIColorControls",
            to: image,
            values: [
                kCIInputSaturationKey: 0.88,
                kCIInputContrastKey: 1.08,
                kCIInputBrightnessKey: -0.02,
            ])

        for face in analysis.faces {
            let faceRect = rect(face.bounds, in: image.extent)
                .insetBy(
                    dx: -faceRectExpansion(face.bounds, extent: image.extent),
                    dy: -faceRectExpansion(face.bounds, extent: image.extent))
            guard let mask = softFaceMask(faceRect, extent: image.extent) else {
                continue
            }

            for index in colors.indices {
                let angle =
                    phase * .pi * 2 + CGFloat(index) * (.pi * 2 / 3)
                let distance = faceRect.width * (0.11 + CGFloat(index) * 0.035)
                let translation = CGAffineTransform(
                    translationX: cos(angle) * distance,
                    y: sin(angle) * distance)
                let colored = applying(
                    "CIColorMonochrome",
                    to: image,
                    values: [
                        kCIInputColorKey: colors[index],
                        kCIInputIntensityKey: 0.76,
                    ]).transformed(by: translation)
                let movedMask = mask.transformed(by: translation)
                result = blend(
                    colored,
                    over: result,
                    mask: movedMask,
                    extent: image.extent)
            }
        }
        return result.cropped(to: image.extent)
    }

    private func funhouse(
        _ image: CIImage,
        analysis: BopFXAnalysis,
        phase: CGFloat
    ) -> CIImage {
        guard !analysis.faces.isEmpty else { return image }
        let originalExtent = image.extent
        var result = image
        let pulse = 0.28 + 0.08 * sin(phase * .pi * 2)

        for face in analysis.faces {
            let faceRect = rect(face.bounds, in: image.extent)
            var distorted = result.clampedToExtent()
            distorted = applying(
                "CIBumpDistortion",
                to: distorted,
                values: [
                    kCIInputCenterKey: CIVector(
                        x: faceRect.midX,
                        y: faceRect.midY),
                    kCIInputRadiusKey: max(faceRect.width, faceRect.height) * 0.62,
                    kCIInputScaleKey: pulse,
                ])

            for eye in [face.leftEye, face.rightEye].compactMap({ $0 }) {
                let point = denormalized(eye, in: image.extent)
                distorted = applying(
                    "CIPinchDistortion",
                    to: distorted,
                    values: [
                        kCIInputCenterKey: CIVector(x: point.x, y: point.y),
                        kCIInputRadiusKey: faceRect.width * 0.23,
                        kCIInputScaleKey: -0.32,
                    ])
            }

            if let mouth = face.mouth {
                let point = denormalized(mouth, in: image.extent)
                distorted = applying(
                    "CIBumpDistortion",
                    to: distorted,
                    values: [
                        kCIInputCenterKey: CIVector(x: point.x, y: point.y),
                        kCIInputRadiusKey: faceRect.width * 0.28,
                        kCIInputScaleKey: 0.22 + 0.1 * cos(phase * .pi * 2),
                    ])
            }
            let maskRect = faceRect.insetBy(
                dx: -faceRect.width * 0.34,
                dy: -faceRect.height * 0.3)
            guard let mask = softRoundedMask(
                maskRect,
                extent: originalExtent) else { continue }
            result = blend(
                distorted,
                over: result,
                mask: mask,
                extent: originalExtent)
        }
        return result.cropped(to: originalExtent)
    }

    private func cutoutChorus(
        _ image: CIImage,
        analysis: BopFXAnalysis,
        phase: CGFloat
    ) -> CIImage {
        guard let pixelBuffer = analysis.personMask else { return image }
        let mask = fitMask(
            CIImage(cvPixelBuffer: pixelBuffer),
            to: image.extent)
        let backdrop = applying(
            "CIColorControls",
            to: image,
            values: [
                kCIInputSaturationKey: 0.15,
                kCIInputContrastKey: 1.22,
                kCIInputBrightnessKey: -0.08,
            ])
        let colors = [
            CIColor(red: 1, green: 0.38, blue: 0.03),
            CIColor(red: 0.12, green: 0.83, blue: 0.38),
            CIColor(red: 0.05, green: 0.48, blue: 1),
        ]
        let center = CGPoint(x: image.extent.midX, y: image.extent.midY)
        let spread = image.extent.width * 0.19
        var result = backdrop

        for index in colors.indices {
            let angle =
                phase * .pi * 2 + CGFloat(index) * (.pi * 2 / 3)
            let offset = CGPoint(
                x: cos(angle) * spread,
                y: sin(angle) * spread * 0.72)
            let scale = 0.78 + CGFloat(index) * 0.035
            let transform = around(
                center: center,
                scale: scale,
                offset: offset)
            let subject = applying(
                "CIColorMonochrome",
                to: image,
                values: [
                    kCIInputColorKey: colors[index],
                    kCIInputIntensityKey: 0.58,
                ]).transformed(by: transform)
            result = blend(
                subject,
                over: result,
                mask: mask.transformed(by: transform),
                extent: image.extent)
        }
        return result.cropped(to: image.extent)
    }

    private func mirrorBloom(
        _ image: CIImage,
        analysis: BopFXAnalysis,
        phase: CGFloat
    ) -> CIImage {
        guard let primaryFace = analysis.faces.max(
            by: { $0.bounds.width * $0.bounds.height <
                $1.bounds.width * $1.bounds.height }) else {
            return image
        }
        let faceRect = rect(primaryFace.bounds, in: image.extent)
        let center = CGPoint(x: faceRect.midX, y: faceRect.midY)
        guard let tile = CIFilter(name: "CISixfoldReflectedTile") else {
            return image
        }
        tile.setValue(image.clampedToExtent(), forKey: kCIInputImageKey)
        tile.setValue(
            CIVector(x: center.x, y: center.y),
            forKey: "inputCenter")
        tile.setValue(phase * .pi * 2, forKey: "inputAngle")
        tile.setValue(
            max(faceRect.width * 0.72, image.extent.width * 0.18),
            forKey: "inputWidth")
        let reflected = tile.outputImage?.cropped(to: image.extent) ?? image
        guard let mask = softFaceMask(
            faceRect.insetBy(dx: -faceRect.width * 0.08, dy: -faceRect.height * 0.08),
            extent: image.extent) else {
            return reflected
        }
        return blend(
            image,
            over: reflected,
            mask: mask,
            extent: image.extent)
    }

    private func applying(
        _ name: String,
        to image: CIImage,
        values: [String: Any]
    ) -> CIImage {
        guard let filter = CIFilter(name: name) else { return image }
        filter.setValue(image, forKey: kCIInputImageKey)
        for (key, value) in values {
            filter.setValue(value, forKey: key)
        }
        return filter.outputImage?.cropped(to: image.extent) ?? image
    }

    private func blend(
        _ foreground: CIImage,
        over background: CIImage,
        mask: CIImage,
        extent: CGRect
    ) -> CIImage {
        guard let filter = CIFilter(name: "CIBlendWithMask") else {
            return background
        }
        filter.setValue(foreground, forKey: kCIInputImageKey)
        filter.setValue(background, forKey: kCIInputBackgroundImageKey)
        filter.setValue(mask, forKey: kCIInputMaskImageKey)
        return filter.outputImage?.cropped(to: extent) ?? background
    }

    private func softFaceMask(
        _ faceRect: CGRect,
        extent: CGRect
    ) -> CIImage? {
        guard let filter = CIFilter(name: "CIRadialGradient") else {
            return nil
        }
        filter.setValue(
            CIVector(x: faceRect.midX, y: faceRect.midY),
            forKey: "inputCenter")
        filter.setValue(
            min(faceRect.width, faceRect.height) * 0.34,
            forKey: "inputRadius0")
        filter.setValue(
            max(faceRect.width, faceRect.height) * 0.66,
            forKey: "inputRadius1")
        filter.setValue(CIColor.white, forKey: "inputColor0")
        filter.setValue(CIColor.clear, forKey: "inputColor1")
        return filter.outputImage?.cropped(to: extent)
    }

    private func softRoundedMask(
        _ rect: CGRect,
        extent: CGRect
    ) -> CIImage? {
        guard let generator = CIFilter(
            name: "CIRoundedRectangleGenerator") else { return nil }
        generator.setValue(
            CIVector(cgRect: rect),
            forKey: "inputExtent")
        generator.setValue(
            min(rect.width, rect.height) * 0.36,
            forKey: "inputRadius")
        generator.setValue(CIColor.white, forKey: "inputColor")
        guard let generated = generator.outputImage,
              let blur = CIFilter(name: "CIGaussianBlur") else {
            return nil
        }
        blur.setValue(generated, forKey: kCIInputImageKey)
        blur.setValue(
            max(3, min(rect.width, rect.height) * 0.025),
            forKey: kCIInputRadiusKey)
        return blur.outputImage?.cropped(to: extent)
    }

    private func fitMask(_ mask: CIImage, to extent: CGRect) -> CIImage {
        let zeroed = mask.transformed(
            by: CGAffineTransform(
                translationX: -mask.extent.minX,
                y: -mask.extent.minY))
        let scaled = zeroed.transformed(
            by: CGAffineTransform(
                scaleX: extent.width / mask.extent.width,
                y: extent.height / mask.extent.height))
        return scaled.transformed(
            by: CGAffineTransform(
                translationX: extent.minX,
                y: extent.minY)).cropped(to: extent)
    }

    private func aspectFill(_ image: CIImage, into bounds: CGRect) -> CIImage {
        let source = image.extent
        let zeroed = image.transformed(
            by: CGAffineTransform(
                translationX: -source.minX,
                y: -source.minY))
        let scale = max(
            bounds.width / source.width,
            bounds.height / source.height)
        let scaled = zeroed.transformed(
            by: CGAffineTransform(scaleX: scale, y: scale))
        return scaled.transformed(
            by: CGAffineTransform(
                translationX: bounds.midX - scaled.extent.midX,
                y: bounds.midY - scaled.extent.midY)).cropped(to: bounds)
    }

    private func rect(_ normalized: CGRect, in extent: CGRect) -> CGRect {
        return CGRect(
            x: extent.minX + normalized.minX * extent.width,
            y: extent.minY + normalized.minY * extent.height,
            width: normalized.width * extent.width,
            height: normalized.height * extent.height)
    }

    private func denormalized(_ point: CGPoint, in extent: CGRect) -> CGPoint {
        return CGPoint(
            x: extent.minX + point.x * extent.width,
            y: extent.minY + point.y * extent.height)
    }

    private func faceRectExpansion(
        _ normalized: CGRect,
        extent: CGRect
    ) -> CGFloat {
        return min(
            normalized.width * extent.width,
            normalized.height * extent.height) * 0.12
    }

    private func around(
        center: CGPoint,
        scale: CGFloat,
        offset: CGPoint
    ) -> CGAffineTransform {
        return CGAffineTransform(translationX: -center.x, y: -center.y)
            .scaledBy(x: scale, y: scale)
            .translatedBy(
                x: (center.x + offset.x) / scale,
                y: (center.y + offset.y) / scale)
    }

    private func normalizedCIImage(_ image: UIImage) -> CIImage? {
        guard let cgImage = image.cgImage else { return nil }
        return CIImage(cgImage: cgImage).oriented(
            forExifOrientation: image.imageOrientation.exifOrientation)
    }
}

final class BopFXPreviewView: MTKView {
    private let effectRenderer: BopFXRenderer
    private let commandQueue: MTLCommandQueue
    private let analyzer = BopFXAnalyzer()
    private let analysisQueue = DispatchQueue(
        label: "com.boothbop.bopfx.analysis",
        qos: .userInitiated)
    private let stateLock = NSLock()
    private var latestPixelBuffer: CVPixelBuffer?
    private var latestAnalysis = BopFXAnalysis.empty
    private var selectedEffect = BopFXEffect.original
    private var tuning = BopFXTuning.neutral
    private var displayFrozen = false
    private var hasRenderedFrame = false
    private var renderGeneration: UInt64 = 0
    private var lastRenderedPhase: CGFloat = 0
    private var inFlightCommandBuffer: MTLCommandBuffer?
    private var inFlightPhase: CGFloat = 0
    private var inFlightGeneration: UInt64 = 0
    private var analysisInFlight = false
    private var analysisGeneration: UInt64 = 0
    private var lastAnalysisTime: CFTimeInterval = 0
    private let minimumAnalysisInterval: CFTimeInterval = 1.0 / 12.0

    convenience init?(bopFXFrame frame: CGRect) {
        guard let device = MTLCreateSystemDefaultDevice() else { return nil }
        self.init(frame: frame, device: device)
    }

    override init(frame frameRect: CGRect, device: MTLDevice?) {
        let resolvedDevice = device ?? MTLCreateSystemDefaultDevice()!
        self.effectRenderer = BopFXRenderer(device: resolvedDevice)!
        self.commandQueue = resolvedDevice.makeCommandQueue()!
        super.init(frame: frameRect, device: resolvedDevice)
        framebufferOnly = false
        colorPixelFormat = .bgra8Unorm
        autoResizeDrawable = true
        enableSetNeedsDisplay = true
        isPaused = true
        isOpaque = true
        backgroundColor = .black
        isUserInteractionEnabled = false
        isHidden = true
    }

    required init(coder: NSCoder) {
        fatalError("BopFXPreviewView does not support storyboards")
    }

    func setEffect(_ effect: BopFXEffect) {
        stateLock.lock()
        selectedEffect = effect
        latestAnalysis = .empty
        analysisGeneration &+= 1
        lastAnalysisTime = 0
        hasRenderedFrame = false
        renderGeneration &+= 1
        stateLock.unlock()
        DispatchQueue.main.async {
            self.updateVisibility()
            if !self.isHidden {
                self.setNeedsDisplay()
            }
        }
    }

    func setTuning(_ tuning: BopFXTuning) {
        stateLock.lock()
        self.tuning = tuning
        hasRenderedFrame = false
        renderGeneration &+= 1
        stateLock.unlock()
        DispatchQueue.main.async {
            self.updateVisibility()
            if !self.isHidden {
                self.setNeedsDisplay()
            }
        }
    }

    func consume(_ pixelBuffer: CVPixelBuffer) {
        stateLock.lock()
        guard !displayFrozen else {
            stateLock.unlock()
            return
        }
        latestPixelBuffer = pixelBuffer
        let effect = selectedEffect
        let currentTuning = tuning
        let generation = analysisGeneration
        let now = CACurrentMediaTime()
        let shouldRender = effect != .original || !currentTuning.isNeutral
        let shouldAnalyze =
            effect != .original &&
            !analysisInFlight &&
            now - lastAnalysisTime >= minimumAnalysisInterval
        if shouldAnalyze {
            analysisInFlight = true
            lastAnalysisTime = now
        }
        stateLock.unlock()

        guard shouldRender else { return }
        if shouldAnalyze {
            analysisQueue.async { [weak self] in
                guard let self else { return }
                let image = CIImage(cvPixelBuffer: pixelBuffer)
                let analysis = self.analyzer.analyze(
                    image,
                    effect: effect,
                    quality: .balanced)
                self.stateLock.lock()
                if self.selectedEffect == effect &&
                    self.analysisGeneration == generation {
                    self.latestAnalysis = analysis
                }
                self.analysisInFlight = false
                self.stateLock.unlock()
            }
        }
        DispatchQueue.main.async { [weak self] in
            self?.setNeedsDisplay()
        }
    }

    override func draw(_ rect: CGRect) {
        stateLock.lock()
        guard !displayFrozen else {
            stateLock.unlock()
            return
        }
        let pixelBuffer = latestPixelBuffer
        let analysis = latestAnalysis
        let effect = selectedEffect
        let currentTuning = tuning
        let generation = renderGeneration
        let phase = BopFXRenderer.animationPhase()
        stateLock.unlock()

        guard effect != .original || !currentTuning.isNeutral,
              let pixelBuffer,
              let drawable = currentDrawable,
              let commandBuffer = commandQueue.makeCommandBuffer() else {
            return
        }
        effectRenderer.renderPreview(
            CIImage(cvPixelBuffer: pixelBuffer),
            effect: effect,
            analysis: analysis,
            phase: phase,
            tuning: currentTuning,
            into: drawable.texture,
            commandBuffer: commandBuffer)

        stateLock.lock()
        guard !displayFrozen,
              renderGeneration == generation else {
            stateLock.unlock()
            return
        }
        inFlightCommandBuffer = commandBuffer
        inFlightPhase = phase
        inFlightGeneration = generation
        commandBuffer.addCompletedHandler { [weak self] completedBuffer in
            guard let self else { return }
            self.stateLock.lock()
            if self.inFlightCommandBuffer === completedBuffer {
                if completedBuffer.status == .completed &&
                    self.renderGeneration == generation {
                    self.hasRenderedFrame = true
                    self.lastRenderedPhase = phase
                }
                self.inFlightCommandBuffer = nil
            }
            self.stateLock.unlock()
        }
        commandBuffer.present(drawable)
        commandBuffer.commit()
        stateLock.unlock()
    }

    func freezeCurrentFrame() -> CGFloat? {
        stateLock.lock()
        guard latestPixelBuffer != nil,
              selectedEffect != .original || !tuning.isNeutral else {
            stateLock.unlock()
            return nil
        }
        displayFrozen = true
        let commandBuffer = inFlightCommandBuffer
        let pendingPhase = inFlightPhase
        let pendingGeneration = inFlightGeneration
        stateLock.unlock()

        commandBuffer?.waitUntilCompleted()

        stateLock.lock()
        if let commandBuffer,
           commandBuffer.status == .completed,
           pendingGeneration == renderGeneration {
            hasRenderedFrame = true
            lastRenderedPhase = pendingPhase
            if inFlightCommandBuffer === commandBuffer {
                inFlightCommandBuffer = nil
            }
        }
        guard hasRenderedFrame else {
            displayFrozen = false
            stateLock.unlock()
            return nil
        }
        let phase = lastRenderedPhase
        stateLock.unlock()
        return phase
    }

    func resumeAfterFreeze() {
        stateLock.lock()
        displayFrozen = false
        stateLock.unlock()
        DispatchQueue.main.async {
            self.updateVisibility()
            if !self.isHidden {
                self.setNeedsDisplay()
            }
        }
    }

    private func updateVisibility() {
        dispatchPrecondition(condition: .onQueue(.main))
        stateLock.lock()
        let shouldRender =
            displayFrozen ||
            selectedEffect != .original ||
            !tuning.isNeutral
        stateLock.unlock()
        isHidden = !shouldRender
    }
}

private extension UIImage.Orientation {
    var exifOrientation: Int32 {
        switch self {
        case .up: return 1
        case .down: return 3
        case .left: return 8
        case .right: return 6
        case .upMirrored: return 2
        case .downMirrored: return 4
        case .leftMirrored: return 5
        case .rightMirrored: return 7
        @unknown default: return 1
        }
    }
}
