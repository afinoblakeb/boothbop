import UIKit
import Capacitor
import Photos
import AVFoundation

private extension UIColor {
    static let boothBopCanvas = UIColor(
        red: 246.0 / 255.0,
        green: 246.0 / 255.0,
        blue: 244.0 / 255.0,
        alpha: 1.0)

    static let boothBopCream = UIColor(
        red: 246.0 / 255.0,
        green: 231.0 / 255.0,
        blue: 207.0 / 255.0,
        alpha: 1.0)
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    // UIScene lifecycle: hand each new session the default scene configuration
    // declared in Info.plist (UIApplicationSceneManifest).
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}

// Build the scene deterministically. Storyboard-driven scene creation can remove
// the launch screen before a root view is ready, exposing the window's black
// default during a cold WebKit startup.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let sceneWindow = UIWindow(windowScene: windowScene)
        sceneWindow.backgroundColor = .boothBopCream
        let launchViewController = UIStoryboard(
            name: "LaunchScreen", bundle: nil
        ).instantiateInitialViewController() ?? UIViewController()
        launchViewController.view.backgroundColor = .boothBopCream
        sceneWindow.rootViewController = launchViewController
        window = sceneWindow
        sceneWindow.makeKeyAndVisible()

        DispatchQueue.main.async {
            let rootViewController = BridgeViewController()
            rootViewController.loadViewIfNeeded()
            // Capacitor's SplashScreen plugin attaches its launch overlay on
            // the next main-loop turn. Keep the system launch controller
            // visible until that overlay exists, then swap without a gap.
            DispatchQueue.main.async {
                sceneWindow.rootViewController = rootViewController
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity) { _ in }
    }
}

