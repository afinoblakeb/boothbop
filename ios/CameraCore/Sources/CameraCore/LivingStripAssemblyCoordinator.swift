#if DEBUG
import Foundation

public enum LivingStripAssemblyPhase: Equatable, Sendable {
    case off
    case collecting
    case composing
    case ready
    case failed
}

public enum LivingStripAssemblyUpdate: Equatable, Sendable {
    case ignored
    case collecting(completedClipCount: Int)
    case compose(captureIDs: [Int64])
    case ready
    case failed
}

/// Queue-confined state for assembling one four-shot Living Strip.
///
/// Rendering may complete out of capture order. The coordinator preserves the
/// registration order and rejects stale generations before composition can be
/// published.
public final class LivingStripAssemblyCoordinator {
    public let requiredClipCount: Int

    public private(set) var generation: UInt64?
    public private(set) var attemptID: UInt64?
    public private(set) var phase = LivingStripAssemblyPhase.off

    private var captureIDs: [Int64] = []
    private var successfulStillCaptureIDs = Set<Int64>()
    private var renderedClipCaptureIDs = Set<Int64>()

    public init(requiredClipCount: Int = 4) {
        self.requiredClipCount = max(1, requiredClipCount)
    }

    public var registeredCaptureCount: Int {
        return captureIDs.count
    }

    public var completedClipCount: Int {
        return
            successfulStillCaptureIDs
            .intersection(renderedClipCaptureIDs)
            .count
    }

    public var successfulStillCaptureCount: Int {
        return successfulStillCaptureIDs.count
    }

    public var hasRegisteredAllCaptures: Bool {
        return captureIDs.count == requiredClipCount
    }

    public func stopDeferralDelay(
        pendingCaptureID: Int64?,
        deadline: TimeInterval?,
        now: TimeInterval
    ) -> TimeInterval? {
        guard pendingCaptureID != nil,
            phase == .collecting,
            hasRegisteredAllCaptures,
            successfulStillCaptureCount == registeredCaptureCount,
            let deadline
        else {
            return nil
        }
        let remaining = deadline - now
        return remaining > 0 ? remaining : nil
    }

    public func containsCapture(
        id: Int64
    ) -> Bool {
        return captureIDs.contains(id)
    }

    @discardableResult
    public func start(
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        self.generation = generation
        self.attemptID = attemptID
        phase = .collecting
        captureIDs.removeAll(keepingCapacity: true)
        successfulStillCaptureIDs.removeAll(keepingCapacity: true)
        renderedClipCaptureIDs.removeAll(keepingCapacity: true)
        return .collecting(completedClipCount: 0)
    }

    public func registerCapture(
        id: Int64,
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> Bool {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .collecting,
            captureIDs.count < requiredClipCount,
            !captureIDs.contains(id)
        else {
            return false
        }
        captureIDs.append(id)
        return true
    }

    public func markStillSucceeded(
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .collecting,
            captureIDs.contains(captureID),
            successfulStillCaptureIDs.insert(captureID).inserted
        else {
            return .ignored
        }
        return advanceIfReady()
    }

    public func markClipReady(
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .collecting,
            captureIDs.contains(captureID),
            renderedClipCaptureIDs.insert(captureID).inserted
        else {
            return .ignored
        }
        return advanceIfReady()
    }

    private func advanceIfReady()
        -> LivingStripAssemblyUpdate
    {
        let completedClipCount = completedClipCount
        guard captureIDs.count == requiredClipCount,
            completedClipCount == requiredClipCount
        else {
            return .collecting(
                completedClipCount: completedClipCount)
        }
        phase = .composing
        return .compose(captureIDs: captureIDs)
    }

    public func markClipFailed(
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .collecting,
            captureIDs.contains(captureID)
        else {
            return .ignored
        }
        phase = .failed
        return .failed
    }

    public func markCompositionSucceeded(
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .composing
        else {
            return .ignored
        }
        phase = .ready
        return .ready
    }

    public func markCompositionFailed(
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .composing
        else {
            return .ignored
        }
        phase = .failed
        return .failed
    }

    public func markFailed(
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> LivingStripAssemblyUpdate {
        guard self.generation == generation,
            self.attemptID == attemptID,
            phase == .collecting || phase == .composing
        else {
            return .ignored
        }
        phase = .failed
        return .failed
    }

    @discardableResult
    public func cancel(
        generation: UInt64,
        attemptID: UInt64 = 0
    ) -> Bool {
        guard self.generation == generation,
            self.attemptID == attemptID
        else {
            return false
        }
        self.generation = nil
        self.attemptID = nil
        phase = .off
        captureIDs.removeAll(keepingCapacity: true)
        successfulStillCaptureIDs.removeAll(keepingCapacity: true)
        renderedClipCaptureIDs.removeAll(keepingCapacity: true)
        return true
    }
}
#endif
