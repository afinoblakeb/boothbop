import Foundation

public struct LivingStripClipDescriptor: Equatable, Sendable {
    public let captureID: Int64
    public let generation: UInt64
    public let shutterTime: TimeInterval
    public let sourceTimes: [TimeInterval]

    public init(
        captureID: Int64,
        generation: UInt64,
        shutterTime: TimeInterval,
        sourceTimes: [TimeInterval]
    ) {
        self.captureID = captureID
        self.generation = generation
        self.shutterTime = shutterTime
        self.sourceTimes = sourceTimes
    }
}

public enum LivingStripPlaybackPlanError: Error, Equatable, Sendable {
    case invalidPanelCount
    case insufficientMotionFrames
    case invalidTimeline
    case shutterOutsideClip
    case mixedGenerations
    case duplicateCaptureID
    case invalidCaptureOrder
    case invalidOutputTiming
}

public struct LivingStripPlaybackPlan: Equatable, Sendable {
    public let clips: [LivingStripClipDescriptor]
    public let outputFrameRate: Int
    public let outputFrameCount: Int
    public let generation: UInt64
    private let shutterFrameIndices: [Int]

    public init(
        clips: [LivingStripClipDescriptor],
        outputFrameRate: Int = 30,
        durationSeconds: TimeInterval = 2
    ) throws {
        guard clips.count == 4 else {
            throw LivingStripPlaybackPlanError.invalidPanelCount
        }
        guard clips.allSatisfy({ $0.sourceTimes.count >= 2 }) else {
            throw LivingStripPlaybackPlanError.insufficientMotionFrames
        }
        guard let generation = clips.first?.generation,
            clips.allSatisfy({ $0.generation == generation })
        else {
            throw LivingStripPlaybackPlanError.mixedGenerations
        }
        guard Set(clips.map(\.captureID)).count == clips.count else {
            throw LivingStripPlaybackPlanError.duplicateCaptureID
        }
        guard
            zip(clips, clips.dropFirst()).allSatisfy({
                $0.shutterTime < $1.shutterTime
            })
        else {
            throw LivingStripPlaybackPlanError.invalidCaptureOrder
        }

        var shutterFrameIndices: [Int] = []
        shutterFrameIndices.reserveCapacity(clips.count)
        for clip in clips {
            guard clip.shutterTime.isFinite,
                clip.sourceTimes.allSatisfy(\.isFinite),
                Set(clip.sourceTimes).count >= 2,
                zip(
                    clip.sourceTimes,
                    clip.sourceTimes.dropFirst()
                ).allSatisfy({ $0 <= $1 })
            else {
                throw LivingStripPlaybackPlanError.invalidTimeline
            }
            guard let firstTime = clip.sourceTimes.first,
                let lastTime = clip.sourceTimes.last,
                (firstTime...lastTime).contains(clip.shutterTime)
            else {
                throw LivingStripPlaybackPlanError.shutterOutsideClip
            }
            let nearest = clip.sourceTimes.enumerated().min {
                let leftDistance = abs($0.element - clip.shutterTime)
                let rightDistance = abs($1.element - clip.shutterTime)
                if leftDistance == rightDistance {
                    return $0.offset < $1.offset
                }
                return leftDistance < rightDistance
            }
            guard let nearest else {
                throw LivingStripPlaybackPlanError.invalidTimeline
            }
            shutterFrameIndices.append(nearest.offset)
        }

        guard outputFrameRate >= 2,
            durationSeconds.isFinite,
            durationSeconds > 0
        else {
            throw LivingStripPlaybackPlanError.invalidOutputTiming
        }
        let outputFrameCount =
            Int((durationSeconds * Double(outputFrameRate)).rounded())
        guard outputFrameCount > 0,
            outputFrameCount % outputFrameRate == 0
        else {
            throw LivingStripPlaybackPlanError.invalidOutputTiming
        }
        self.clips = clips
        self.outputFrameRate = outputFrameRate
        self.outputFrameCount = outputFrameCount
        self.generation = generation
        self.shutterFrameIndices = shutterFrameIndices
    }

    public var panelCount: Int {
        return clips.count
    }

    public var captureIDs: [Int64] {
        return clips.map(\.captureID)
    }

    public func sourceFrameIndex(
        panelIndex: Int,
        outputFrameIndex: Int
    ) -> Int? {
        guard clips.indices.contains(panelIndex),
            (0..<outputFrameCount).contains(outputFrameIndex)
        else {
            return nil
        }
        let sourceFrameCount =
            clips[panelIndex].sourceTimes.count
        let cycleFrameCount = (sourceFrameCount - 1) * 2
        let localOutputFrameIndex =
            outputFrameIndex % outputFrameRate
        let cycleProgress =
            Double(localOutputFrameIndex)
            / Double(outputFrameRate)
        let cycleOffset =
            min(
                cycleFrameCount - 1,
                Int(
                    (cycleProgress * Double(cycleFrameCount))
                        .rounded()))
        let cycleIndex =
            (cycleOffset + shutterFrameIndices[panelIndex])
            % cycleFrameCount
        if cycleIndex < sourceFrameCount {
            return cycleIndex
        }
        return cycleFrameCount - cycleIndex
    }
}