// MARK: - BoothBopPhotos: a tiny local Capacitor plugin (PHPhotoLibrary)
//
// Saves photo strips / GIFs / videos into a dedicated "BoothBop" album (full
// access) or the camera roll (add-only). It's registered deterministically in
// BridgeViewController.capacitorDidLoad() below — NOT via SPM auto-registration,
// which silently failed to bind the third-party media plugin under Capacitor 8.
@objc(BoothBopPhotos)
public class BoothBopPhotos: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BoothBopPhotos"
    public let jsName = "BoothBopPhotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
    ]

    private static let albumName = "BoothBop"

    private func phLevel(_ s: String) -> PHAccessLevel {
        return s == "readWrite" ? .readWrite : .addOnly
    }

    private func statusString(_ s: PHAuthorizationStatus) -> String {
        switch s {
        case .authorized: return "granted"
        case .limited: return "limited"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "notDetermined"
        @unknown default: return "denied"
        }
    }

    private func isAuthorized(for level: PHAccessLevel) -> Bool {
        let s = PHPhotoLibrary.authorizationStatus(for: level)
        return s == .authorized || s == .limited
    }

    @objc func checkAccess(_ call: CAPPluginCall) {
        let level = phLevel(call.getString("level") ?? "addOnly")
        call.resolve(["status": statusString(PHPhotoLibrary.authorizationStatus(for: level))])
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        let level = phLevel(call.getString("level") ?? "addOnly")
        PHPhotoLibrary.requestAuthorization(for: level) { [weak self] status in
            call.resolve(["status": self?.statusString(status) ?? "denied"])
        }
    }

    // Open BoothBop's page in iOS Settings, so the user can change Photos access
    // when iOS won't re-prompt (already-denied / limited).
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                return call.reject("No settings URL")
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                call.resolve(["opened": opened])
            }
        }
    }

    private func findAlbum() -> PHAssetCollection? {
        let opts = PHFetchOptions()
        opts.predicate = NSPredicate(format: "title = %@", BoothBopPhotos.albumName)
        return PHAssetCollection.fetchAssetCollections(
            with: .album, subtype: .albumRegular, options: opts).firstObject
    }

    // Find or create the BoothBop album; hands the collection (or nil) to completion.
    private func ensureAlbum(_ completion: @escaping (PHAssetCollection?) -> Void) {
        if let existing = findAlbum() { completion(existing); return }
        var placeholder: PHObjectPlaceholder?
        PHPhotoLibrary.shared().performChanges({
            let req = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(
                withTitle: BoothBopPhotos.albumName)
            placeholder = req.placeholderForCreatedAssetCollection
        }, completionHandler: { success, _ in
            if success, let id = placeholder?.localIdentifier {
                completion(PHAssetCollection.fetchAssetCollections(
                    withLocalIdentifiers: [id], options: nil).firstObject)
            } else {
                completion(nil)
            }
        })
    }

    // save({ base64, type: "image"|"video", mime, album: bool })
    @objc func save(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
              let data = Data(base64Encoded: base64) else {
            return call.reject("base64 required/invalid", "argumentError")
        }
        let type = call.getString("type") ?? "image"
        let toAlbum = call.getBool("album") ?? false
        guard isAuthorized(for: toAlbum ? .readWrite : .addOnly) else {
            return call.reject("Photos access denied", "accessDenied")
        }

        // Video must be imported from a file URL, not raw data.
        var tempURL: URL?
        if type == "video" {
            let ext = (call.getString("mime") ?? "").contains("quicktime") ? "mov" : "mp4"
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString).appendingPathExtension(ext)
            do { try data.write(to: url) } catch {
                return call.reject("temp write failed", "filesystemError")
            }
            tempURL = url
        }

        let performSave: (PHAssetCollection?) -> Void = { collection in
            var placeholder: PHObjectPlaceholder?
            PHPhotoLibrary.shared().performChanges({
                let creation = PHAssetCreationRequest.forAsset()
                if type == "video", let url = tempURL {
                    let opts = PHAssetResourceCreationOptions()
                    opts.shouldMoveFile = true
                    creation.addResource(with: .video, fileURL: url, options: opts)
                } else {
                    creation.addResource(with: .photo, data: data, options: nil)
                }
                placeholder = creation.placeholderForCreatedAsset
                if let collection = collection, let ph = placeholder,
                   let albumChange = PHAssetCollectionChangeRequest(for: collection) {
                    albumChange.addAssets([ph] as NSArray)
                }
            }, completionHandler: { success, error in
                if let url = tempURL { try? FileManager.default.removeItem(at: url) }
                if success {
                    call.resolve(["assetId": placeholder?.localIdentifier ?? ""])
                } else {
                    call.reject(error?.localizedDescription ?? "save failed", "filesystemError")
                }
            })
        }

        if toAlbum {
            ensureAlbum { collection in
                guard let collection = collection else {
                    if let url = tempURL { try? FileManager.default.removeItem(at: url) }
                    return call.reject("Could not create the BoothBop album", "filesystemError")
                }
                performSave(collection)
            }
        } else {
            performSave(nil)
        }
    }
}

