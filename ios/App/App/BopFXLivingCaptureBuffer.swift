#if DEBUG
import AVFoundation
import CoreGraphics
import CoreImage
import CoreMedia
import CoreVideo

private final class BopFXLivingPixelBufferPool {
    private static let panelSide = 450
    private static let minimumReusableBuffers = 4
    private static let maximumOutstandingBuffers = 64

    private let context = CIContext(options: [
        .cacheIntermediates: false,
        .workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB) as Any,
    ])
    private let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)
    private let pool: CVPixelBufferPool
    private let allocationAttributes: CFDictionary

    init?() {
        var createdPool: CVPixelBufferPool?
        let poolAttributes: [CFString: Any] = [
            kCVPixelBufferPoolMinimumBufferCountKey:
                Self.minimumReusableBuffers
        ]
        let pixelBufferAttributes: [CFString: Any] = [
            kCVPixelBufferPixelFormatTypeKey:
                kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey: Self.panelSide,
            kCVPixelBufferHeightKey: Self.panelSide,
            kCVPixelBufferIOSurfacePropertiesKey: [:],
            kCVPixelBufferMetalCompatibilityKey: true,
        ]
        guard
            CVPixelBufferPoolCreate(
                nil,
                poolAttributes as CFDictionary,
                pixelBufferAttributes as CFDictionary,
                &createdPool) == kCVReturnSuccess,
            let createdPool
        else {
            return nil
        }
        pool = createdPool
        allocationAttributes =
            [
                kCVPixelBufferPoolAllocationThresholdKey:
                    Self.maximumOutstandingBuffers
            ] as CFDictionary
    }

    func copySquareFrame(
        from source: CVPixelBuffer
    ) -> CVPixelBuffer? {
        var destination: CVPixelBuffer?
        guard
            CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(
                nil,
                pool,
                allocationAttributes,
                &destination) == kCVReturnSuccess,
            let destination
        else {
            return nil
        }

        let image = CIImage(cvPixelBuffer: source)
        let side = min(
            image.extent.width,
            image.extent.height)
        guard side > 0 else { return nil }
        let crop = CGRect(
            x: image.extent.midX - side / 2,
            y: image.extent.midY - side / 2,
            width: side,
            height: side)
        let outputBounds = CGRect(
            x: 0,
            y: 0,
            width: Self.panelSide,
            height: Self.panelSide)
        let normalized =
            image
            .cropped(to: crop)
            .transformed(
                by: CGAffineTransform(
                    translationX: -crop.minX,
                    y: -crop.minY)
            )
            .transformed(
                by: CGAffineTransform(
                    scaleX: CGFloat(Self.panelSide) / side,
                    y: CGFloat(Self.panelSide) / side))
        context.render(
            normalized,
            to: destination,
            bounds: outputBounds,
            colorSpace: colorSpace)
        return destination
    }

    func flushExcessBuffers() {
        CVPixelBufferPoolFlush(
            pool,
            .excessBuffers)
    }
}

struct BopFXLivingFrame {
    let id: Int
    let pixelBuffer: CVPixelBuffer
    let presentationTime: CMTime
}

struct BopFXLivingShot {
    let captureID: Int64
    let generation: UInt64
    let shutterTime: CMTime
    let frames: [BopFXLivingFrame]

    var playbackDescriptor: LivingStripClipDescriptor {
        return LivingStripClipDescriptor(
            captureID: captureID,
            generation: generation,
            shutterTime: CMTimeGetSeconds(shutterTime),
            sourceTimes: frames.map {
                CMTimeGetSeconds($0.presentationTime)
            })
    }
}

enum BopFXLivingCaptureFailure {
    case timeline(LivingCaptureRecorderFailure)
    case pixelBufferCopyFailed
    case missingFrameData
}

enum BopFXLivingCaptureUpdate {
    case ignored
    case collecting
    case completed(BopFXLivingShot)
    case failed(
        captureID: Int64,
        reason: BopFXLivingCaptureFailure)
}

/// Debug-only AVFoundation adapter around CameraCore's pure timeline recorder.
///
/// Camera-owned sample buffers are never retained. Timeline metadata is offered
/// first, and only accepted frame IDs are copied synchronously into a bounded
/// app-owned 450px pool. The full-quality `AVCapturePhotoOutput` JPEG remains
/// an independent immutable still master.
final class BopFXLivingCaptureBuffer {
    private let timeline = LivingCaptureTimelineRecorder()
    private let pixelBufferPool = BopFXLivingPixelBufferPool()
    private var sessionGeneration: UInt64?
    private var activeCaptureID: Int64?
    private var nextFrameID = 0
    private var latestPresentationTime: TimeInterval?
    private var framesByID: [Int: BopFXLivingFrame] = [:]

    func startSession(generation: UInt64) {
        sessionGeneration = generation
        activeCaptureID = nil
        nextFrameID = 0
        latestPresentationTime = nil
        framesByID.removeAll(keepingCapacity: true)
        pixelBufferPool?.flushExcessBuffers()
        timeline.startSession(generation: generation)
    }

