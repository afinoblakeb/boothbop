#if DEBUG
import AVFoundation
import CoreVideo
import Foundation
import UIKit

enum BopFXLabVideoWriter {
    private static let dimension = 720
    private static let frameRate: Int32 = 15
    private static let frameCount = 30

    static func write(
        source: UIImage,
        renderer: BopFXRenderer,
        effect: BopFXEffect,
        directory: URL
    ) throws -> URL {
        let outputURL = directory.appendingPathComponent(
            "\(effect.rawValue).mp4")
        try? FileManager.default.removeItem(at: outputURL)

        let writer = try AVAssetWriter(
            outputURL: outputURL,
            fileType: .mp4)
        let input = AVAssetWriterInput(
            mediaType: .video,
            outputSettings: [
                AVVideoCodecKey: AVVideoCodecType.h264,
                AVVideoWidthKey: dimension,
                AVVideoHeightKey: dimension,
                AVVideoCompressionPropertiesKey: [
                    AVVideoAverageBitRateKey: 4_000_000,
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
                kCVPixelBufferWidthKey as String: dimension,
                kCVPixelBufferHeightKey as String: dimension,
                kCVPixelBufferIOSurfacePropertiesKey as String: [:],
            ])

        guard writer.canAdd(input) else {
            throw WriterError.setup("Video input is unsupported")
        }
        writer.add(input)
        guard writer.startWriting() else {
            throw WriterError.setup(
                writer.error?.localizedDescription ??
                    "Could not start the video writer")
        }
        writer.startSession(atSourceTime: .zero)

        let rendered = renderer.renderAnimationFrames(
            source,
            effect: effect,
            frameCount: frameCount,
            pixelSize: dimension
        ) { frame, index in
            guard waitUntilReady(input: input, writer: writer),
                  let pool = adaptor.pixelBufferPool else { return false }
            var pixelBuffer: CVPixelBuffer?
            guard CVPixelBufferPoolCreatePixelBuffer(
                nil,
                pool,
                &pixelBuffer) == kCVReturnSuccess,
                let pixelBuffer,
                draw(frame, into: pixelBuffer) else { return false }
            return adaptor.append(
                pixelBuffer,
                withPresentationTime: CMTime(
                    value: Int64(index),
                    timescale: frameRate))
        }

        guard rendered else {
            input.markAsFinished()
            writer.cancelWriting()
            throw WriterError.render(
                writer.error?.localizedDescription ??
                    "Could not render every animation frame")
        }

        input.markAsFinished()
        let completed = DispatchSemaphore(value: 0)
        writer.finishWriting {
            completed.signal()
        }
        guard completed.wait(timeout: .now() + 30) == .success else {
            writer.cancelWriting()
            throw WriterError.timeout
        }
        guard writer.status == .completed else {
            throw WriterError.render(
                writer.error?.localizedDescription ??
                    "Video writer did not complete")
        }
        return outputURL
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
        return input.isReadyForMoreMediaData && writer.status == .writing
    }

    private static func draw(
        _ image: CGImage,
        into pixelBuffer: CVPixelBuffer
    ) -> Bool {
        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        defer {
            CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        }
        guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer),
              let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(
                data: baseAddress,
                width: dimension,
                height: dimension,
                bitsPerComponent: 8,
                bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
                space: colorSpace,
                bitmapInfo:
                    CGImageAlphaInfo.premultipliedFirst.rawValue |
                    CGBitmapInfo.byteOrder32Little.rawValue) else {
            return false
        }
        context.setFillColor(CGColor(gray: 0, alpha: 1))
        context.fill(
            CGRect(x: 0, y: 0, width: dimension, height: dimension))
        context.interpolationQuality = .high
        context.draw(
            image,
            in: CGRect(x: 0, y: 0, width: dimension, height: dimension))
        return true
    }
}

private enum WriterError: LocalizedError {
    case setup(String)
    case render(String)
    case timeout

    var errorDescription: String? {
        switch self {
        case .setup(let message), .render(let message):
            return message
        case .timeout:
            return "Timed out while finishing the lab recording"
        }
    }
}
#endif