// MARK: - BoothBopVideo: assemble the 4 photos into an MP4 natively
//
// The web MediaRecorder/captureStream path records in real time (~5s) and is
// unreliable in the iOS WKWebView (it tends to only finish on a user gesture).
// AVAssetWriter encodes the held frames directly — sub-second, reliable, and
// any resolution — so the looping video is ready the instant capture finishes.
// Frames arrive already scaled + watermarked from JS (the paid-tier watermark
// flag stays in JS); this plugin only muxes them. Registered in code below.
@objc(BoothBopVideo)
public class BoothBopVideo: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BoothBopVideo"
    public let jsName = "BoothBopVideo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "make", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    private enum VideoError: Error { case decode, writer, append, cancelled }

    private final class VideoJob {
        private let lock = NSLock()
        private var cancelled = false
        private var writer: AVAssetWriter?
        private var outputURL: URL?

        var isCancelled: Bool {
            lock.lock()
            defer { lock.unlock() }
            return cancelled
        }

        func attach(writer: AVAssetWriter, outputURL: URL) -> Bool {
            lock.lock()
            defer { lock.unlock() }
            guard !cancelled else { return false }
            self.writer = writer
            self.outputURL = outputURL
            return true
        }

        func cancel() {
            lock.lock()
            cancelled = true
            let activeWriter = writer
            let activeOutputURL = outputURL
            lock.unlock()

            activeWriter?.cancelWriting()
            if let activeOutputURL {
                try? FileManager.default.removeItem(at: activeOutputURL)
            }
        }

        func clear() {
            lock.lock()
            writer = nil
            outputURL = nil
            lock.unlock()
        }
    }

    private let jobsLock = NSLock()
    private var jobs: [String: VideoJob] = [:]

    private func register(job: VideoJob, id: String) -> Bool {
        jobsLock.lock()
        defer { jobsLock.unlock() }
        guard jobs[id] == nil else { return false }
        jobs[id] = job
        return true
    }

    private func job(id: String) -> VideoJob? {
        jobsLock.lock()
        defer { jobsLock.unlock() }
        return jobs[id]
    }

    private func unregisterJob(id: String) {
        jobsLock.lock()
        let removed = jobs.removeValue(forKey: id)
        jobsLock.unlock()
        removed?.clear()
    }

    // make({ jobId, images: [base64 png], width, height, bitrate, frameMs, loops, fps }) -> { base64 }
    @objc func make(_ call: CAPPluginCall) {
        guard let jobId = call.getString("jobId"), !jobId.isEmpty else {
            return call.reject("jobId required", "argumentError")
        }
        let images = call.getArray("images", String.self) ?? []
        guard !images.isEmpty else {
            return call.reject("No frames provided", "argumentError")
        }
        let size = call.getInt("size") ?? 720
        let width = call.getInt("width") ?? size
        let height = call.getInt("height") ?? size
        guard width > 0, height > 0 else {
            return call.reject("Video dimensions must be positive", "argumentError")
        }
        let bitrate = call.getInt("bitrate") ?? 6_000_000
        let frameMs = call.getInt("frameMs") ?? 600
        let loops = max(1, call.getInt("loops") ?? 2)
        let fps = max(1, call.getInt("fps") ?? 30)
        let videoJob = VideoJob()
        guard register(job: videoJob, id: jobId) else {
            return call.reject("Duplicate jobId", "argumentError")
        }

        DispatchQueue.global(qos: .userInitiated).async {
            defer { self.unregisterJob(id: jobId) }
            do {
                let data = try self.renderMP4(
                    images: images, width: width, height: height, bitrate: bitrate,
                    frameMs: frameMs, loops: loops, fps: fps, job: videoJob)
                guard !videoJob.isCancelled else {
                    return call.reject("Video render cancelled", "cancelled")
                }
                call.resolve(["base64": data.base64EncodedString()])
            } catch {
                if videoJob.isCancelled {
                    return call.reject("Video render cancelled", "cancelled")
                }
                call.reject("Video render failed: \(error.localizedDescription)", "renderError")
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard let jobId = call.getString("jobId"), !jobId.isEmpty else {
            return call.reject("jobId required", "argumentError")
        }
        guard let videoJob = job(id: jobId) else {
            return call.resolve(["cancelled": false])
        }
        videoJob.cancel()
        call.resolve(["cancelled": true])
    }

    private func renderMP4(
        images: [String], width: Int, height: Int, bitrate: Int,
        frameMs: Int, loops: Int, fps: Int, job: VideoJob
    ) throws -> Data {
        guard !job.isCancelled else { throw VideoError.cancelled }
        let outURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("boothbop-\(UUID().uuidString).mp4")
        try? FileManager.default.removeItem(at: outURL)
        defer { try? FileManager.default.removeItem(at: outURL) }

        let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
        guard job.attach(writer: writer, outputURL: outURL) else {
            writer.cancelWriting()
            throw VideoError.cancelled
        }
        writer.shouldOptimizeForNetworkUse = true
        let framesPerPhoto = max(1, Int((Double(frameMs) / 1000.0 * Double(fps)).rounded()))
        let compression: [String: Any] = [
            AVVideoAverageBitRateKey: bitrate,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC,
            AVVideoExpectedSourceFrameRateKey: fps,
            AVVideoMaxKeyFrameIntervalKey: framesPerPhoto,
            AVVideoAllowFrameReorderingKey: false
        ]
        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoColorPropertiesKey: [
                AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
            ],
            AVVideoCompressionPropertiesKey: compression
        ]
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = false
        input.mediaTimeScale = CMTimeScale(fps)
        let attrs: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
            kCVPixelBufferIOSurfacePropertiesKey as String: [:]
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input, sourcePixelBufferAttributes: attrs)
        guard writer.canAdd(input) else { throw VideoError.writer }
        writer.add(input)
        guard writer.startWriting() else { throw writer.error ?? VideoError.writer }
        writer.startSession(atSourceTime: .zero)
        guard let pixelBufferPool = adaptor.pixelBufferPool else { throw VideoError.writer }

        let timescale = CMTimeScale(fps)
        var frameIndex: Int64 = 0
        let appendDeadline = Date().addingTimeInterval(15)

        for _ in 0..<loops {
            for image in images {
                guard !job.isCancelled else { throw VideoError.cancelled }
                // Keep only the current decoded pixel buffer resident. The
                // encoded PNG strings are cheap to retain, while four 1080p
                // BGRA buffers would consume roughly 33 MB before AVFoundation
                // allocates its own working surfaces.
                try autoreleasepool {
                    let buffer = try self.pixelBuffer(
                        fromBase64: image, width: width, height: height,
                        pool: pixelBufferPool)
                    for _ in 0..<framesPerPhoto {
                        guard !job.isCancelled else { throw VideoError.cancelled }
                        while !input.isReadyForMoreMediaData {
                            if job.isCancelled { throw VideoError.cancelled }
                            if writer.status == .failed || writer.status == .cancelled
                                || Date() >= appendDeadline {
                                writer.cancelWriting()
                                throw writer.error ?? VideoError.writer
                            }
                            usleep(2000)
                        }
                        let time = CMTime(value: frameIndex, timescale: timescale)
                        if !adaptor.append(buffer, withPresentationTime: time) {
                            throw writer.error ?? VideoError.append
                        }
                        frameIndex += 1
                    }
                }
            }
        }

        guard !job.isCancelled else { throw VideoError.cancelled }
        input.markAsFinished()
        let sem = DispatchSemaphore(value: 0)
        writer.finishWriting { sem.signal() }
        let finishDeadline = Date().addingTimeInterval(15)
        while sem.wait(timeout: .now() + 0.05) == .timedOut {
            if job.isCancelled {
                writer.cancelWriting()
                throw VideoError.cancelled
            }
            if Date() >= finishDeadline {
                writer.cancelWriting()
                throw VideoError.writer
            }
        }
        guard !job.isCancelled else { throw VideoError.cancelled }
        guard writer.status == .completed else { throw writer.error ?? VideoError.writer }

        let data = try Data(contentsOf: outURL)
        return data
    }

    private func pixelBuffer(
        fromBase64 base64: String, width: Int, height: Int, pool: CVPixelBufferPool
    ) throws -> CVPixelBuffer {
        // Tolerate an optional "data:...;base64," prefix.
        let raw = base64.contains(",") ? String(base64.split(separator: ",").last ?? "") : base64
        guard let data = Data(base64Encoded: raw),
              let image = UIImage(data: data)?.cgImage else {
            throw VideoError.decode
        }

        var pb: CVPixelBuffer?
        let status = CVPixelBufferPoolCreatePixelBuffer(
            kCFAllocatorDefault, pool, &pb)
        guard status == kCVReturnSuccess, let buffer = pb else { throw VideoError.decode }

        CVBufferSetAttachment(
            buffer, kCVImageBufferColorPrimariesKey,
            kCVImageBufferColorPrimaries_ITU_R_709_2, .shouldPropagate)
        CVBufferSetAttachment(
            buffer, kCVImageBufferTransferFunctionKey,
            kCVImageBufferTransferFunction_sRGB, .shouldPropagate)
        CVBufferSetAttachment(
            buffer, kCVImageBufferYCbCrMatrixKey,
            kCVImageBufferYCbCrMatrix_ITU_R_709_2, .shouldPropagate)

        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
        guard let ctx = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: width, height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpace(name: CGColorSpace.sRGB)!,
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
                | CGBitmapInfo.byteOrder32Little.rawValue
        ) else { throw VideoError.decode }

        ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        return buffer
    }
}

// Custom bridge VC: registers our local plugins in code so they never depend on
// the SPM auto-registration path that failed for the third-party plugin.
class BridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .boothBopCanvas
        webView?.isOpaque = false
        webView?.backgroundColor = .boothBopCanvas
        webView?.scrollView.backgroundColor = .boothBopCanvas
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BoothBopPhotos())
        bridge?.registerPluginInstance(BoothBopVideo())
    }
}