    func append(
        _ sampleBuffer: CMSampleBuffer,
        generation: UInt64
    ) -> BopFXLivingCaptureUpdate {
        guard sessionGeneration == generation else { return .ignored }
        let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let seconds = CMTimeGetSeconds(timestamp)
        guard timestamp.isValid,
            !timestamp.isIndefinite,
            seconds.isFinite,
            let pixelBuffer =
                CMSampleBufferGetImageBuffer(sampleBuffer)
        else {
            return .ignored
        }

        nextFrameID &+= 1
        let frameID = nextFrameID
        latestPresentationTime = seconds
        let outcome = timeline.offer(
            LivingTimelineFrame(
                id: frameID,
                presentationTime: seconds),
            generation: generation)
        if timeline.retainedFrameIDs.contains(frameID) {
            guard
                let pixelBufferPool,
                let retainedPixelBuffer =
                    pixelBufferPool.copySquareFrame(
                        from: pixelBuffer)
            else {
                return handlePixelBufferCopyFailure(
                    generation: generation)
            }
            framesByID[frameID] = BopFXLivingFrame(
                id: frameID,
                pixelBuffer: retainedPixelBuffer,
                presentationTime: timestamp)
        }
        let update = captureUpdate(from: outcome)
        pruneUnretainedFrames()
        return update
    }

    @discardableResult
    func armShot(
        captureID: Int64,
        generation: UInt64
    ) -> Bool {
        guard sessionGeneration == generation,
            let latestPresentationTime
        else {
            return false
        }
        let armed = timeline.armShot(
            captureID: captureID,
            provisionalTime: latestPresentationTime,
            generation: generation)
        guard armed else { return false }
        guard
            timeline.retainedFrameIDs.allSatisfy({
                framesByID[$0] != nil
            })
        else {
            resetRetentionState(generation: generation)
            return false
        }
        activeCaptureID = captureID
        return true
    }

    func resolveShutter(
        captureID: Int64,
        timestamp: CMTime,
        generation: UInt64
    ) -> BopFXLivingCaptureUpdate {
        let seconds = CMTimeGetSeconds(timestamp)
        guard sessionGeneration == generation,
            timestamp.isValid,
            !timestamp.isIndefinite,
            seconds.isFinite
        else {
            return .ignored
        }
        let outcome = timeline.resolveShutter(
            captureID: captureID,
            timestamp: seconds,
            generation: generation)
        let update = captureUpdate(from: outcome)
        pruneUnretainedFrames()
        return update
    }

    @discardableResult
    func cancelShot(
        captureID: Int64,
        generation: UInt64
    ) -> Bool {
        let cancelled = timeline.cancelShot(
            captureID: captureID,
            generation: generation)
        if cancelled, activeCaptureID == captureID {
            activeCaptureID = nil
        }
        pruneUnretainedFrames()
        return cancelled
    }

    func cancelSession(generation: UInt64) {
        guard sessionGeneration == generation else { return }
        timeline.cancelSession(generation: generation)
        sessionGeneration = nil
        activeCaptureID = nil
        latestPresentationTime = nil
        framesByID.removeAll(keepingCapacity: true)
        pixelBufferPool?.flushExcessBuffers()
    }

    private func captureUpdate(
        from outcome: LivingCaptureRecorderOutcome
    ) -> BopFXLivingCaptureUpdate {
        switch outcome {
        case .ignored:
            return .ignored
        case .collecting:
            return .collecting
        case .failed(let captureID, let reason):
            if activeCaptureID == captureID {
                activeCaptureID = nil
            }
            return .failed(
                captureID: captureID,
                reason: .timeline(reason))
        case .completed(let window):
            if activeCaptureID == window.captureID {
                activeCaptureID = nil
            }
            let frames = window.frameIDs.compactMap {
                framesByID[$0]
            }
            guard frames.count == window.frameIDs.count else {
                return .failed(
                    captureID: window.captureID,
                    reason: .missingFrameData)
            }
            return .completed(
                BopFXLivingShot(
                    captureID: window.captureID,
                    generation: window.generation,
                    shutterTime: CMTime(
                        seconds: window.shutterTime,
                        preferredTimescale: 600),
                    frames: frames))
        }
    }

    private func pruneUnretainedFrames() {
        let retainedFrameIDs = timeline.retainedFrameIDs
        framesByID = framesByID.filter {
            retainedFrameIDs.contains($0.key)
        }
    }

    private func handlePixelBufferCopyFailure(
        generation: UInt64
    ) -> BopFXLivingCaptureUpdate {
        let failedCaptureID = activeCaptureID
        resetRetentionState(generation: generation)
        guard let failedCaptureID else {
            return .collecting
        }
        return .failed(
            captureID: failedCaptureID,
            reason: .pixelBufferCopyFailed)
    }

    private func resetRetentionState(
        generation: UInt64
    ) {
        timeline.startSession(generation: generation)
        activeCaptureID = nil
        latestPresentationTime = nil
        framesByID.removeAll(keepingCapacity: true)
        pixelBufferPool?.flushExcessBuffers()
    }
}
#endif
