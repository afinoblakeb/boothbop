#if DEBUG
import AVFoundation
import CoreGraphics
import CoreImage
import CoreVideo
import Foundation
import UIKit

struct BopFXLivingClip {
    let descriptor: LivingStripClipDescriptor
    let frames: [CGImage]
}

final class BopFXLivingCancellationToken {
    private let lock = NSLock()
    private var cancelled = false
    private var activeWriter: AVAssetWriter?

    var isCancelled: Bool {
        lock.lock()
        defer { lock.unlock() }
        return cancelled
    }

    func cancel() {
        let writer: AVAssetWriter?
        lock.lock()
        cancelled = true
        writer = activeWriter
        activeWriter = nil
        lock.unlock()
        writer?.cancelWriting()
    }

    func check(
        absoluteDeadline: Date? = nil
    ) throws {
        if let absoluteDeadline,
            Date() >= absoluteDeadline
        {
            throw BopFXLivingWriterError.timeout
        }
        guard !isCancelled else {
            throw BopFXLivingWriterError.cancelled
        }
    }

    func register(_ writer: AVAssetWriter) throws {
        lock.lock()
        defer { lock.unlock() }
        guard !cancelled else {
            throw BopFXLivingWriterError.cancelled
        }
        activeWriter = writer
    }

    func unregister(_ writer: AVAssetWriter) {
        lock.lock()
        defer { lock.unlock() }
        guard activeWriter === writer else { return }
        activeWriter = nil
    }
}

final class BopFXLivingClipBuilder {
    private static let panelSide = 450

    private let context: CIContext

    init(renderer: BopFXRenderer) {
        context = CIContext(
            mtlDevice: renderer.device,
            options: [
                .cacheIntermediates: false,
                .workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)
                    as Any,
            ])
    }

    func normalize(
        shot: BopFXLivingShot,
        cancellation: BopFXLivingCancellationToken? = nil,
        absoluteDeadline: Date? = nil
    ) throws -> BopFXLivingClip {
        let outputBounds = CGRect(
            x: 0,
            y: 0,
            width: Self.panelSide,
            height: Self.panelSide)
        let images = try shot.frames.map { frame in
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            let image = CIImage(
                cvPixelBuffer: frame.pixelBuffer)
            let side = min(
                image.extent.width,
                image.extent.height)
            guard side > 0 else {
                throw BopFXLivingWriterError.render(
                    "Living Strip received an empty camera frame")
            }
            let crop = CGRect(
                x: image.extent.midX - side / 2,
                y: image.extent.midY - side / 2,
                width: side,
                height: side)
            let normalized =
                image
                .cropped(to: crop)
                .transformed(
                    by: CGAffineTransform(
                        translationX: -crop.minX,
                        y: -crop.minY)
                )
                .transformed(
                    by: CGAffineTransform(
                        scaleX: CGFloat(Self.panelSide) / side,
                        y: CGFloat(Self.panelSide) / side))
            guard
                let rendered = context.createCGImage(
                    normalized,
                    from: outputBounds)
            else {
                throw BopFXLivingWriterError.render(
                    "Living Strip could not normalize a camera frame")
            }
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            return rendered
        }
        return BopFXLivingClip(
            descriptor: shot.playbackDescriptor,
            frames: images)
    }

    func apply(
        effect: BopFXEffect,
        tuning: BopFXTuning,
        to clip: BopFXLivingClip,
        renderer: BopFXRenderer,
        cancellation: BopFXLivingCancellationToken? = nil,
        absoluteDeadline: Date? = nil
    ) throws -> BopFXLivingClip {
        guard effect != .original || !tuning.isNeutral else {
            return clip
        }
        let frameCount = max(1, clip.frames.count)
        let images = try clip.frames.enumerated().map {
            index,
            frame in
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            let phase = CGFloat(index) / CGFloat(frameCount)
            guard
                let rendered = renderer.renderStillImage(
                    UIImage(cgImage: frame),
                    effect: effect,
                    phase: phase,
                    tuning: tuning),
                let image = rendered.cgImage
            else {
                throw BopFXLivingWriterError.render(
                    "Living Strip could not render the selected effect")
            }
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            return image
        }
        return BopFXLivingClip(
            descriptor: clip.descriptor,
            frames: images)
    }
}

enum BopFXLivingStripWriter {
    private static let aspectRatio = 2.5 / 7.0
    private static let width = 720
    private static let height = Int(
        (Double(width) / aspectRatio).rounded())
    private static let panelSide = 450
    private static let frameRate: Int32 = 30
    private static let clipFrameCount = 15
    private static let effects: [BopFXEffect] = [
        .spectralEcho,
        .funhouse,
        .spinCycle,
        .mirrorBloom,
    ]

