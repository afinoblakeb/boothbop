import Foundation

public struct LivingTimelineFrame: Equatable, Sendable {
    public let id: Int
    public let presentationTime: TimeInterval

    public init(
        id: Int,
        presentationTime: TimeInterval
    ) {
        self.id = id
        self.presentationTime = presentationTime
    }
}

public struct LivingCaptureWindow: Equatable, Sendable {
    public let captureID: Int64
    public let generation: UInt64
    public let shutterTime: TimeInterval
    public let frameIDs: [Int]
    public let sourceTimes: [TimeInterval]
}

public enum LivingCaptureRecorderFailure: Error, Equatable, Sendable {
    case clockDiscontinuity
    case anchorCorrectionOutOfRange
    case insufficientCoverage
    case sampleGap
    case insufficientUniqueFrames
}

public enum LivingCaptureRecorderOutcome: Equatable, Sendable {
    case ignored
    case collecting
    case completed(LivingCaptureWindow)
    case failed(
        captureID: Int64,
        reason: LivingCaptureRecorderFailure)
}

public final class LivingCaptureTimelineRecorder {
    private struct ActiveCapture {
        let captureID: Int64
        let generation: UInt64
        let provisionalTime: TimeInterval
        var resolvedShutterTime: TimeInterval?
        var frames: [LivingTimelineFrame]
    }

    private let selector: LivingFrameWindowSelector
    private let maximumFrames: Int
    private let maximumActiveFrames: Int
    private let maximumAnchorCorrection: TimeInterval
    private var generation: UInt64?
    private var frames: [LivingTimelineFrame] = []
    private var activeCapture: ActiveCapture?
    private var lastObservedTime: TimeInterval?
    private var lastAcceptedBucket: Int64?

    public init(
        configuration: LivingFrameWindowConfiguration = .init(),
        maximumFrames: Int = 30,
        maximumActiveFrames: Int = 30,
        maximumAnchorCorrection: TimeInterval = 0.15
    ) {
        selector = LivingFrameWindowSelector(
            configuration: configuration)
        self.maximumFrames = max(
            configuration.targetFrameCount,
            maximumFrames)
        self.maximumActiveFrames = max(
            configuration.targetFrameCount,
            maximumActiveFrames)
        self.maximumAnchorCorrection = max(
            0,
            maximumAnchorCorrection)
    }

    public var retainedFrameCount: Int {
        return frames.count
    }

    public var retainedActiveFrameCount: Int {
        return activeCapture?.frames.count ?? 0
    }

    public var retainedFrameIDs: Set<Int> {
        return Set(frames.map(\.id)).union(
            activeCapture?.frames.map(\.id) ?? [])
    }

    public func startSession(generation: UInt64) {
        self.generation = generation
        frames.removeAll(keepingCapacity: true)
        activeCapture = nil
        lastObservedTime = nil
        lastAcceptedBucket = nil
    }

    public func offer(
        _ frame: LivingTimelineFrame,
        generation: UInt64
    ) -> LivingCaptureRecorderOutcome {
        guard self.generation == generation,
            frame.presentationTime.isFinite
        else {
            return .ignored
        }

        if let lastObservedTime {
            let delta =
                frame.presentationTime - lastObservedTime
            if abs(delta) < 0.000_001 {
                return .ignored
            }
            if delta < 0 || delta > selector.configuration.discontinuityThreshold {
                let failedCapture = activeCapture
                frames = [frame]
                activeCapture = nil
                self.lastObservedTime = frame.presentationTime
                lastAcceptedBucket = frameBucket(
                    for: frame.presentationTime)
                if let failedCapture {
                    return .failed(
                        captureID: failedCapture.captureID,
                        reason: .clockDiscontinuity)
                }
                return .collecting
            }
        }
        lastObservedTime = frame.presentationTime

        let bucket = frameBucket(
            for: frame.presentationTime)
        guard bucket != lastAcceptedBucket else {
            return .ignored
        }
        lastAcceptedBucket = bucket

        frames.append(frame)
        if frames.count > maximumFrames {
            frames.removeFirst(frames.count - maximumFrames)
        }
        if var activeCapture,
            frame.presentationTime > (activeCapture.frames.last?.presentationTime ?? -.infinity)
        {
            let collectionEnd =
                activeCapture.provisionalTime + selector.configuration.postRollSeconds
                + maximumAnchorCorrection + selector.configuration.coverageTolerance
            if frame.presentationTime <= collectionEnd {
                activeCapture.frames.append(frame)
                if activeCapture.frames.count > maximumActiveFrames {
                    activeCapture.frames.removeFirst(
                        activeCapture.frames.count - maximumActiveFrames)
                }
                self.activeCapture = activeCapture
            }
        }
        return completeIfPossible()
    }

