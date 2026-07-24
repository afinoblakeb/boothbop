#if DEBUG
import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation
import UIKit

enum BopFXLivingStripWriter {
    private static let aspectRatio = 2.5 / 7.0
    private static let width = 720
    private static let height = Int(
        (Double(width) / aspectRatio).rounded())
    private static let panelSide = 450
    private static let frameRate: Int32 = 15
    private static let frameCount = 30
    private static let clipFrameCount = 8
    private static let effects: [BopFXEffect] = [
        .spectralEcho,
        .funhouse,
        .spinCycle,
        .mirrorBloom,
    ]

    static func write(
        source: UIImage,
        renderer: BopFXRenderer,
        directory: URL
    ) throws -> URL {
        let clips = try renderClips(
            source: source,
            renderer: renderer)
        let outputURL = directory.appendingPathComponent(
            "living-strip.mp4")
        try? FileManager.default.removeItem(at: outputURL)

        let writer = try AVAssetWriter(
            outputURL: outputURL,
            fileType: .mp4)
        let input = AVAssetWriterInput(
            mediaType: .video,
            outputSettings: [
                AVVideoCodecKey: AVVideoCodecType.h264,
                AVVideoWidthKey: width,
                AVVideoHeightKey: height,
                AVVideoCompressionPropertiesKey: [
                    AVVideoAverageBitRateKey: 7_500_000,
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
                writer.error?.localizedDescription ??
                    "Could not start the Living Strip writer")
        }
        writer.startSession(atSourceTime: .zero)

        for index in 0..<frameCount {
            guard waitUntilReady(input: input, writer: writer),
                  let pool = adaptor.pixelBufferPool else {
                writer.cancelWriting()
                throw BopFXLivingWriterError.render(
                    "Living Strip writer stopped accepting frames")
            }
            var pixelBuffer: CVPixelBuffer?
            guard CVPixelBufferPoolCreatePixelBuffer(
                nil,
                pool,
                &pixelBuffer) == kCVReturnSuccess,
                let pixelBuffer,
                draw(
                    clips: clips,
                    frameIndex: index,
                    into: pixelBuffer),
                adaptor.append(
                    pixelBuffer,
                    withPresentationTime: CMTime(
                        value: Int64(index),
                        timescale: frameRate)) else {
                writer.cancelWriting()
                throw BopFXLivingWriterError.render(
                    writer.error?.localizedDescription ??
                        "Could not append a Living Strip frame")
            }
        }

        input.markAsFinished()
        let completed = DispatchSemaphore(value: 0)
        writer.finishWriting {
            completed.signal()
        }
        guard completed.wait(timeout: .now() + 30) == .success else {
            writer.cancelWriting()
            throw BopFXLivingWriterError.timeout
        }
        guard writer.status == .completed else {
            throw BopFXLivingWriterError.render(
                writer.error?.localizedDescription ??
                    "Living Strip writer did not complete")
        }
        return outputURL
    }

    private static func renderClips(
        source: UIImage,
        renderer: BopFXRenderer
    ) throws -> [[CGImage]] {
        var clips: [[CGImage]] = []
        for effect in effects {
            var frames: [CGImage] = []
            let rendered = renderer.renderAnimationFrames(
                source,
                effect: effect,
                frameCount: clipFrameCount,
                pixelSize: panelSide
            ) { frame, _ in
                frames.append(frame)
                return true
            }
            guard rendered, frames.count == clipFrameCount else {
                throw BopFXLivingWriterError.render(
                    "Could not render the \(effect.rawValue) Living Strip clip")
            }
            clips.append(frames)
        }
        return clips
    }

    private static func draw(
        clips: [[CGImage]],
        frameIndex: Int,
        into pixelBuffer: CVPixelBuffer
    ) -> Bool {
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        defer {
            CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        }
        guard clips.count == effects.count,
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
                    CGImageAlphaInfo.premultipliedFirst.rawValue |
                    CGBitmapInfo.byteOrder32Little.rawValue) else {
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
        for index in effects.indices {
            let clip = clips[index]
            guard !clip.isEmpty else { return false }
            let phaseOffset = index * 2
            let clipIndex =
                (frameIndex + phaseOffset) % clip.count
            let y = height - topInset - panelSide -
                index * (panelSide + gap)
            let rect = CGRect(
                x: x,
                y: y,
                width: panelSide,
                height: panelSide)
            context.setFillColor(CGColor(gray: 0.08, alpha: 1))
            context.fill(rect.insetBy(dx: -3, dy: -3))
            context.interpolationQuality = .high
            context.draw(clip[clipIndex], in: rect)
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
        writer: AVAssetWriter
    ) -> Bool {
        let deadline = Date().addingTimeInterval(5)
        while !input.isReadyForMoreMediaData,
              writer.status == .writing,
              Date() < deadline {
            Thread.sleep(forTimeInterval: 0.002)
        }
        return input.isReadyForMoreMediaData &&
            writer.status == .writing
    }
}

private enum BopFXLivingWriterError: LocalizedError {
    case setup(String)
    case render(String)
    case timeout

    var errorDescription: String? {
        switch self {
        case .setup(let message), .render(let message):
            return message
        case .timeout:
            return "Timed out while finishing the Living Strip fixture"
        }
    }
}
#endif
