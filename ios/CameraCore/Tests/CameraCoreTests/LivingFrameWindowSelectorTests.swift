import XCTest

@testable import CameraCore

final class LivingFrameWindowSelectorTests: XCTestCase {
    private let selector = LivingFrameWindowSelector()

    func testSelectsFifteenTargetsAtCommonCaptureRates() throws {
        for frameRate in [24.0, 30.0, 60.0] {
            let timestamps = stride(
                from: 0.0,
                through: 2.0,
                by: 1 / frameRate
            ).map { $0 }
            let selection = try selector.select(
                timestamps: timestamps,
                shutterTime: 1
            ).get()

            XCTAssertEqual(selection.sourceIndices.count, 15)
            XCTAssertEqual(selection.targetTimes.count, 15)
            XCTAssertGreaterThanOrEqual(
                selection.uniqueSourceFrameCount,
                11)
            XCTAssertEqual(
                selection.targetTimes.first ?? 0,
                1 - 0.25 + 1 / 60,
                accuracy: 0.000_1)
            XCTAssertEqual(
                selection.targetTimes.last ?? 0,
                1 + 0.25 - 1 / 60,
                accuracy: 0.000_1)
        }
    }

    func testHandlesJitterDroppedFramesAndDuplicateTimestamps() throws {
        let timestamps =
            (0...60).compactMap { index -> Double? in
                if [24, 25, 37, 43].contains(index) { return nil }
                let base = Double(index) / 30
                let jitter = index.isMultiple(of: 2) ? 0.003 : -0.002
                return base + jitter
            } + [2.003]
        let selection = try selector.select(
            timestamps: timestamps.sorted(),
            shutterTime: 1
        ).get()

        XCTAssertEqual(selection.sourceIndices.count, 15)
        XCTAssertGreaterThanOrEqual(selection.uniqueSourceFrameCount, 8)
    }

    func testUsesTheMonotonicSegmentContainingTheShutter() throws {
        let firstSegment = stride(
            from: 0.0,
            through: 0.6,
            by: 1 / 30
        ).map { $0 }
        let secondSegment = stride(
            from: 0.1,
            through: 1.0,
            by: 1 / 30
        ).map { $0 }
        let timestamps = firstSegment + [0.6] + secondSegment
        let selection = try selector.select(
            timestamps: timestamps,
            shutterTime: 0.55
        ).get()

        XCTAssertTrue(
            selection.sourceIndices.allSatisfy {
                $0 > firstSegment.count
            })
    }

    func testRejectsAWindowAcrossAClockDiscontinuity() {
        let timestamps =
            stride(from: 0.0, through: 0.4, by: 1 / 30).map { $0 }
            + stride(from: 1.0, through: 1.4, by: 1 / 30).map { $0 }

        XCTAssertEqual(
            selector.select(
                timestamps: timestamps,
                shutterTime: 0.7),
            .failure(.insufficientCoverage))
    }

    func testExactShutterTimestampCanShiftTheSelectedWindow() throws {
        let timestamps = stride(
            from: 0.0,
            through: 2.0,
            by: 1 / 30
        ).map { $0 }
        let provisional = try selector.select(
            timestamps: timestamps,
            shutterTime: 1
        ).get()
        let exact = try selector.select(
            timestamps: timestamps,
            shutterTime: 1.08
        ).get()

        XCTAssertNotEqual(
            provisional.sourceIndices,
            exact.sourceIndices)
        XCTAssertEqual(
            exact.targetTimes.reduce(0, +) / Double(exact.targetTimes.count),
            1.08,
            accuracy: 0.000_1)
    }

    func testRejectsInvalidOrUnderfilledWindows() {
        XCTAssertEqual(
            selector.select(
                timestamps: [0, 0.1, 0.2],
                shutterTime: 0.1),
            .failure(.insufficientCoverage))
        XCTAssertEqual(
            selector.select(
                timestamps: [0, 0.1, 0.2],
                shutterTime: .nan),
            .failure(.invalidTimestamp))
    }

    func testEnforcesTheMinimumUniqueMotionFrames() throws {
        let fifteenFPS = stride(
            from: 0.0,
            through: 2.0,
            by: 1 / 15.0
        ).map { $0 }
        XCTAssertGreaterThanOrEqual(
            try selector.select(
                timestamps: fifteenFPS,
                shutterTime: 1
            ).get().uniqueSourceFrameCount,
            8)

        let tenFPS = stride(
            from: 0.0,
            through: 2.0,
            by: 1 / 10.0
        ).map { $0 }
        XCTAssertEqual(
            selector.select(
                timestamps: tenFPS,
                shutterTime: 1),
            .failure(.insufficientUniqueFrames))
    }
}