    @discardableResult
    public func armShot(
        captureID: Int64,
        provisionalTime: TimeInterval,
        generation: UInt64
    ) -> Bool {
        guard self.generation == generation,
            activeCapture == nil,
            provisionalTime.isFinite,
            let first = frames.first,
            let last = frames.last,
            first.presentationTime <= provisionalTime - selector.configuration.preRollSeconds
                + selector.configuration.coverageTolerance,
            last.presentationTime >= provisionalTime - selector.configuration.coverageTolerance
        else {
            return false
        }
        let retainedStart =
            provisionalTime - selector.configuration.preRollSeconds - maximumAnchorCorrection
            - selector.configuration.coverageTolerance
        let retainedFrames = frames.filter {
            $0.presentationTime >= retainedStart
        }
        activeCapture = ActiveCapture(
            captureID: captureID,
            generation: generation,
            provisionalTime: provisionalTime,
            resolvedShutterTime: nil,
            frames: Array(
                retainedFrames.suffix(maximumActiveFrames)))
        return true
    }

    public func resolveShutter(
        captureID: Int64,
        timestamp: TimeInterval,
        generation: UInt64
    ) -> LivingCaptureRecorderOutcome {
        guard self.generation == generation,
            timestamp.isFinite,
            var activeCapture,
            activeCapture.captureID == captureID,
            activeCapture.generation == generation
        else {
            return .ignored
        }
        guard abs(timestamp - activeCapture.provisionalTime) <= maximumAnchorCorrection else {
            self.activeCapture = nil
            return .failed(
                captureID: captureID,
                reason: .anchorCorrectionOutOfRange)
        }
        activeCapture.resolvedShutterTime = timestamp
        self.activeCapture = activeCapture
        return completeIfPossible()
    }

    @discardableResult
    public func cancelShot(
        captureID: Int64,
        generation: UInt64
    ) -> Bool {
        guard self.generation == generation,
            activeCapture?.captureID == captureID
        else {
            return false
        }
        activeCapture = nil
        return true
    }

    public func cancelSession(generation: UInt64) {
        guard self.generation == generation else { return }
        self.generation = nil
        frames.removeAll(keepingCapacity: true)
        activeCapture = nil
        lastObservedTime = nil
        lastAcceptedBucket = nil
    }

    private func completeIfPossible() -> LivingCaptureRecorderOutcome {
        guard let activeCapture,
            let shutterTime =
                activeCapture.resolvedShutterTime
        else {
            return .collecting
        }
        guard
            let latest =
                activeCapture.frames.last?.presentationTime,
            latest >= shutterTime + selector.configuration.postRollSeconds
                - selector.configuration.coverageTolerance
        else {
            return .collecting
        }

        switch selector.select(
            timestamps: activeCapture.frames.map(\.presentationTime),
            shutterTime: shutterTime)
        {
        case .success(let selection):
            let window = LivingCaptureWindow(
                captureID: activeCapture.captureID,
                generation: activeCapture.generation,
                shutterTime: shutterTime,
                frameIDs: selection.sourceIndices.map {
                    activeCapture.frames[$0].id
                },
                sourceTimes: selection.sourceTimes)
            self.activeCapture = nil
            return .completed(window)
        case .failure(let failure):
            let reason: LivingCaptureRecorderFailure
            switch failure {
            case .invalidTimestamp, .insufficientCoverage:
                reason = .insufficientCoverage
            case .sampleGap:
                reason = .sampleGap
            case .insufficientUniqueFrames:
                reason = .insufficientUniqueFrames
            }
            self.activeCapture = nil
            return .failed(
                captureID: activeCapture.captureID,
                reason: reason)
        }
    }

    private func frameBucket(
        for timestamp: TimeInterval
    ) -> Int64 {
        return Int64(
            floor(
                timestamp * selector.configuration.targetFrameRate + 0.000_001))
    }
}
