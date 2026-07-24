import XCTest

@testable import CameraCore

final class LivingFrameWindowSelectorTests: XCTestCase {
    private let selector = LivingFrameWindowSelector()

    func testDefaultsRequireARealHalfSecondMotionWindow() {
        let configuration = LivingFrameWindowConfiguration()

        XCTAssertGreaterThanOrEqual(
            configuration.minimumUniqueFrames,
            12)
        XCTAssertLessThanOrEqual(
            configuration.maximumSampleDistance,
            1.0 / 24.0)
        XCTAssertLessThanOrEqual(
            configuration.coverageTolerance,
            1.0 / 48.0)
    }

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
                12)
            XCTAssertTrue(
                selection.sourceIndices.allSatisfy(
                    timestamps.indices.contains))
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

    func testHandlesJitterAndDroppedFramesAtCommonCaptureRates() throws {
        let droppedIndicesByRate: [Int: Set<Int>] = [
            24: [24],
            30: [27, 34],
            60: [51, 58, 67, 72],
        ]

        for frameRate in [24, 30, 60] {
            let droppedIndices = droppedIndicesByRate[frameRate] ?? []
            let timestamps = (0...(frameRate * 2)).compactMap {
                index -> Double? in
                if droppedIndices.contains(index) {
                    return nil
                }
                let jitter =
                    index.isMultiple(of: 2)
                    ? 0.002
                    : -0.0015
                return Double(index) / Double(frameRate) + jitter
            }
            let selection = try selector.select(
                timestamps: timestamps,
                shutterTime: 1
            ).get()

            XCTAssertEqual(
                selection.sourceIndices.count,
                15,
                "Unexpected target count at \(frameRate) FPS")
            XCTAssertGreaterThanOrEqual(
                selection.uniqueSourceFrameCount,
                12,
                "Quality floor failed at \(frameRate) FPS")
        }
    }

    func testRejectsAThreeHundredSixtySevenMillisecondSpanAsCoverage() {
        let compressedWindow = (0..<12).map {
            0.816_666_5 + Double($0) / 30
        }

        XCTAssertEqual(
            selector.select(
                timestamps: compressedWindow,
                shutterTime: 1),
            .failure(.insufficientCoverage))
    }

    func testRejectsALargeSampleHoleEvenWhenEndpointsCoverTheWindow() {
        let timestamps = (0...60).compactMap {
            index -> Double? in
            if (27...33).contains(index) {
                return nil
            }
            return Double(index) / 30
        }

        XCTAssertEqual(
            selector.select(
                timestamps: timestamps,
                shutterTime: 1),
            .failure(.sampleGap))
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
        let twentyFourFPS = stride(
            from: 0.0,
            through: 2.0,
            by: 1 / 24.0
        ).map { $0 }
        XCTAssertGreaterThanOrEqual(
            try selector.select(
                timestamps: twentyFourFPS,
                shutterTime: 1
            ).get().uniqueSourceFrameCount,
            12)

        let twentyFPS = stride(
            from: 0.0,
            through: 2.0,
            by: 1 / 20.0
        ).map { $0 }
        XCTAssertEqual(
            selector.select(
                timestamps: twentyFPS,
                shutterTime: 1),
            .failure(.insufficientUniqueFrames))
    }
}
