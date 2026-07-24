#if DEBUG
import AVFoundation
import CoreMedia
import CoreVideo

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
}

enum BopFXLivingCaptureFailure {
    case timeline(LivingCaptureRecorderFailure)
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
/// This adapter is not wired into the shipping camera. A production adapter
/// must normalize accepted frames to 720px before retention; the full-quality
/// `AVCapturePhotoOutput` JPEG remains an independent immutable still master.
final class BopFXLivingCaptureBuffer {
    private let timeline = LivingCaptureTimelineRecorder()
    private var sessionGeneration: UInt64?
    private var nextFrameID = 0
    private var latestPresentationTime: TimeInterval?
    private var framesByID: [Int: BopFXLivingFrame] = [:]

    func startSession(generation: UInt64) {
        sessionGeneration = generation
        nextFrameID = 0
        latestPresentationTime = nil
        framesByID.removeAll(keepingCapacity: true)
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
        let frame = BopFXLivingFrame(
            id: nextFrameID,
            pixelBuffer: pixelBuffer,
            presentationTime: timestamp)
        framesByID[frame.id] = frame
        latestPresentationTime = seconds
        let outcome = timeline.offer(
            LivingTimelineFrame(
                id: frame.id,
                presentationTime: seconds),
            generation: generation)
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
        return timeline.armShot(
            captureID: captureID,
            provisionalTime: latestPresentationTime,
            generation: generation)
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
        pruneUnretainedFrames()
        return cancelled
    }

    func cancelSession(generation: UInt64) {
        guard sessionGeneration == generation else { return }
        timeline.cancelSession(generation: generation)
        sessionGeneration = nil
        latestPresentationTime = nil
        framesByID.removeAll(keepingCapacity: true)
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
            return .failed(
                captureID: captureID,
                reason: .timeline(reason))
        case .completed(let window):
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
}
#endif