    static func write(
        source: UIImage,
        renderer: BopFXRenderer,
        directory: URL,
        cancellation: BopFXLivingCancellationToken? = nil
    ) throws -> URL {
        let absoluteDeadline = Date().addingTimeInterval(30)
        try cancellation?.check(absoluteDeadline: absoluteDeadline)
        let clips = try renderClips(
            source: source,
            renderer: renderer,
            cancellation: cancellation,
            absoluteDeadline: absoluteDeadline)
        return try write(
            clips: clips,
            directory: directory,
            cancellation: cancellation,
            absoluteDeadline: absoluteDeadline)
    }

    static func write(
        clips: [BopFXLivingClip],
        directory: URL,
        cancellation: BopFXLivingCancellationToken? = nil,
        absoluteDeadline: Date? = nil
    ) throws -> URL {
        let absoluteDeadline =
            absoluteDeadline ?? Date().addingTimeInterval(30)
        try cancellation?.check(absoluteDeadline: absoluteDeadline)
        let plan: LivingStripPlaybackPlan
        do {
            plan = try LivingStripPlaybackPlan(
                clips: clips.map(\.descriptor),
                outputFrameRate: Int(frameRate))
        } catch {
            throw BopFXLivingWriterError.setup(
                "Living Strip received an invalid four-shot capture sequence")
        }
        guard
            zip(clips, plan.clips).allSatisfy({
                $0.frames.count == $1.sourceTimes.count
            })
        else {
            throw BopFXLivingWriterError.setup(
                "Living Strip clip pixels do not match their capture timelines")
        }
        let outputURL = directory.appendingPathComponent(
            "living-strip.mp4")
        try? FileManager.default.removeItem(at: outputURL)

        let writer = try AVAssetWriter(
            outputURL: outputURL,
            fileType: .mp4)
        try cancellation?.register(writer)
        defer {
            cancellation?.unregister(writer)
        }
        let input = AVAssetWriterInput(
            mediaType: .video,
            outputSettings: [
                AVVideoCodecKey: AVVideoCodecType.h264,
                AVVideoWidthKey: width,
                AVVideoHeightKey: height,
                AVVideoCompressionPropertiesKey: [
                    AVVideoAverageBitRateKey: 10_000_000,
                    AVVideoProfileLevelKey:
                        AVVideoProfileLevelH264HighAutoLevel,
                ],
            ])
        input.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input,
            sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String:
                    Int(kCVPixelFormatType_32BGRA),
                kCVPixelBufferWidthKey as String: width,
                kCVPixelBufferHeightKey as String: height,
                kCVPixelBufferIOSurfacePropertiesKey as String: [:],
            ])

        guard writer.canAdd(input) else {
            throw BopFXLivingWriterError.setup(
                "Living Strip video input is unsupported")
        }
        writer.add(input)
        guard writer.startWriting() else {
            throw BopFXLivingWriterError.setup(
                writer.error?.localizedDescription ?? "Could not start the Living Strip writer")
        }
        writer.startSession(atSourceTime: .zero)

        for index in 0..<plan.outputFrameCount {
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            guard
                waitUntilReady(
                    input: input,
                    writer: writer,
                    cancellation: cancellation,
                    absoluteDeadline: absoluteDeadline),
                let pool = adaptor.pixelBufferPool
            else {
                writer.cancelWriting()
                try cancellation?.check(
                    absoluteDeadline: absoluteDeadline)
                guard Date() < absoluteDeadline else {
                    throw BopFXLivingWriterError.timeout
                }
                throw BopFXLivingWriterError.render(
                    "Living Strip writer stopped accepting frames")
            }
            var pixelBuffer: CVPixelBuffer?
            guard
                CVPixelBufferPoolCreatePixelBuffer(
                    nil,
                    pool,
                    &pixelBuffer) == kCVReturnSuccess,
                let pixelBuffer,
                draw(
                    clips: clips,
                    plan: plan,
                    outputFrameIndex: index,
                    into: pixelBuffer),
                adaptor.append(
                    pixelBuffer,
                    withPresentationTime: CMTime(
                        value: Int64(index),
                        timescale: frameRate))
            else {
                writer.cancelWriting()
                throw BopFXLivingWriterError.render(
                    writer.error?.localizedDescription ?? "Could not append a Living Strip frame")
            }
        }

        input.markAsFinished()
        let completed = DispatchSemaphore(value: 0)
        writer.finishWriting {
            completed.signal()
        }
        let remainingMilliseconds = max(
            0,
            Int(
                (absoluteDeadline.timeIntervalSinceNow * 1_000)
                    .rounded(.up)))
        guard
            completed.wait(
                timeout: .now()
                    + .milliseconds(remainingMilliseconds)) == .success
        else {
            writer.cancelWriting()
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            throw BopFXLivingWriterError.timeout
        }
        try cancellation?.check(
            absoluteDeadline: absoluteDeadline)
        guard writer.status == .completed else {
            throw BopFXLivingWriterError.render(
                writer.error?.localizedDescription ?? "Living Strip writer did not complete")
        }
        return outputURL
    }

    private static func renderClips(
        source: UIImage,
        renderer: BopFXRenderer,
        cancellation: BopFXLivingCancellationToken?,
        absoluteDeadline: Date?
    ) throws -> [BopFXLivingClip] {
        var clips: [BopFXLivingClip] = []
        for (index, effect) in effects.enumerated() {
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            var frames: [CGImage] = []
            let rendered = renderer.renderAnimationFrames(
                source,
                effect: effect,
                frameCount: clipFrameCount,
                pixelSize: panelSide
            ) { frame, _ in
                guard cancellation?.isCancelled != true else {
                    return false
                }
                frames.append(frame)
                return true
            }
            guard rendered, frames.count == clipFrameCount else {
                throw BopFXLivingWriterError.render(
                    "Could not render the \(effect.rawValue) Living Strip clip")
            }
            try cancellation?.check(
                absoluteDeadline: absoluteDeadline)
            let baseTime = Double(index) * 2
            let sourceTimes = frames.indices.map {
                baseTime + Double($0) / Double(frameRate)
            }
            let shutterFrameIndex = frames.count / 2
            clips.append(
                BopFXLivingClip(
                    descriptor: LivingStripClipDescriptor(
                        captureID: Int64(index + 1),
                        generation: 1,
                        shutterTime:
                            sourceTimes[shutterFrameIndex],
                        sourceTimes: sourceTimes),
                    frames: frames))
        }
        return clips
    }

    private static func draw(
        clips: [BopFXLivingClip],
        plan: LivingStripPlaybackPlan,
        outputFrameIndex: Int,
        into pixelBuffer: CVPixelBuffer
    ) -> Bool {
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        defer {
            CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        }
        guard clips.count == plan.panelCount,
            let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer),
            let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
            let context = CGContext(
                data: baseAddress,
                width: width,
                height: height,
                bitsPerComponent: 8,
                bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
                space: colorSpace,
                bitmapInfo:
                    CGImageAlphaInfo.premultipliedFirst.rawValue
                    | CGBitmapInfo.byteOrder32Little.rawValue)
        else {
            return false
        }

        let canvas = CGRect(
            x: 0,
            y: 0,
            width: width,
            height: height)
        context.setFillColor(
            CGColor(
                red: 0.965,
                green: 0.965,
                blue: 0.955,
                alpha: 1))
        context.fill(canvas)

        let gap = 18
        let topInset = 30
        let x = (width - panelSide) / 2
        for index in clips.indices {
            let clip = clips[index]
            guard
                let clipIndex = plan.sourceFrameIndex(
                    panelIndex: index,
                    outputFrameIndex: outputFrameIndex)
            else {
                return false
            }
            let y = height - topInset - panelSide - index * (panelSide + gap)
            let rect = CGRect(
                x: x,
                y: y,
                width: panelSide,
                height: panelSide)
            context.setFillColor(CGColor(gray: 0.08, alpha: 1))
            context.fill(rect.insetBy(dx: -3, dy: -3))
            context.interpolationQuality = .high
            context.draw(clip.frames[clipIndex], in: rect)
        }

        let footerY = 34
        context.setFillColor(
            CGColor(
                red: 1,
                green: 0.32,
                blue: 0.08,
                alpha: 1))
        context.fill(
            CGRect(
                x: width / 2 - 44,
                y: footerY + 32,
                width: 88,
                height: 8))
        context.setFillColor(CGColor(gray: 0.1, alpha: 1))
        context.fill(
            CGRect(
                x: width / 2 - 68,
                y: footerY,
                width: 136,
                height: 24))
        return true
    }

    private static func waitUntilReady(
        input: AVAssetWriterInput,
        writer: AVAssetWriter,
        cancellation: BopFXLivingCancellationToken?,
        absoluteDeadline: Date
    ) -> Bool {
        while !input.isReadyForMoreMediaData,
            writer.status == .writing,
            cancellation?.isCancelled != true,
            Date() < absoluteDeadline
        {
            Thread.sleep(forTimeInterval: 0.002)
        }
        return input.isReadyForMoreMediaData
            && writer.status == .writing
            && cancellation?.isCancelled != true
    }
}

private enum BopFXLivingWriterError: LocalizedError {
    case setup(String)
    case render(String)
    case timeout
    case cancelled

    var errorDescription: String? {
        switch self {
        case .setup(let message), .render(let message):
            return message
        case .timeout:
            return "Timed out while finishing the Living Strip fixture"
        case .cancelled:
            return "Living Strip processing was cancelled"
        }
    }
}
#endif
