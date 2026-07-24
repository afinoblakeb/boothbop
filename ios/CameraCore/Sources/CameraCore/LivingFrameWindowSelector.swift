import Foundation

public struct LivingFrameWindowConfiguration: Equatable, Sendable {
    public let preRollSeconds: TimeInterval
    public let postRollSeconds: TimeInterval
    public let targetFrameRate: Double
    public let minimumUniqueFrames: Int
    public let maximumSampleDistance: TimeInterval
    public let coverageTolerance: TimeInterval
    public let discontinuityThreshold: TimeInterval

    public init(
        preRollSeconds: TimeInterval = 0.25,
        postRollSeconds: TimeInterval = 0.25,
        targetFrameRate: Double = 30,
        minimumUniqueFrames: Int = 12,
        maximumSampleDistance: TimeInterval = 1.0 / 24.0,
        coverageTolerance: TimeInterval = 1.0 / 48.0,
        discontinuityThreshold: TimeInterval = 0.5
    ) {
        self.preRollSeconds = max(0, preRollSeconds)
        self.postRollSeconds = max(0, postRollSeconds)
        self.targetFrameRate = max(1, targetFrameRate)
        self.minimumUniqueFrames = max(2, minimumUniqueFrames)
        self.maximumSampleDistance = max(0, maximumSampleDistance)
        self.coverageTolerance = max(0, coverageTolerance)
        self.discontinuityThreshold = max(
            self.maximumSampleDistance,
            discontinuityThreshold)
    }

    public var targetFrameCount: Int {
        return max(
            2,
            Int(
                ((preRollSeconds + postRollSeconds) * targetFrameRate).rounded()))
    }
}

public enum LivingFrameWindowFailure: Error, Equatable, Sendable {
    case invalidTimestamp
    case insufficientCoverage
    case sampleGap
    case insufficientUniqueFrames
}

public struct LivingFrameWindowSelection: Equatable, Sendable {
    public let sourceIndices: [Int]
    public let sourceTimes: [TimeInterval]
    public let targetTimes: [TimeInterval]
    public let uniqueSourceFrameCount: Int

    public init(
        sourceIndices: [Int],
        sourceTimes: [TimeInterval],
        targetTimes: [TimeInterval]
    ) {
        self.sourceIndices = sourceIndices
        self.sourceTimes = sourceTimes
        self.targetTimes = targetTimes
        self.uniqueSourceFrameCount = Set(sourceIndices).count
    }
}

public struct LivingFrameWindowSelector: Sendable {
    private struct Sample {
        let sourceIndex: Int
        let time: TimeInterval
    }

    public let configuration: LivingFrameWindowConfiguration

    public init(
        configuration: LivingFrameWindowConfiguration = .init()
    ) {
        self.configuration = configuration
    }

    public func select(
        timestamps: [TimeInterval],
        shutterTime: TimeInterval
    ) -> Result<LivingFrameWindowSelection, LivingFrameWindowFailure> {
        guard shutterTime.isFinite else {
            return .failure(.invalidTimestamp)
        }
        let startTime = shutterTime - configuration.preRollSeconds
        let endTime = shutterTime + configuration.postRollSeconds
        let segments = monotonicSegments(timestamps)
        guard
            let segment =
                segments
                .filter({
                    guard let first = $0.first,
                        let last = $0.last
                    else { return false }
                    return first.time <= startTime + configuration.coverageTolerance
                        && last.time >= endTime - configuration.coverageTolerance
                })
                .min(by: { lhs, rhs in
                    distanceFromCenter(lhs, shutterTime: shutterTime)
                        < distanceFromCenter(rhs, shutterTime: shutterTime)
                })
        else {
            return .failure(.insufficientCoverage)
        }

        let interval = 1 / configuration.targetFrameRate
        let targetTimes = (0..<configuration.targetFrameCount).map {
            startTime + (Double($0) + 0.5) * interval
        }
        var selected: [Sample] = []
        selected.reserveCapacity(targetTimes.count)
        for targetTime in targetTimes {
            guard
                let nearest = segment.min(
                    by: {
                        abs($0.time - targetTime) < abs($1.time - targetTime)
                    }),
                abs(nearest.time - targetTime) <= configuration.maximumSampleDistance
            else {
                return .failure(.sampleGap)
            }
            selected.append(nearest)
        }

        let selection = LivingFrameWindowSelection(
            sourceIndices: selected.map(\.sourceIndex),
            sourceTimes: selected.map(\.time),
            targetTimes: targetTimes)
        guard selection.uniqueSourceFrameCount >= configuration.minimumUniqueFrames else {
            return .failure(.insufficientUniqueFrames)
        }
        return .success(selection)
    }

    private func monotonicSegments(
        _ timestamps: [TimeInterval]
    ) -> [[Sample]] {
        var segments: [[Sample]] = []
        var current: [Sample] = []
        var previous: TimeInterval?

        for (index, timestamp) in timestamps.enumerated() {
            guard timestamp.isFinite else { continue }
            if let previous {
                let delta = timestamp - previous
                if abs(delta) < 0.000_001 {
                    continue
                }
                if delta < 0 || delta > configuration.discontinuityThreshold {
                    if !current.isEmpty {
                        segments.append(current)
                    }
                    current = []
                }
            }
            current.append(
                Sample(
                    sourceIndex: index,
                    time: timestamp))
            previous = timestamp
        }
        if !current.isEmpty {
            segments.append(current)
        }
        return segments
    }

    private func distanceFromCenter(
        _ segment: [Sample],
        shutterTime: TimeInterval
    ) -> TimeInterval {
        guard let first = segment.first,
            let last = segment.last
        else {
            return .infinity
        }
        return abs((first.time + last.time) / 2 - shutterTime)
    }
}
