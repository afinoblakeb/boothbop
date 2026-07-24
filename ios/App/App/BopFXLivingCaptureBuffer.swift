#if DEBUG
import AVFoundation
import CoreMedia
import CoreVideo

struct BopFXLivingCaptureConfiguration {
    static let discovery = BopFXLivingCaptureConfiguration(
        preRollSeconds: 0.25,
        postRollSeconds: 0.25,
        maximumFrames: 24)

    let preRoll: CMTime
    let postRoll: CMTime
    let maximumFrames: Int

    init(
        preRollSeconds: Double,
        postRollSeconds: Double,
        maximumFrames: Int
    ) {
        preRoll = CMTime(
            seconds: max(0, preRollSeconds),
            preferredTimescale: 600)
        postRoll = CMTime(
            seconds: max(0, postRollSeconds),
            preferredTimescale: 600)
        self.maximumFrames = max(2, maximumFrames)
    }
}

struct BopFXLivingFrame {
    let pixelBuffer: CVPixelBuffer
    let presentationTime: CMTime
}

struct BopFXLivingShot {
    let shutterTime: CMTime
    let frames: [BopFXLivingFrame]

    var duration: CMTime {
        guard let first = frames.first,
              let last = frames.last else { return .zero }
        return CMTimeSubtract(
            last.presentationTime,
            first.presentationTime)
    }
}

/// A sample-queue-owned rolling buffer for a single half-second living shot.
///
/// The buffer retains preview pixel buffers only. The independent
/// `AVCapturePhotoOutput` JPEG remains the immutable full-quality still master.
final class BopFXLivingCaptureBuffer {
    private struct ActiveShot {
        let shutterTime: CMTime
        let endTime: CMTime
        var frames: [BopFXLivingFrame]
    }

    private let configuration: BopFXLivingCaptureConfiguration
    private var rollingFrames: [BopFXLivingFrame] = []
    private var activeShot: ActiveShot?
    private var lastPresentationTime = CMTime.invalid

    init(
        configuration: BopFXLivingCaptureConfiguration = .discovery
    ) {
        self.configuration = configuration
    }

    var isReady: Bool {
        guard activeShot == nil,
              let first = rollingFrames.first,
              let last = rollingFrames.last else { return false }
        let available = CMTimeSubtract(
            last.presentationTime,
            first.presentationTime)
        return CMTimeCompare(
            available,
            configuration.preRoll) >= 0
    }

    /// Starts a window at the newest sample. Call only from the sample queue.
    @discardableResult
    func beginShot() -> Bool {
        guard isReady,
              let shutterTime = rollingFrames.last?.presentationTime else {
            return false
        }
        let startTime = CMTimeSubtract(
            shutterTime,
            configuration.preRoll)
        let preRollFrames = rollingFrames.filter {
            CMTimeCompare($0.presentationTime, startTime) >= 0 &&
                CMTimeCompare($0.presentationTime, shutterTime) <= 0
        }
        guard preRollFrames.count >= 2 else { return false }
        activeShot = ActiveShot(
            shutterTime: shutterTime,
            endTime: CMTimeAdd(
                shutterTime,
                configuration.postRoll),
            frames: preRollFrames)
        return true
    }

    /// Adds one camera sample and returns a completed window when post-roll
    /// reaches its target. Call only from the sample queue.
    func append(_ sampleBuffer: CMSampleBuffer) -> BopFXLivingShot? {
        let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        guard timestamp.isValid,
              !timestamp.isIndefinite,
              let pixelBuffer =
                CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return nil
        }

        if lastPresentationTime.isValid {
            let comparison = CMTimeCompare(
                timestamp,
                lastPresentationTime)
            guard comparison > 0 else { return nil }
            let gap = CMTimeGetSeconds(
                CMTimeSubtract(timestamp, lastPresentationTime))
            if gap > 1 {
                reset()
            }
        }

        let frame = BopFXLivingFrame(
            pixelBuffer: pixelBuffer,
            presentationTime: timestamp)
        rollingFrames.append(frame)
        lastPresentationTime = timestamp
        trimRollingFrames(relativeTo: timestamp)

        guard var shot = activeShot else { return nil }
        if CMTimeCompare(timestamp, shot.shutterTime) > 0,
           CMTimeCompare(timestamp, shot.endTime) <= 0 {
            shot.frames.append(frame)
            if shot.frames.count > configuration.maximumFrames {
                shot.frames.removeFirst(
                    shot.frames.count - configuration.maximumFrames)
            }
        }
        activeShot = shot

        guard CMTimeCompare(timestamp, shot.endTime) >= 0 else {
            return nil
        }
        activeShot = nil
        guard shot.frames.count >= 2 else { return nil }
        return BopFXLivingShot(
            shutterTime: shot.shutterTime,
            frames: shot.frames)
    }

    /// Releases every retained camera buffer. Call for cancellation,
    /// backgrounding, session replacement, or timestamp discontinuity.
    func reset() {
        rollingFrames.removeAll(keepingCapacity: true)
        activeShot = nil
        lastPresentationTime = .invalid
    }

    private func trimRollingFrames(relativeTo timestamp: CMTime) {
        let retention = CMTimeAdd(
            configuration.preRoll,
            CMTime(value: 2, timescale: 30))
        let cutoff = CMTimeSubtract(timestamp, retention)
        rollingFrames.removeAll {
            CMTimeCompare($0.presentationTime, cutoff) < 0
        }
        if rollingFrames.count > configuration.maximumFrames {
            rollingFrames.removeFirst(
                rollingFrames.count - configuration.maximumFrames)
        }
    }
}
#endif
