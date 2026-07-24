import XCTest

@testable import CameraCore

final class LivingStripAssemblyCoordinatorTests: XCTestCase {
    func testCollectsFourCapturesAndComposesInCaptureOrder() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)

        XCTAssertEqual(
            coordinator.start(generation: 7),
            .collecting(completedClipCount: 0))
        XCTAssertTrue(coordinator.registerCapture(id: 101, generation: 7))
        XCTAssertTrue(coordinator.registerCapture(id: 102, generation: 7))
        XCTAssertTrue(coordinator.registerCapture(id: 103, generation: 7))
        XCTAssertTrue(coordinator.registerCapture(id: 104, generation: 7))
        XCTAssertEqual(coordinator.registeredCaptureCount, 4)
        XCTAssertTrue(coordinator.hasRegisteredAllCaptures)

        XCTAssertEqual(
            coordinator.markStillSucceeded(captureID: 101, generation: 7),
            .collecting(completedClipCount: 0))
        XCTAssertEqual(
            coordinator.markStillSucceeded(captureID: 102, generation: 7),
            .collecting(completedClipCount: 0))
        XCTAssertEqual(
            coordinator.markStillSucceeded(captureID: 103, generation: 7),
            .collecting(completedClipCount: 0))
        XCTAssertEqual(
            coordinator.markStillSucceeded(captureID: 104, generation: 7),
            .collecting(completedClipCount: 0))
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 102, generation: 7),
            .collecting(completedClipCount: 1))
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 101, generation: 7),
            .collecting(completedClipCount: 2))
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 104, generation: 7),
            .collecting(completedClipCount: 3))
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 103, generation: 7),
            .compose(captureIDs: [101, 102, 103, 104]))
        XCTAssertEqual(coordinator.completedClipCount, 4)
        XCTAssertEqual(coordinator.phase, .composing)

        XCTAssertEqual(
            coordinator.markCompositionSucceeded(generation: 7),
            .ready)
        XCTAssertEqual(coordinator.phase, .ready)
    }

    func testRenderedMotionCannotCommitUntilItsStillSucceeds() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 1)
        _ = coordinator.start(
            generation: 2,
            attemptID: 9)
        XCTAssertTrue(
            coordinator.registerCapture(
                id: 50,
                generation: 2,
                attemptID: 9))

        XCTAssertEqual(
            coordinator.markClipReady(
                captureID: 50,
                generation: 2,
                attemptID: 9),
            .collecting(completedClipCount: 0))
        XCTAssertEqual(coordinator.completedClipCount, 0)
        XCTAssertEqual(coordinator.phase, .collecting)

        XCTAssertEqual(
            coordinator.markStillSucceeded(
                captureID: 50,
                generation: 2,
                attemptID: 9),
            .compose(captureIDs: [50]))
        XCTAssertEqual(coordinator.completedClipCount, 1)
        XCTAssertEqual(coordinator.phase, .composing)
    }

    func testRejectsDuplicateUnknownAndFifthCaptures() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)
        _ = coordinator.start(generation: 3)

        XCTAssertTrue(coordinator.registerCapture(id: 1, generation: 3))
        XCTAssertFalse(coordinator.registerCapture(id: 1, generation: 3))
        XCTAssertTrue(coordinator.registerCapture(id: 2, generation: 3))
        XCTAssertTrue(coordinator.registerCapture(id: 3, generation: 3))
        XCTAssertTrue(coordinator.registerCapture(id: 4, generation: 3))
        XCTAssertFalse(coordinator.registerCapture(id: 5, generation: 3))
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 99, generation: 3),
            .ignored)
    }

    func testIgnoresStaleGenerationCallbacksAfterRestart() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)
        _ = coordinator.start(generation: 10)
        XCTAssertTrue(coordinator.registerCapture(id: 1, generation: 10))

        _ = coordinator.start(generation: 11)
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 1, generation: 10),
            .ignored)
        XCTAssertEqual(
            coordinator.markCompositionSucceeded(generation: 10),
            .ignored)
        XCTAssertEqual(coordinator.generation, 11)
        XCTAssertEqual(coordinator.phase, .collecting)
    }

    func testCancellationInvalidatesPendingClipsAndComposition() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)
        _ = coordinator.start(generation: 5)
        XCTAssertTrue(coordinator.registerCapture(id: 20, generation: 5))

        XCTAssertTrue(coordinator.cancel(generation: 5))
        XCTAssertEqual(coordinator.phase, .off)
        XCTAssertNil(coordinator.generation)
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 20, generation: 5),
            .ignored)
        XCTAssertEqual(
            coordinator.markCompositionSucceeded(generation: 5),
            .ignored)
    }

    func testClipFailureIsTerminalForTheActiveGeneration() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)
        _ = coordinator.start(generation: 8)
        XCTAssertTrue(coordinator.registerCapture(id: 40, generation: 8))

        XCTAssertEqual(
            coordinator.markClipFailed(captureID: 40, generation: 8),
            .failed)
        XCTAssertEqual(coordinator.phase, .failed)
        XCTAssertFalse(coordinator.registerCapture(id: 41, generation: 8))
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 40, generation: 8),
            .ignored)
    }

    func testCompositionFailureCanRestartWithSameCameraGeneration() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 2)
        _ = coordinator.start(generation: 14)
        XCTAssertTrue(coordinator.registerCapture(id: 1, generation: 14))
        XCTAssertTrue(coordinator.registerCapture(id: 2, generation: 14))
        _ = coordinator.markStillSucceeded(
            captureID: 1,
            generation: 14)
        _ = coordinator.markStillSucceeded(
            captureID: 2,
            generation: 14)
        _ = coordinator.markClipReady(captureID: 1, generation: 14)
        XCTAssertEqual(
            coordinator.markClipReady(captureID: 2, generation: 14),
            .compose(captureIDs: [1, 2]))

        XCTAssertEqual(
            coordinator.markCompositionFailed(generation: 14),
            .failed)
        XCTAssertEqual(coordinator.phase, .failed)

        XCTAssertEqual(
            coordinator.start(generation: 14),
            .collecting(completedClipCount: 0))
        XCTAssertEqual(coordinator.phase, .collecting)
    }

    func testSessionFailureDoesNotRequireARegisteredCapture() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)
        _ = coordinator.start(generation: 21)

        XCTAssertEqual(
            coordinator.markFailed(generation: 21),
            .failed)
        XCTAssertEqual(coordinator.phase, .failed)
        XCTAssertEqual(
            coordinator.markFailed(generation: 20),
            .ignored)
    }

    func testRejectsOldAttemptCallbacksWithinTheSameCameraGeneration() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 2)
        _ = coordinator.start(
            generation: 31,
            attemptID: 1)
        XCTAssertTrue(
            coordinator.registerCapture(
                id: 1,
                generation: 31,
                attemptID: 1))

        _ = coordinator.start(
            generation: 31,
            attemptID: 2)
        XCTAssertTrue(
            coordinator.registerCapture(
                id: 2,
                generation: 31,
                attemptID: 2))
        XCTAssertEqual(
            coordinator.markClipReady(
                captureID: 1,
                generation: 31,
                attemptID: 1),
            .ignored)
        XCTAssertFalse(
            coordinator.cancel(
                generation: 31,
                attemptID: 1))
        XCTAssertEqual(coordinator.attemptID, 2)
        XCTAssertEqual(coordinator.registeredCaptureCount, 1)
    }

    func testDefersStopOnlyThroughAnActiveCompletedStillWindow() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 4)
        _ = coordinator.start(
            generation: 40,
            attemptID: 3)

        for captureID in 1...4 {
            XCTAssertTrue(
                coordinator.registerCapture(
                    id: Int64(captureID),
                    generation: 40,
                    attemptID: 3))
            _ = coordinator.markStillSucceeded(
                captureID: Int64(captureID),
                generation: 40,
                attemptID: 3)
        }

        let delay = coordinator.stopDeferralDelay(
            pendingCaptureID: 4,
            deadline: 11.5,
            now: 11)
        XCTAssertNotNil(delay)
        XCTAssertEqual(delay ?? 0, 0.5, accuracy: 0.000_001)
        XCTAssertNil(
            coordinator.stopDeferralDelay(
                pendingCaptureID: nil,
                deadline: 11.5,
                now: 11))
        XCTAssertNil(
            coordinator.stopDeferralDelay(
                pendingCaptureID: 4,
                deadline: 11,
                now: 11))
    }

    func testStopDeferralEndsWhenTheAttemptIsCancelled() {
        let coordinator = LivingStripAssemblyCoordinator(requiredClipCount: 1)
        _ = coordinator.start(
            generation: 41,
            attemptID: 4)
        XCTAssertTrue(
            coordinator.registerCapture(
                id: 9,
                generation: 41,
                attemptID: 4))
        _ = coordinator.markStillSucceeded(
            captureID: 9,
            generation: 41,
            attemptID: 4)
        XCTAssertNotNil(
            coordinator.stopDeferralDelay(
                pendingCaptureID: 9,
                deadline: 21,
                now: 20))

        XCTAssertTrue(
            coordinator.cancel(
                generation: 41,
                attemptID: 4))
        XCTAssertNil(
            coordinator.stopDeferralDelay(
                pendingCaptureID: 9,
                deadline: 21,
                now: 20))
    }
}
