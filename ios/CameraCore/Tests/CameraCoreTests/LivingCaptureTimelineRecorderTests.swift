import XCTest

@testable import CameraCore

final class LivingCaptureTimelineRecorderTests: XCTestCase {
    func testResolvesAgainstTheExactPhotoTimestamp() throws {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 4)
        offerFrames(
            to: recorder,
            generation: 4,
            range: 0...30)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 90,
                provisionalTime: 1,
                generation: 4))
        XCTAssertEqual(
            recorder.resolveShutter(
                captureID: 90,
                timestamp: 1.08,
                generation: 4),
            .collecting)

        var completed = LivingCaptureRecorderOutcome.collecting
        for index in 31...40 {
            completed = recorder.offer(
                LivingTimelineFrame(
                    id: index,
                    presentationTime: Double(index) / 30),
                generation: 4)
            if case .completed = completed {
                break
            }
        }
        guard case .completed(let window) = completed else {
            return XCTFail("Expected a completed exact-timestamp window")
        }
        XCTAssertEqual(window.captureID, 90)
        XCTAssertEqual(window.generation, 4)
        XCTAssertEqual(window.shutterTime, 1.08, accuracy: 0.000_1)
        XCTAssertEqual(window.frameIDs.count, 15)
    }

    func testIgnoresStaleGenerationsAndCancelsExplicitly() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 2)

        XCTAssertEqual(
            recorder.offer(
                LivingTimelineFrame(id: 1, presentationTime: 0),
                generation: 1),
            .ignored)
        offerFrames(
            to: recorder,
            generation: 2,
            range: 0...20)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 8,
                provisionalTime: 2.0 / 3.0,
                generation: 2))
        XCTAssertTrue(
            recorder.cancelShot(captureID: 8, generation: 2))
        XCTAssertFalse(
            recorder.cancelShot(captureID: 8, generation: 2))

        recorder.cancelSession(generation: 2)
        XCTAssertEqual(recorder.retainedFrameCount, 0)
        XCTAssertEqual(
            recorder.offer(
                LivingTimelineFrame(id: 99, presentationTime: 1),
                generation: 2),
            .ignored)
    }

    func testClockRollbackFailsTheActiveShotAndResetsHistory() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 7)
        offerFrames(
            to: recorder,
            generation: 7,
            range: 0...20)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 11,
                provisionalTime: 2.0 / 3.0,
                generation: 7))

        XCTAssertEqual(
            recorder.offer(
                LivingTimelineFrame(id: 21, presentationTime: 0.1),
                generation: 7),
            .failed(
                captureID: 11,
                reason: .clockDiscontinuity))
        XCTAssertEqual(recorder.retainedFrameCount, 1)
    }

    func testHardCapsRetainedTimelineFrames() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 3)
        offerFrames(
            to: recorder,
            generation: 3,
            range: 0...199)
        XCTAssertLessThanOrEqual(recorder.retainedFrameCount, 30)
    }

    func testLatePhotoCallbackStillResolvesTheProvisionalWindow() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 12)
        offerFrames(
            to: recorder,
            generation: 12,
            range: 0...30)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 44,
                provisionalTime: 1,
                generation: 12))

        offerFrames(
            to: recorder,
            generation: 12,
            range: 31...75)
        XCTAssertLessThanOrEqual(recorder.retainedActiveFrameCount, 30)
        XCTAssertLessThanOrEqual(recorder.retainedFrameIDs.count, 60)
        let outcome = recorder.resolveShutter(
            captureID: 44,
            timestamp: 1.08,
            generation: 12)

        guard case .completed(let window) = outcome else {
            return XCTFail("Expected the provisional window to survive")
        }
        XCTAssertEqual(window.frameIDs.count, 15)
        XCTAssertEqual(recorder.retainedActiveFrameCount, 0)
    }

    func testLatePhotoCallbackAtSixtyFPSRemainsBoundedAndCompletes() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 13)
        for index in 0...60 {
            _ = recorder.offer(
                LivingTimelineFrame(
                    id: index,
                    presentationTime: Double(index) / 60),
                generation: 13)
        }
        XCTAssertTrue(
            recorder.armShot(
                captureID: 45,
                provisionalTime: 1,
                generation: 13))

        for index in 61...150 {
            _ = recorder.offer(
                LivingTimelineFrame(
                    id: index,
                    presentationTime: Double(index) / 60),
                generation: 13)
        }
        XCTAssertLessThanOrEqual(recorder.retainedActiveFrameCount, 30)
        let outcome = recorder.resolveShutter(
            captureID: 45,
            timestamp: 1.08,
            generation: 13)

        guard case .completed(let window) = outcome else {
            return XCTFail("Expected delayed 60 FPS capture to complete")
        }
        XCTAssertEqual(window.frameIDs.count, 15)
    }

    func testRejectsAnImplausiblePhotoTimestampCorrection() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 18)
        offerFrames(
            to: recorder,
            generation: 18,
            range: 0...30)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 52,
                provisionalTime: 1,
                generation: 18))

        XCTAssertEqual(
            recorder.resolveShutter(
                captureID: 52,
                timestamp: 1.3,
                generation: 18),
            .failed(
                captureID: 52,
                reason: .anchorCorrectionOutOfRange))
        XCTAssertEqual(recorder.retainedActiveFrameCount, 0)
    }

    func testWrongCaptureIDCannotStealTheActiveShot() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 22)
        offerFrames(
            to: recorder,
            generation: 22,
            range: 0...30)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 61,
                provisionalTime: 1,
                generation: 22))

        XCTAssertEqual(
            recorder.resolveShutter(
                captureID: 62,
                timestamp: 1,
                generation: 22),
            .ignored)
        XCTAssertEqual(recorder.retainedActiveFrameCount > 0, true)
        XCTAssertEqual(
            recorder.resolveShutter(
                captureID: 61,
                timestamp: 1,
                generation: 22),
            .collecting)
    }

    func testCompletesSequentialShotsInOneGeneration() {
        let recorder = LivingCaptureTimelineRecorder()
        recorder.startSession(generation: 30)
        offerFrames(
            to: recorder,
            generation: 30,
            range: 0...30)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 70,
                provisionalTime: 1,
                generation: 30))
        _ = recorder.resolveShutter(
            captureID: 70,
            timestamp: 1,
            generation: 30)
        let first = offerUntilCompletion(
            recorder,
            generation: 30,
            range: 31...40)
        guard case .completed(let firstWindow) = first else {
            return XCTFail("Expected the first shot")
        }

        offerFrames(
            to: recorder,
            generation: 30,
            range: 41...60)
        XCTAssertTrue(
            recorder.armShot(
                captureID: 71,
                provisionalTime: 2,
                generation: 30))
        _ = recorder.resolveShutter(
            captureID: 71,
            timestamp: 2,
            generation: 30)
        let second = offerUntilCompletion(
            recorder,
            generation: 30,
            range: 61...70)
        guard case .completed(let secondWindow) = second else {
            return XCTFail("Expected the second shot")
        }

        XCTAssertEqual(firstWindow.captureID, 70)
        XCTAssertEqual(secondWindow.captureID, 71)
        XCTAssertNotEqual(firstWindow.frameIDs, secondWindow.frameIDs)
    }

    private func offerFrames(
        to recorder: LivingCaptureTimelineRecorder,
        generation: UInt64,
        range: ClosedRange<Int>
    ) {
        for index in range {
            _ = recorder.offer(
                LivingTimelineFrame(
                    id: index,
                    presentationTime: Double(index) / 30),
                generation: generation)
        }
    }

    private func offerUntilCompletion(
        _ recorder: LivingCaptureTimelineRecorder,
        generation: UInt64,
        range: ClosedRange<Int>
    ) -> LivingCaptureRecorderOutcome {
        for index in range {
            let outcome = recorder.offer(
                LivingTimelineFrame(
                    id: index,
                    presentationTime: Double(index) / 30),
                generation: generation)
            if case .completed = outcome {
                return outcome
            }
        }
        return .collecting
    }
}
