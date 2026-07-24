import XCTest

@testable import CameraCore

final class LivingStripPlaybackPlanTests: XCTestCase {
    func testBuildsTwoSecondsOfThirtyFPSPlaybackForFourClips() throws {
        let plan = try LivingStripPlaybackPlan(
            clips: clips(frameCounts: [15, 15, 15, 15]))

        XCTAssertEqual(plan.outputFrameRate, 30)
        XCTAssertEqual(plan.outputFrameCount, 60)
        XCTAssertEqual(plan.panelCount, 4)
        XCTAssertEqual(plan.generation, 9)
        XCTAssertEqual(plan.captureIDs, [100, 101, 102, 103])
    }

    func testStartsEveryPanelOnItsExactShutterFrame() throws {
        let plan = try LivingStripPlaybackPlan(
            clips: [
                clip(captureID: 100, frameCount: 15, shutterFrameIndex: 5),
                clip(captureID: 101, frameCount: 12, shutterFrameIndex: 7),
                clip(captureID: 102, frameCount: 9, shutterFrameIndex: 2),
                clip(captureID: 103, frameCount: 6, shutterFrameIndex: 4),
            ])

        XCTAssertEqual(
            (0..<plan.panelCount).compactMap {
                plan.sourceFrameIndex(
                    panelIndex: $0,
                    outputFrameIndex: 0)
            },
            [5, 7, 2, 4])
    }

    func testChoosesTheFrameNearestTheExactShutterTimestamp() throws {
        let descriptor = LivingStripClipDescriptor(
            captureID: 100,
            generation: 9,
            shutterTime: 1.03,
            sourceTimes: [0.72, 0.81, 0.9, 1.0, 1.1, 1.2])
        let plan = try LivingStripPlaybackPlan(
            clips: [
                descriptor,
                clip(captureID: 101, frameCount: 15),
                clip(captureID: 102, frameCount: 15),
                clip(captureID: 103, frameCount: 15),
            ])

        XCTAssertEqual(
            plan.sourceFrameIndex(
                panelIndex: 0,
                outputFrameIndex: 0),
            3)
    }

    func testAcceptsRepeatedTimesFromTwentyFourFPSResampling() throws {
        let sourceTimes = (0...24).map {
            Double($0) / 24
        }
        let selection = try LivingFrameWindowSelector()
            .select(
                timestamps: sourceTimes,
                shutterTime: 0.5
            )
            .get()
        XCTAssertEqual(selection.sourceTimes.count, 15)
        XCTAssertLessThan(
            selection.uniqueSourceFrameCount,
            selection.sourceTimes.count)

        let descriptors = (0..<4).map { index in
            let offset = Double(index) * 2
            return LivingStripClipDescriptor(
                captureID: Int64(100 + index),
                generation: 9,
                shutterTime: 0.5 + offset,
                sourceTimes: selection.sourceTimes.map {
                    $0 + offset
                })
        }

        XCTAssertNoThrow(
            try LivingStripPlaybackPlan(
                clips: descriptors))
    }

    func testPingPongPlaybackTurnsAtTheEndsWithoutDuplicatingTheShutter() throws {
        let plan = try LivingStripPlaybackPlan(
            clips: clips(frameCounts: [15, 15, 15, 15]))
        let firstCycle = (0..<30).compactMap {
            plan.sourceFrameIndex(
                panelIndex: 0,
                outputFrameIndex: $0)
        }

        XCTAssertEqual(firstCycle.first, 7)
        XCTAssertEqual(firstCycle.last, 6)
        XCTAssertEqual(
            Array(firstCycle.prefix(9)),
            [7, 8, 9, 10, 11, 12, 13, 14, 14])
        XCTAssertEqual(
            Array(firstCycle.suffix(9)),
            [1, 0, 0, 1, 2, 3, 4, 5, 6])
    }

    func testTwoSecondFileLoopsAcrossAdjacentFrames() throws {
        let plan = try LivingStripPlaybackPlan(
            clips: clips(frameCounts: [15, 12, 9, 6]))

        for panelIndex in 0..<plan.panelCount {
            let first = try XCTUnwrap(
                plan.sourceFrameIndex(
                    panelIndex: panelIndex,
                    outputFrameIndex: 0))
            let last = try XCTUnwrap(
                plan.sourceFrameIndex(
                    panelIndex: panelIndex,
                    outputFrameIndex: plan.outputFrameCount - 1))
            XCTAssertEqual(abs(first - last), 1)
        }
    }

    func testRejectsInvalidCaptureContracts() {
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: Array(
                    clips(frameCounts: [15, 15, 15, 15]).prefix(3))))
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: clips(frameCounts: [15, 15, 15, 1])))

        var mixedGenerations = clips(frameCounts: [15, 15, 15, 15])
        mixedGenerations[3] = clip(
            captureID: 103,
            generation: 10,
            frameCount: 15)
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: mixedGenerations))

        var duplicateCaptureIDs = clips(
            frameCounts: [15, 15, 15, 15])
        duplicateCaptureIDs[3] = clip(
            captureID: 102,
            frameCount: 15)
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: duplicateCaptureIDs))

        var reorderedClips = clips(
            frameCounts: [15, 15, 15, 15])
        reorderedClips.swapAt(1, 2)
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: reorderedClips))

        let invalidTimeline = LivingStripClipDescriptor(
            captureID: 100,
            generation: 9,
            shutterTime: 0.1,
            sourceTimes: [0, 0.2, 0.1])
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: [
                    invalidTimeline,
                    clip(captureID: 101, frameCount: 15),
                    clip(captureID: 102, frameCount: 15),
                    clip(captureID: 103, frameCount: 15),
                ]))

        let motionlessTimeline = LivingStripClipDescriptor(
            captureID: 100,
            generation: 9,
            shutterTime: 0.1,
            sourceTimes: [0.1, 0.1, 0.1])
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: [
                    motionlessTimeline,
                    clip(captureID: 101, frameCount: 15),
                    clip(captureID: 102, frameCount: 15),
                    clip(captureID: 103, frameCount: 15),
                ]))

        let shutterOutsideClip = LivingStripClipDescriptor(
            captureID: 100,
            generation: 9,
            shutterTime: 2,
            sourceTimes: [0, 0.1, 0.2])
        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: [
                    shutterOutsideClip,
                    clip(captureID: 101, frameCount: 15),
                    clip(captureID: 102, frameCount: 15),
                    clip(captureID: 103, frameCount: 15),
                ]))

        XCTAssertThrowsError(
            try LivingStripPlaybackPlan(
                clips: clips(frameCounts: [15, 15, 15, 15]),
                outputFrameRate: 1))
    }

    func testRejectsInvalidOutputCoordinates() throws {
        let plan = try LivingStripPlaybackPlan(
            clips: clips(frameCounts: [15, 15, 15, 15]))

        XCTAssertNil(
            plan.sourceFrameIndex(
                panelIndex: -1,
                outputFrameIndex: 0))
        XCTAssertNil(
            plan.sourceFrameIndex(
                panelIndex: 4,
                outputFrameIndex: 0))
        XCTAssertNil(
            plan.sourceFrameIndex(
                panelIndex: 0,
                outputFrameIndex: -1))
        XCTAssertNil(
            plan.sourceFrameIndex(
                panelIndex: 0,
                outputFrameIndex: 60))
    }

    private func clips(
        frameCounts: [Int]
    ) -> [LivingStripClipDescriptor] {
        return frameCounts.enumerated().map {
            clip(
                captureID: Int64(100 + $0.offset),
                frameCount: $0.element)
        }
    }

    private func clip(
        captureID: Int64,
        generation: UInt64 = 9,
        frameCount: Int,
        shutterFrameIndex: Int? = nil
    ) -> LivingStripClipDescriptor {
        let timeOffset =
            Double(captureID - 100) * 2
        let sourceTimes = (0..<frameCount).map {
            1 + timeOffset + Double($0) / 30
        }
        let anchor = min(
            max(0, shutterFrameIndex ?? frameCount / 2),
            max(0, frameCount - 1))
        let shutterTime =
            sourceTimes.indices.contains(anchor)
            ? sourceTimes[anchor]
            : 1 + timeOffset
        return LivingStripClipDescriptor(
            captureID: captureID,
            generation: generation,
            shutterTime: shutterTime,
            sourceTimes: sourceTimes)
    }
}
