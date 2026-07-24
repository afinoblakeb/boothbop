import AVFoundation
import Capacitor
import CoreImage
import Photos
import UIKit

#if DEBUG
import AVKit

private final class BopFXLivingPlayerViewController:
    AVPlayerViewController
{
    var onDismiss: (() -> Void)?

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        onDismiss?()
    }
}
#endif

extension UIColor {
    fileprivate static let boothBopCanvas = UIColor(
        red: 244.0 / 255.0,
        green: 245.0 / 255.0,
        blue: 245.0 / 255.0,
        alpha: 1.0)
    fileprivate static let boothBopAccent = UIColor(
        red: 242.0 / 255.0,
        green: 85.0 / 255.0,
        blue: 34.0 / 255.0,
        alpha: 1.0)
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        return true
    }

    // UIScene lifecycle: hand each new session the default scene configuration
    // declared in Info.plist (UIApplicationSceneManifest).
    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        return UISceneConfiguration(
            name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}

// Build the scene deterministically. Storyboard-driven scene creation can remove
// the launch screen before a root view is ready, exposing the window's black
// default during a cold WebKit startup.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?
    private var launchOverlay: UIView?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let sceneWindow = UIWindow(windowScene: windowScene)
        sceneWindow.backgroundColor = .boothBopCanvas
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--bopfx-fixture") {
            install(
                BopFXFixtureViewController(),
                in: sceneWindow)
            return
        }
        #endif
        let rootViewController = BridgeViewController()
        rootViewController.loadViewIfNeeded()
        rootViewController.view.backgroundColor = .boothBopCanvas

        let launchViewController =
            UIStoryboard(
                name: "LaunchScreen", bundle: nil
            ).instantiateInitialViewController() ?? UIViewController()
        launchViewController.loadViewIfNeeded()
        launchViewController.view.backgroundColor = .boothBopCanvas
        let launchOverlay = launchViewController.view!
        launchOverlay.frame = rootViewController.view.bounds
        launchOverlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        rootViewController.view.addSubview(launchOverlay)
        self.launchOverlay = launchOverlay

        install(
            rootViewController,
            in: sceneWindow)
    }

    private func install(
        _ rootViewController: UIViewController,
        in sceneWindow: UIWindow
    ) {
        sceneWindow.rootViewController = rootViewController
        window = sceneWindow
        sceneWindow.makeKeyAndVisible()
    }

    func hideLaunchOverlay() {
        dispatchPrecondition(condition: .onQueue(.main))
        guard let launchOverlay else { return }
        self.launchOverlay = nil
        UIView.animate(
            withDuration: 0.15,
            animations: { launchOverlay.alpha = 0 },
            completion: { _ in launchOverlay.removeFromSuperview() }
        )
    }

    func scene(_ scene: UIScene, openURLContexts urlContexts: Set<UIOpenURLContext>) {
        guard let url = urlContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared, continue: userActivity
        ) { _ in }
    }
}

// MARK: - BoothBopLaunch
//
// UIKit owns the launch cover until the web app confirms that either the live
// camera or a recoverable error surface has painted. This avoids exposing the
// black WKWebView/native-preview handoff during a cold WebKit start.
@objc(BoothBopLaunch)
public class BoothBopLaunch: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BoothBopLaunch"
    public let jsName = "BoothBopLaunch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise)
    ]

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            for sceneDelegate in UIApplication.shared.connectedScenes
                .compactMap({ $0.delegate as? SceneDelegate })
            {
                sceneDelegate.hideLaunchOverlay()
            }
            call.resolve()
        }
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
            with: .album, subtype: .albumRegular, options: opts
        ).firstObject
    }

    // Find or create the BoothBop album; hands the collection (or nil) to completion.
    private func ensureAlbum(_ completion: @escaping (PHAssetCollection?) -> Void) {
        if let existing = findAlbum() {
            completion(existing)
            return
        }
        var placeholder: PHObjectPlaceholder?
        PHPhotoLibrary.shared().performChanges(
            {
                let req = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(
                    withTitle: BoothBopPhotos.albumName)
                placeholder = req.placeholderForCreatedAssetCollection
            },
            completionHandler: { success, _ in
                if success, let id = placeholder?.localIdentifier {
                    completion(
                        PHAssetCollection.fetchAssetCollections(
                            withLocalIdentifiers: [id], options: nil
                        ).firstObject)
                } else {
                    completion(nil)
                }
            })
    }

    // save({ base64, type: "image"|"video", mime, album: bool })
    @objc func save(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
            let data = Data(base64Encoded: base64)
        else {
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
            PHPhotoLibrary.shared().performChanges(
                {
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
                        let albumChange = PHAssetCollectionChangeRequest(for: collection)
                    {
                        albumChange.addAssets([ph] as NSArray)
                    }
                },
                completionHandler: { success, error in
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

// MARK: - BoothBopCamera: native full-resolution front-camera capture
//
// The web camera path can only copy a frame from WebKit's video stream. This
// plugin keeps preview and still capture in one AVCaptureSession so iOS can use
// its native focus, exposure, white-balance, and photo-processing pipeline.
@objc(BoothBopCamera)
public class BoothBopCamera: CAPPlugin, CAPBridgedPlugin,
    AVCaptureVideoDataOutputSampleBufferDelegate, AVCapturePhotoCaptureDelegate,
    AVCaptureMetadataOutputObjectsDelegate
{
    public let identifier = "BoothBopCamera"
    public let jsName = "BoothBopCamera"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "bopFXCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBopFX", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPreviewFrame", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "capture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishShutterFreeze", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "release", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private enum CameraError: LocalizedError {
        case unavailable
        case accessDenied
        case configuration(String)
        case startTimedOut

        var errorDescription: String? {
            switch self {
            case .unavailable:
                return "The front camera is unavailable"
            case .accessDenied:
                return "Camera access was denied"
            case .configuration(let message):
                return message
            case .startTimedOut:
                return "The camera did not produce a frame in time"
            }
        }
    }

    private struct CapturedPhoto {
        let fileURL: URL
        let width: Int
        let height: Int
    }

    #if DEBUG
    private struct LivingCaptureStyle {
        let effect: BopFXEffect
        let tuning: BopFXTuning
    }
    #endif

    private let sessionQueue = DispatchQueue(
        label: "com.boothbop.camera.session", qos: .userInitiated)
    private let sampleQueue = DispatchQueue(
        label: "com.boothbop.camera.samples", qos: .userInitiated)
    private let photoProcessingQueue = DispatchQueue(
        label: "com.boothbop.camera.photo-processing",
        qos: .userInitiated)
    private let metadataQueue = DispatchQueue(
        label: "com.boothbop.camera.metadata", qos: .userInteractive)
    #if DEBUG
    private let livingNormalizationQueue = DispatchQueue(
        label: "com.boothbop.camera.living-normalization",
        qos: .userInitiated,
        attributes: .concurrent)
    private let livingProcessingQueue = DispatchQueue(
        label: "com.boothbop.camera.living-processing",
        qos: .userInitiated)
    private let livingCleanupQueue = DispatchQueue(
        label: "com.boothbop.camera.living-cleanup",
        qos: .utility)
    private static let livingMotionWindowTimeout: TimeInterval = 1.5
    private static let livingProcessingTimeout: TimeInterval = 30
    private let livingPipeline: (renderer: BopFXRenderer, builder: BopFXLivingClipBuilder)? = {
        guard let renderer = BopFXRenderer() else { return nil }
        return (
            renderer,
            BopFXLivingClipBuilder(renderer: renderer)
        )
    }()
    #endif
    private let previewImageContext = CIContext(options: [
        .cacheIntermediates: false
    ])
    private let bopFXStillRenderer = BopFXRenderer()

    // All capture state below is owned by sessionQueue.
    private var session: AVCaptureSession?
    private var nextSessionGeneration: UInt64 = 0
    private var sessionGeneration: UInt64?
    private var videoOutput: AVCaptureVideoDataOutput?
    private var photoOutput: AVCapturePhotoOutput?
    private var metadataOutput: AVCaptureMetadataOutput?
    private var activeDevice: AVCaptureDevice?
    private var pendingStartCall: CAPPluginCall?
    private var pendingStartID: UUID?
    private var pendingCaptureCall: CAPPluginCall?
    private var pendingCaptureID: Int64?
    private var pendingCaptureSize = 1920
    private var pendingCaptureBopFX = BopFXEffect.original
    private var pendingCaptureBopFXTuning = BopFXTuning.neutral
    private var pendingCaptureBopFXPhase: CGFloat = 0
    private var pendingPhoto: CapturedPhoto?
    private var captureCompletionReceived = false
    private var latestFrameSize: (width: Int, height: Int)?
    private var photoPreparationComplete = false
    private var previewInstalled = false
    private var activeBopFX = BopFXEffect.original
    private var activeBopFXTuning = BopFXTuning.neutral
    private var startupWarmupFileURL: URL?
    private var temporaryPhotoURLs = Set<URL>()
    private var sessionObservers: [NSObjectProtocol] = []
    private var applicationObservers: [NSObjectProtocol] = []
    #if DEBUG
    private let livingAssembly =
        LivingStripAssemblyCoordinator(requiredClipCount: 4)
    private var nextLivingAttemptID: UInt64 = 0
    private var livingAttemptID: UInt64?
    private var livingLabEnabled = false
    private var livingCaptureStyles: [Int64: LivingCaptureStyle] = [:]
    private var livingClips: [Int64: BopFXLivingClip] = [:]
    private var livingProcessingCaptureIDs = Set<Int64>()
    private var livingCancellationToken: BopFXLivingCancellationToken?
    private var livingDirectoryURL: URL?
    private var livingOutputURL: URL?
    private var pendingLivingCaptureID: Int64?
    private var pendingLivingWindowDeadline: Date?
    #endif

    // These properties are owned by sampleQueue. Retaining one pixel buffer is
    // enough to freeze the exact visible moment without continuously encoding
    // preview frames.
    private var latestPreviewPixelBuffer: CVPixelBuffer?
    private var sampleVideoOutput: AVCaptureVideoDataOutput?
    private weak var sampleBopFXPreviewView: BopFXPreviewView?
    private var reportedFirstFrame = false
    #if DEBUG
    private let livingCaptureBuffer = BopFXLivingCaptureBuffer()
    private var sampleLivingGeneration: UInt64?
    private var sampleLivingAttemptID: UInt64?
    #endif

    // Preview properties are accessed only on the main thread.
    private var previewView: UIView?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var bopFXPreviewView: BopFXPreviewView?
    #if DEBUG
    private var bopFXLabPicker: BopFXLabPicker?
    private var bopFXTuningFrame: BopFXTuningFrameView?
    private let bopFXSequenceOrder: [BopFXEffect] = [
        .spectralEcho,
        .funhouse,
        .cutoutChorus,
        .spinCycle,
    ]
    private var bopFXSequenceEnabled = false
    private var bopFXSequenceIndex = 0
    private var livingPickerAttemptID: UInt64?
    private var livingPlayer: AVQueuePlayer?
    private var livingPlayerLooper: AVPlayerLooper?
    private var livingPlayerViewController: BopFXLivingPlayerViewController?
    #endif
    private var previewGeneration: UInt64?
    private var shutterFreezeView: UIImageView?
    private var shutterFreezeGeneration = 0
    private var shutterFreezeMinimumElapsed = false
    private var shutterFreezeCaptureComplete = false
    private var shutterFreezeDismissRequested = false
    private var shutterFreezeUsesEffectSurface = false
    private var requestedPreviewFrame: CGRect = .zero
    private var requestedPreviewCornerRadius: CGFloat = 0
    private var faceOverlayLayers: [Int: CAShapeLayer] = [:]
    private var faceLastSeen: [Int: CFTimeInterval] = [:]
    private var faceCueStartedAt: [Int: CFTimeInterval] = [:]

    public override func load() {
        super.load()
        let center = NotificationCenter.default
        applicationObservers = [
            center.addObserver(
                forName: UIApplication.didEnterBackgroundNotification,
                object: nil,
                queue: nil
            ) { [weak self] _ in
                self?.sessionQueue.async {
                    guard let self = self else { return }
                    #if DEBUG
                    let hasActiveLivingWork = self.livingAttemptID != nil
                    #else
                    let hasActiveLivingWork = false
                    #endif
                    guard
                        self.session != nil || self.pendingStartCall != nil
                            || hasActiveLivingWork
                    else { return }
                    self.tearDownSession(rejectPending: true)
                }
            }
        ]
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        sessionQueue.async {
            call.resolve(["available": self.frontCamera() != nil])
        }
    }

    @objc func bopFXCapabilities(_ call: CAPPluginCall) {
        call.resolve(BopFXNativeSupport.payload)
    }

    @objc func setBopFX(_ call: CAPPluginCall) {
        guard let rawEffect = call.getString("effect"),
            let effect = BopFXEffect(rawValue: rawEffect)
        else {
            return call.reject("A supported BopFX effect is required", "argumentError")
        }
        guard BopFXNativeSupport.supportedEffects.contains(effect) else {
            return call.reject("This BopFX effect is unavailable", "unavailable")
        }
        sessionQueue.async {
            self.activeBopFX = effect
            #if DEBUG
            self.bopFXSequenceEnabled = false
            self.bopFXSequenceIndex = 0
            #endif
            DispatchQueue.main.async {
                self.bopFXPreviewView?.setEffect(effect)
                #if DEBUG
                self.bopFXLabPicker?.setEffect(effect)
                #endif
                if effect != .original {
                    self.clearFaceOverlays()
                }
                call.resolve(["effect": effect.rawValue])
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        sessionQueue.async {
            if let size = self.latestFrameSize,
                self.session?.isRunning == true,
                let generation = self.sessionGeneration,
                self.photoPreparationComplete,
                self.pendingStartCall == nil
            {
                return call.resolve([
                    "width": size.width,
                    "height": size.height,
                    "generation": generation,
                ])
            }
            guard self.pendingStartCall == nil else {
                return call.reject("Camera start is already in progress", "busy")
            }
            guard self.session == nil else {
                return call.reject("Camera session is not ready", "busy")
            }

            let startID = UUID()
            self.pendingStartCall = call
            self.pendingStartID = startID
            self.authorizeAndStart(id: startID)
        }
    }

    @objc func setPreviewFrame(_ call: CAPPluginCall) {
        guard let x = call.getDouble("x"),
            let y = call.getDouble("y"),
            let width = call.getDouble("width"),
            let height = call.getDouble("height"),
            x.isFinite, y.isFinite, width.isFinite, height.isFinite,
            width > 0, height > 0
        else {
            return call.reject("A finite, positive preview frame is required", "argumentError")
        }
        let cornerRadius = call.getDouble("cornerRadius") ?? 0
        guard cornerRadius.isFinite, cornerRadius >= 0 else {
            return call.reject("A finite, nonnegative corner radius is required", "argumentError")
        }
        let cssFrame = CGRect(x: x, y: y, width: width, height: height)

        sessionQueue.async {
            guard self.session != nil, self.previewInstalled else {
                return call.reject("Camera is not started", "notStarted")
            }
            DispatchQueue.main.async {
                self.requestedPreviewFrame = cssFrame
                self.requestedPreviewCornerRadius = CGFloat(cornerRadius)
                guard
                    self.applyPreviewFrame(
                        cssFrame, cornerRadius: CGFloat(cornerRadius))
                else {
                    return call.reject(
                        "The native camera preview could not be installed",
                        "previewUnavailable")
                }
                call.resolve()
            }
        }
    }

    @objc func capture(_ call: CAPPluginCall) {
        sessionQueue.async {
            guard self.pendingCaptureCall == nil else {
                return call.reject("A photo capture is already in progress", "busy")
            }
            guard let session = self.session, session.isRunning,
                self.latestFrameSize != nil,
                self.photoPreparationComplete,
                let output = self.photoOutput
            else {
                return call.reject("Camera is not ready", "notStarted")
            }
            guard let settings = self.makePhotoSettings(for: output) else {
                return call.reject("JPEG capture is unavailable", "unavailable")
            }

            if let connection = output.connection(with: .video) {
                self.configurePortrait(
                    connection,
                    device: self.activeDevice,
                    previewLayer: nil,
                    mirrored: false)
            }

            self.pendingCaptureCall = call
            self.pendingCaptureID = settings.uniqueID
            self.pendingCaptureSize = min(1920, max(640, call.getInt("size") ?? 1920))
            self.pendingCaptureBopFX = self.activeBopFX
            self.pendingCaptureBopFXTuning = self.activeBopFXTuning
            self.pendingPhoto = nil
            self.captureCompletionReceived = false

            output.capturePhoto(with: settings, delegate: self)
            #if DEBUG
            self.armLivingCaptureIfNeeded(
                captureID: settings.uniqueID,
                effect: self.pendingCaptureBopFX,
                tuning: self.pendingCaptureBopFXTuning)
            #endif
            let freezeSource = self.sampleQueue.sync {
                (
                    self.sampleBopFXPreviewView,
                    self.latestPreviewPixelBuffer
                )
            }
            let wantsEffectSurface =
                self.pendingCaptureBopFX != .original || !self.pendingCaptureBopFXTuning.isNeutral
            let frozenPhase =
                wantsEffectSurface
                ? freezeSource.0?.freezeCurrentFrame()
                : nil
            self.pendingCaptureBopFXPhase =
                frozenPhase ?? BopFXRenderer.animationPhase()
            let usesEffectSurface = frozenPhase != nil
            let freezeGeneration = DispatchQueue.main.sync {
                self.beginShutterFreeze(
                    usingEffectSurface: usesEffectSurface)
            }
            if !wantsEffectSurface {
                self.renderRawShutterFreeze(
                    pixelBuffer: freezeSource.1,
                    generation: freezeGeneration)
            } else if !usesEffectSurface {
                DispatchQueue.main.async {
                    self.skipShutterFreeze(
                        generation: freezeGeneration)
                }
            }
            let captureID = settings.uniqueID
            self.sessionQueue.asyncAfter(deadline: .now() + 12) { [weak self] in
                guard let self = self,
                    self.pendingCaptureID == captureID
                else { return }
                self.failCapture(
                    "The camera did not return a photo in time",
                    code: "captureTimedOut")
            }
        }
    }

    @objc func release(_ call: CAPPluginCall) {
        guard let path = call.getString("path"),
            let fileURL = URL(string: path), fileURL.isFileURL
        else {
            return call.reject("A temporary photo path is required", "argumentError")
        }
        sessionQueue.async {
            guard self.temporaryPhotoURLs.remove(fileURL) != nil else {
                return call.resolve(["released": false])
            }
            self.removeTemporaryPhotos([fileURL])
            call.resolve(["released": true])
        }
    }

    @objc func finishShutterFreeze(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.shutterFreezeDismissRequested = true
            self.finishShutterFreezeIfReady()
            call.resolve(["finished": true])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        sessionQueue.async {
            #if DEBUG
            if self.deferStopForLivingWindowIfNeeded(call) {
                return
            }
            #endif
            self.tearDownSession(
                rejectPending: true,
                preserveCompletedDebugWork: true
            ) {
                call.resolve()
            }
        }
    }

    private func authorizeAndStart(id: UUID) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureAndStart(id: id)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                self?.sessionQueue.async {
                    guard let self = self, self.pendingStartID == id else { return }
                    if granted {
                        self.configureAndStart(id: id)
                    } else {
                        self.failStart(CameraError.accessDenied, code: "accessDenied", id: id)
                    }
                }
            }
        case .denied, .restricted:
            failStart(CameraError.accessDenied, code: "accessDenied", id: id)
        @unknown default:
            failStart(CameraError.accessDenied, code: "accessDenied", id: id)
        }
    }

    private func configureAndStart(id: UUID) {
        guard pendingStartID == id else { return }
        do {
            let configured = try makeSession()
            nextSessionGeneration &+= 1
            let generation = nextSessionGeneration
            sessionGeneration = generation
            session = configured.session
            videoOutput = configured.videoOutput
            photoOutput = configured.photoOutput
            metadataOutput = configured.metadataOutput
            activeDevice = configured.device
            latestFrameSize = nil
            photoPreparationComplete = false
            previewInstalled = false
            startupWarmupFileURL = nil
            sampleQueue.sync {
                latestPreviewPixelBuffer = nil
                sampleVideoOutput = configured.videoOutput
                reportedFirstFrame = false
                #if DEBUG
                if let generation = sampleLivingGeneration {
                    livingCaptureBuffer.cancelSession(
                        generation: generation)
                }
                sampleLivingGeneration = nil
                sampleLivingAttemptID = nil
                #endif
            }

            observeSession(configured.session, generation: generation)

            configured.session.startRunning()
            guard configured.session.isRunning else {
                throw CameraError.configuration("The camera session could not start")
            }

            let activeEffect = activeBopFX
            let activeTuning = activeBopFXTuning
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                let installed = self.installPreviewIfNeeded(
                    session: configured.session,
                    device: configured.device,
                    generation: generation,
                    effect: activeEffect,
                    tuning: activeTuning)
                self.sessionQueue.async {
                    guard self.pendingStartID == id,
                        self.session === configured.session
                    else { return }
                    guard installed else {
                        return self.failStart(
                            CameraError.configuration(
                                "The native camera preview could not be installed"),
                            code: "previewUnavailable",
                            id: id)
                    }
                    self.previewInstalled = true
                    self.finishStartIfReady()
                }
            }

            guard
                let preparationSettings = makePhotoSettings(
                    for: configured.photoOutput)
            else {
                throw CameraError.configuration("JPEG capture is unavailable")
            }
            configured.photoOutput.setPreparedPhotoSettingsArray(
                [preparationSettings]) { [weak self] prepared, error in
                    self?.sessionQueue.async {
                        guard let self = self, self.pendingStartID == id else { return }
                        guard prepared else {
                            let preparationError =
                                error
                                ?? CameraError.configuration(
                                    "The camera could not prepare its first photo")
                            return self.failStart(
                                preparationError,
                                code: "preparationError",
                                id: id)
                        }
                        self.photoPreparationComplete = true
                        self.finishStartIfReady()
                    }
                }

            sessionQueue.asyncAfter(deadline: .now() + 12) { [weak self] in
                guard let self = self, self.pendingStartID == id else { return }
                self.failStart(CameraError.startTimedOut, code: "startTimedOut", id: id)
            }
        } catch {
            failStart(error, code: "configurationError", id: id)
        }
    }

    private func makePhotoSettings(
        for output: AVCapturePhotoOutput
    ) -> AVCapturePhotoSettings? {
        guard output.availablePhotoCodecTypes.contains(.jpeg) else { return nil }
        let settings = AVCapturePhotoSettings(
            format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
        settings.photoQualityPrioritization = .quality
        settings.flashMode = .off
        if #available(iOS 16.0, *) {
            let dimensions = output.maxPhotoDimensions
            if dimensions.width > 0, dimensions.height > 0 {
                settings.maxPhotoDimensions = dimensions
            }
        } else {
            settings.isHighResolutionPhotoEnabled = true
        }
        return settings
    }

    private func finishStartIfReady() {
        guard photoPreparationComplete,
            previewInstalled,
            let size = latestFrameSize,
            let call = pendingStartCall
        else { return }
        var result: [String: Any] = ["width": size.width, "height": size.height]
        guard let generation = sessionGeneration else { return }
        result["generation"] = generation
        if let warmupFileURL = startupWarmupFileURL {
            result["warmupPath"] = warmupFileURL.absoluteString
        }
        startupWarmupFileURL = nil
        pendingStartCall = nil
        pendingStartID = nil
        call.resolve(result)
    }

    private func observeSession(
        _ captureSession: AVCaptureSession,
        generation: UInt64
    ) {
        removeSessionObservers()
        let center = NotificationCenter.default
        sessionObservers = [
            center.addObserver(
                forName: AVCaptureSession.wasInterruptedNotification,
                object: captureSession,
                queue: nil
            ) { [weak self, weak captureSession] _ in
                guard let captureSession else { return }
                self?.sessionQueue.async {
                    guard let self = self,
                        self.session === captureSession
                    else { return }
                    if let startID = self.pendingStartID {
                        self.notifyListeners(
                            "stateChanged",
                            data: [
                                "state": "interrupted",
                                "message": "The camera was interrupted. Try Camera Again.",
                                "generation": generation,
                            ])
                        return self.failStart(
                            CameraError.configuration("The camera was interrupted"),
                            code: "interrupted",
                            id: startID)
                    }
                    if self.pendingCaptureCall != nil {
                        self.failCapture(
                            "The camera was interrupted",
                            code: "interrupted")
                    }
                    self.notifyListeners(
                        "stateChanged",
                        data: [
                            "state": "interrupted",
                            "message": "The camera was interrupted. Try Camera Again.",
                            "generation": generation,
                        ])
                    self.tearDownSession(rejectPending: true)
                }
            },
            center.addObserver(
                forName: AVCaptureSession.runtimeErrorNotification,
                object: captureSession,
                queue: nil
            ) { [weak self, weak captureSession] notification in
                guard let captureSession else { return }
                let error =
                    notification.userInfo?[AVCaptureSessionErrorKey]
                    as? NSError
                self?.sessionQueue.async {
                    guard let self = self,
                        self.session === captureSession
                    else { return }
                    if let startID = self.pendingStartID {
                        self.notifyListeners(
                            "stateChanged",
                            data: [
                                "state": "failed",
                                "message": "The camera stopped unexpectedly. Try Camera Again.",
                                "generation": generation,
                            ])
                        return self.failStart(
                            error
                                ?? CameraError.configuration(
                                    "The camera stopped unexpectedly"),
                            code: "runtimeError",
                            id: startID)
                    }
                    if self.pendingCaptureCall != nil {
                        self.failCapture(
                            error?.localizedDescription ?? "The camera stopped unexpectedly",
                            code: "runtimeError")
                    }
                    self.notifyListeners(
                        "stateChanged",
                        data: [
                            "state": "failed",
                            "message": "The camera stopped unexpectedly. Try Camera Again.",
                            "generation": generation,
                        ])
                    self.tearDownSession(rejectPending: true)
                }
            },
        ]
    }

    private func removeSessionObservers() {
        let center = NotificationCenter.default
        sessionObservers.forEach(center.removeObserver)
        sessionObservers.removeAll()
    }

    private func makeSession() throws -> (
        session: AVCaptureSession,
        videoOutput: AVCaptureVideoDataOutput,
        photoOutput: AVCapturePhotoOutput,
        metadataOutput: AVCaptureMetadataOutput?,
        device: AVCaptureDevice
    ) {
        guard let device = frontCamera() else { throw CameraError.unavailable }
        let input: AVCaptureDeviceInput
        do {
            input = try AVCaptureDeviceInput(device: device)
        } catch {
            throw CameraError.configuration("The front camera could not be opened")
        }

        configure(device: device)

        let captureSession = AVCaptureSession()
        var configurationCommitted = false
        captureSession.beginConfiguration()
        defer {
            if !configurationCommitted {
                captureSession.commitConfiguration()
            }
        }
        guard captureSession.canSetSessionPreset(.photo) else {
            throw CameraError.configuration("Full-resolution photo capture is unavailable")
        }
        captureSession.sessionPreset = .photo
        guard captureSession.canAddInput(input) else {
            throw CameraError.configuration("The front camera input could not be added")
        }
        captureSession.addInput(input)

        let stillOutput = AVCapturePhotoOutput()
        guard captureSession.canAddOutput(stillOutput) else {
            throw CameraError.configuration("The photo output could not be added")
        }
        captureSession.addOutput(stillOutput)
        stillOutput.maxPhotoQualityPrioritization = .quality
        if #available(iOS 16.0, *) {
            if let dimensions = device.activeFormat.supportedMaxPhotoDimensions.max(
                by: { Int64($0.width) * Int64($0.height) < Int64($1.width) * Int64($1.height) }
            ) {
                stillOutput.maxPhotoDimensions = dimensions
            }
        } else {
            stillOutput.isHighResolutionCaptureEnabled = true
        }
        if #available(iOS 17.0, *) {
            if stillOutput.isZeroShutterLagSupported {
                stillOutput.isZeroShutterLagEnabled = true
            }
            if stillOutput.isResponsiveCaptureSupported {
                stillOutput.isResponsiveCaptureEnabled = true
            }
        }

        let readinessOutput = AVCaptureVideoDataOutput()
        readinessOutput.alwaysDiscardsLateVideoFrames = true
        readinessOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String:
                Int(kCVPixelFormatType_420YpCbCr8BiPlanarFullRange)
        ]
        readinessOutput.setSampleBufferDelegate(self, queue: sampleQueue)
        guard captureSession.canAddOutput(readinessOutput) else {
            throw CameraError.configuration("The preview output could not be added")
        }
        captureSession.addOutput(readinessOutput)

        let faceOutput = AVCaptureMetadataOutput()
        var enabledFaceOutput: AVCaptureMetadataOutput?
        if captureSession.canAddOutput(faceOutput) {
            captureSession.addOutput(faceOutput)
            if faceOutput.availableMetadataObjectTypes.contains(.face) {
                faceOutput.setMetadataObjectsDelegate(self, queue: metadataQueue)
                faceOutput.metadataObjectTypes = [.face]
                enabledFaceOutput = faceOutput
            } else {
                captureSession.removeOutput(faceOutput)
            }
        }

        if let connection = readinessOutput.connection(with: .video) {
            configurePortrait(
                connection,
                device: device,
                previewLayer: nil,
                mirrored: true)
        }
        if let connection = stillOutput.connection(with: .video) {
            configurePortrait(
                connection,
                device: device,
                previewLayer: nil,
                mirrored: false)
        }
        if let connection = enabledFaceOutput?.connection(with: .video) {
            configurePortrait(
                connection,
                device: device,
                previewLayer: nil,
                mirrored: false)
        }
        captureSession.commitConfiguration()
        configurationCommitted = true
        return (
            captureSession,
            readinessOutput,
            stillOutput,
            enabledFaceOutput,
            device
        )
    }

    private func frontCamera() -> AVCaptureDevice? {
        if let trueDepth = AVCaptureDevice.default(
            .builtInTrueDepthCamera, for: .video, position: .front)
        {
            return trueDepth
        }
        return AVCaptureDevice.default(
            .builtInWideAngleCamera, for: .video, position: .front)
    }

    private func configure(device: AVCaptureDevice) {
        do {
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }
            if device.isFocusModeSupported(.continuousAutoFocus) {
                if #available(iOS 15.4, *) {
                    device.automaticallyAdjustsFaceDrivenAutoFocusEnabled = true
                }
                device.focusMode = .continuousAutoFocus
            }
            if device.isFocusPointOfInterestSupported {
                device.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5)
            }
            if device.isSmoothAutoFocusSupported {
                device.isSmoothAutoFocusEnabled = true
            }
            if device.isExposureModeSupported(.continuousAutoExposure) {
                if #available(iOS 15.4, *) {
                    device.automaticallyAdjustsFaceDrivenAutoExposureEnabled = true
                }
                device.exposureMode = .continuousAutoExposure
            }
            if device.isExposurePointOfInterestSupported {
                device.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5)
            }
            if device.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
                device.whiteBalanceMode = .continuousAutoWhiteBalance
            }
            device.isSubjectAreaChangeMonitoringEnabled = true
        } catch {
            // Session setup may still succeed with the device's current auto modes.
        }
    }

    private func configurePortrait(
        _ connection: AVCaptureConnection,
        device: AVCaptureDevice?,
        previewLayer: AVCaptureVideoPreviewLayer?,
        mirrored: Bool
    ) {
        if #available(iOS 17.0, *), let device = device {
            let coordinator = AVCaptureDevice.RotationCoordinator(
                device: device,
                previewLayer: previewLayer)
            let angle =
                previewLayer == nil
                ? coordinator.videoRotationAngleForHorizonLevelCapture
                : coordinator.videoRotationAngleForHorizonLevelPreview
            if connection.isVideoRotationAngleSupported(angle) {
                connection.videoRotationAngle = angle
            }
        } else if connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }
        if connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = mirrored
        }
    }

    public func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard output === sampleVideoOutput else { return }
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        latestPreviewPixelBuffer = pixelBuffer
        sampleBopFXPreviewView?.consume(pixelBuffer)
        #if DEBUG
        if let generation = sampleLivingGeneration,
            let attemptID = sampleLivingAttemptID
        {
            let update = livingCaptureBuffer.append(
                sampleBuffer,
                generation: generation)
            publishLivingCaptureUpdate(
                update,
                generation: generation,
                attemptID: attemptID)
        }
        #endif
        guard !reportedFirstFrame else { return }
        reportedFirstFrame = true
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let previewImage = makePreviewImage(pixelBuffer)
        // Exercise the exact 1920px crop, mirror, JPEG, file, and WebKit-load
        // path before the shutter is enabled, without holding the sample or
        // session queue behind image scaling and filesystem work.
        photoProcessingQueue.async {
            let shouldWarm = self.sessionQueue.sync {
                self.videoOutput === output && self.pendingStartCall != nil
            }
            guard shouldWarm else { return }
            let warmupFileURL: URL? = autoreleasepool {
                guard let previewImage,
                    let warmupData = try? self.renderSquareJPEG(
                        previewImage,
                        size: 1920,
                        effect: .original,
                        tuning: .neutral)
                else { return nil }
                return try? self.writeTemporaryPhoto(warmupData)
            }
            self.sessionQueue.async {
                guard self.videoOutput === output,
                    self.pendingStartCall != nil
                else {
                    if let warmupFileURL {
                        self.removeTemporaryPhotos([warmupFileURL])
                    }
                    return
                }
                if let warmupFileURL {
                    self.temporaryPhotoURLs.insert(warmupFileURL)
                    self.startupWarmupFileURL = warmupFileURL
                }
                self.latestFrameSize = (width, height)
                self.finishStartIfReady()
            }
        }
    }

    public func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        let faces = metadataObjects.compactMap { $0 as? AVMetadataFaceObject }
        sessionQueue.async {
            guard self.metadataOutput === output,
                let generation = self.sessionGeneration,
                self.activeBopFX == .original
            else { return }
            DispatchQueue.main.async {
                guard self.previewGeneration == generation else { return }
                self.renderFaceOverlays(faces)
            }
        }
    }

    private func renderFaceOverlays(_ faces: [AVMetadataFaceObject]) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard let previewLayer = previewLayer,
            let previewView = previewView
        else {
            clearFaceOverlays()
            return
        }

        let now = CACurrentMediaTime()
        let cueDuration: CFTimeInterval = 1.2
        let redetectionDelay: CFTimeInterval = 0.45
        var detectedFaceIDs = Set<Int>()
        let clippingBounds = previewView.bounds.insetBy(dx: 4, dy: 4)

        for face in faces {
            guard
                let transformed = previewLayer.transformedMetadataObject(
                    for: face) as? AVMetadataFaceObject
            else { continue }
            let bounds = transformed.bounds
                .insetBy(dx: 8, dy: 8)
                .intersection(clippingBounds)
            guard bounds.width >= 24, bounds.height >= 24 else { continue }

            detectedFaceIDs.insert(face.faceID)
            faceLastSeen[face.faceID] = now
            let cueStartedAt = faceCueStartedAt[face.faceID] ?? now
            faceCueStartedAt[face.faceID] = cueStartedAt

            if now - cueStartedAt >= cueDuration {
                if let overlay = faceOverlayLayers[face.faceID],
                    overlay.opacity > 0
                {
                    let fade = CABasicAnimation(keyPath: "opacity")
                    fade.fromValue = overlay.presentation()?.opacity ?? 1
                    fade.toValue = 0
                    fade.duration = 0.18
                    overlay.opacity = 0
                    overlay.add(fade, forKey: "faceFadeOut")
                }
                continue
            }

            let overlay: CAShapeLayer
            if let existing = faceOverlayLayers[face.faceID] {
                overlay = existing
            } else {
                let created = CAShapeLayer()
                created.fillColor = UIColor.clear.cgColor
                created.strokeColor =
                    UIColor.boothBopAccent
                    .withAlphaComponent(0.5).cgColor
                created.lineWidth = 2
                created.lineJoin = .round
                created.shadowColor = UIColor.black.cgColor
                created.shadowOpacity = 0.15
                created.shadowRadius = 1.5
                created.shadowOffset = .zero
                previewView.layer.addSublayer(created)
                faceOverlayLayers[face.faceID] = created

                let fade = CABasicAnimation(keyPath: "opacity")
                fade.fromValue = 0
                fade.toValue = 1
                fade.duration = 0.12
                created.add(fade, forKey: "faceFadeIn")
                overlay = created
            }

            let cornerRadius = min(12, min(bounds.width, bounds.height) * 0.08)
            let nextPath = UIBezierPath(
                roundedRect: bounds,
                cornerRadius: cornerRadius
            ).cgPath
            if let previousPath = overlay.presentation()?.path ?? overlay.path {
                let movement = CABasicAnimation(keyPath: "path")
                movement.fromValue = previousPath
                movement.toValue = nextPath
                movement.duration = 0.12
                movement.timingFunction = CAMediaTimingFunction(name: .easeOut)
                overlay.add(movement, forKey: "faceMovement")
            }
            overlay.path = nextPath
            overlay.opacity = 1
        }

        let staleFaceIDs = faceOverlayLayers.keys.filter { faceID in
            !detectedFaceIDs.contains(faceID)
                && now - (faceLastSeen[faceID] ?? 0) > redetectionDelay
        }
        for faceID in staleFaceIDs {
            faceOverlayLayers[faceID]?.removeFromSuperlayer()
            faceOverlayLayers.removeValue(forKey: faceID)
            faceLastSeen.removeValue(forKey: faceID)
            faceCueStartedAt.removeValue(forKey: faceID)
        }
    }

    private func clearFaceOverlays() {
        dispatchPrecondition(condition: .onQueue(.main))
        for overlay in faceOverlayLayers.values {
            overlay.removeFromSuperlayer()
        }
        faceOverlayLayers.removeAll()
        faceLastSeen.removeAll()
        faceCueStartedAt.removeAll()
    }

    private func makePreviewImage(
        _ pixelBuffer: CVPixelBuffer
    ) -> UIImage? {
        let image = CIImage(cvPixelBuffer: pixelBuffer)
        guard
            let cgImage = previewImageContext.createCGImage(
                image, from: image.extent)
        else { return nil }
        return UIImage(cgImage: cgImage)
    }

    private func renderSquareJPEG(
        _ image: UIImage,
        size: Int,
        effect: BopFXEffect,
        tuning: BopFXTuning,
        phase: CGFloat = 0
    ) throws -> Data {
        let target = CGFloat(size)
        guard image.size.width > 0, image.size.height > 0 else {
            throw CameraError.configuration("The captured photo has no pixels")
        }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        format.preferredRange = .standard
        let renderer = UIGraphicsImageRenderer(
            size: CGSize(width: target, height: target),
            format: format)
        let rendered = renderer.image { context in
            let scale = max(
                target / image.size.width,
                target / image.size.height)
            let drawSize = CGSize(
                width: image.size.width * scale,
                height: image.size.height * scale)
            let drawRect = CGRect(
                x: (target - drawSize.width) / 2,
                y: (target - drawSize.height) / 2,
                width: drawSize.width,
                height: drawSize.height)
            context.cgContext.interpolationQuality = .high
            context.cgContext.translateBy(x: target, y: 0)
            context.cgContext.scaleBy(x: -1, y: 1)
            image.draw(in: drawRect)
        }
        let finalImage: UIImage
        if effect == .original && tuning.isNeutral {
            finalImage = rendered
        } else {
            finalImage =
                bopFXStillRenderer?.renderStillImage(
                    rendered,
                    effect: effect,
                    phase: phase,
                    tuning: tuning) ?? rendered
        }
        guard let data = finalImage.jpegData(compressionQuality: 0.98) else {
            throw CameraError.configuration("The captured photo could not be encoded")
        }
        return data
    }

    private func writeTemporaryPhoto(_ data: Data) throws -> URL {
        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("boothbop-photo-\(UUID().uuidString)")
            .appendingPathExtension("jpg")
        try data.write(to: fileURL, options: .atomic)
        return fileURL
    }

    private func removeTemporaryPhotos(_ fileURLs: [URL]) {
        photoProcessingQueue.async {
            for fileURL in fileURLs {
                try? FileManager.default.removeItem(at: fileURL)
            }
        }
    }

    public func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        let captureID = photo.resolvedSettings.uniqueID
        let shutterTimestamp = photo.timestamp
        sessionQueue.async {
            guard self.pendingCaptureID == captureID else { return }
            if let error = error {
                return self.failCapture(error.localizedDescription, code: "captureError")
            }
            #if DEBUG
            self.resolveLivingShutterIfNeeded(
                captureID: captureID,
                timestamp: shutterTimestamp)
            #endif
            let captureSize = self.pendingCaptureSize
            let captureEffect = self.pendingCaptureBopFX
            let captureTuning = self.pendingCaptureBopFXTuning
            let capturePhase = self.pendingCaptureBopFXPhase
            self.photoProcessingQueue.async {
                let shouldProcess = self.sessionQueue.sync {
                    self.pendingCaptureID == captureID
                }
                guard shouldProcess else { return }
                let result: Result<CapturedPhoto, Error> = autoreleasepool {
                    Result {
                        guard let data = photo.fileDataRepresentation(),
                            let image = UIImage(data: data)
                        else {
                            throw CameraError.configuration(
                                "The captured photo could not be encoded")
                        }
                        let squareData = try self.renderSquareJPEG(
                            image,
                            size: captureSize,
                            effect: captureEffect,
                            tuning: captureTuning,
                            phase: capturePhase)
                        let fileURL = try self.writeTemporaryPhoto(squareData)
                        return CapturedPhoto(
                            fileURL: fileURL,
                            width: captureSize,
                            height: captureSize)
                    }
                }
                self.sessionQueue.async {
                    guard self.pendingCaptureID == captureID else {
                        if case .success(let stalePhoto) = result {
                            self.removeTemporaryPhotos([stalePhoto.fileURL])
                        }
                        return
                    }
                    switch result {
                    case .success(let processedPhoto):
                        self.temporaryPhotoURLs.insert(processedPhoto.fileURL)
                        self.pendingPhoto = processedPhoto
                        self.finishCaptureIfReady()
                    case .failure:
                        self.failCapture(
                            "The captured photo could not be prepared",
                            code: "captureError")
                    }
                }
            }
        }
    }

    public func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings,
        error: Error?
    ) {
        sessionQueue.async {
            guard self.pendingCaptureID == resolvedSettings.uniqueID else { return }
            if let error = error {
                return self.failCapture(error.localizedDescription, code: "captureError")
            }
            self.captureCompletionReceived = true
            self.finishCaptureIfReady()
        }
    }

    private func finishCaptureIfReady() {
        guard captureCompletionReceived,
            let photo = pendingPhoto,
            let call = pendingCaptureCall,
            let captureID = pendingCaptureID
        else { return }
        #if DEBUG
        if let generation = livingAssembly.generation,
            let attemptID = livingAttemptID,
            livingAssembly.attemptID == attemptID,
            livingAssembly.containsCapture(id: captureID)
        {
            let update = livingAssembly.markStillSucceeded(
                captureID: captureID,
                generation: generation,
                attemptID: attemptID)
            handleLivingAssemblyUpdate(
                update,
                generation: generation,
                attemptID: attemptID)
        }
        #endif
        pendingCaptureCall = nil
        pendingCaptureID = nil
        pendingCaptureSize = 1920
        pendingCaptureBopFX = .original
        pendingCaptureBopFXTuning = .neutral
        pendingCaptureBopFXPhase = 0
        pendingPhoto = nil
        captureCompletionReceived = false
        #if DEBUG
        advanceBopFXLabSequence()
        #endif
        DispatchQueue.main.async {
            self.completeShutterFreeze()
            call.resolve([
                "path": photo.fileURL.absoluteString,
                "mimeType": "image/jpeg",
                "width": photo.width,
                "height": photo.height,
                "mirrored": true,
            ])
        }
    }

    private func failStart(_ error: Error, code: String, id: UUID) {
        guard pendingStartID == id, let call = pendingStartCall else { return }
        pendingStartCall = nil
        pendingStartID = nil
        call.reject(error.localizedDescription, code)
        tearDownSession(rejectPending: false)
    }

    private func failCapture(_ message: String, code: String) {
        guard let call = pendingCaptureCall else { return }
        #if DEBUG
        if let captureID = pendingCaptureID {
            failLivingCaptureIfNeeded(captureID: captureID)
        }
        #endif
        if let fileURL = pendingPhoto?.fileURL {
            temporaryPhotoURLs.remove(fileURL)
            removeTemporaryPhotos([fileURL])
        }
        pendingCaptureCall = nil
        pendingCaptureID = nil
        pendingCaptureSize = 1920
        pendingCaptureBopFX = .original
        pendingCaptureBopFXTuning = .neutral
        pendingCaptureBopFXPhase = 0
        pendingPhoto = nil
        captureCompletionReceived = false
        DispatchQueue.main.async {
            self.completeShutterFreeze()
            call.reject(message, code)
        }
    }

    private func tearDownSession(
        rejectPending: Bool,
        preserveCompletedDebugWork: Bool = false,
        completion: (() -> Void)? = nil
    ) {
        let unpublishedPhotoURL = pendingPhoto?.fileURL
        let unpublishedWarmupURL = startupWarmupFileURL
        pendingStartID = nil
        if rejectPending {
            pendingStartCall?.reject("Camera stopped", "cancelled")
            pendingCaptureCall?.reject("Camera stopped", "cancelled")
        }
        pendingStartCall = nil
        pendingCaptureCall = nil
        pendingCaptureID = nil
        pendingCaptureSize = 1920
        pendingCaptureBopFX = .original
        pendingCaptureBopFXTuning = .neutral
        pendingCaptureBopFXPhase = 0
        pendingPhoto = nil
        captureCompletionReceived = false
        latestFrameSize = nil
        photoPreparationComplete = false
        previewInstalled = false
        startupWarmupFileURL = nil
        #if DEBUG
        bopFXSequenceEnabled = false
        bopFXSequenceIndex = 0
        if preserveCompletedDebugWork {
            prepareLivingLabForTeardown()
        } else {
            cancelLivingLab(updatePicker: false)
        }
        #endif

        let unpublishedURLs = [unpublishedPhotoURL, unpublishedWarmupURL].compactMap { $0 }
        for fileURL in unpublishedURLs {
            temporaryPhotoURLs.remove(fileURL)
        }
        removeTemporaryPhotos(unpublishedURLs)

        removeSessionObservers()
        videoOutput?.setSampleBufferDelegate(nil, queue: nil)
        metadataOutput?.setMetadataObjectsDelegate(nil, queue: nil)
        if session?.isRunning == true {
            session?.stopRunning()
        }
        sampleQueue.sync {
            latestPreviewPixelBuffer = nil
            sampleVideoOutput = nil
            sampleBopFXPreviewView = nil
            reportedFirstFrame = false
            #if DEBUG
            if let generation = sampleLivingGeneration {
                livingCaptureBuffer.cancelSession(
                    generation: generation)
            }
            sampleLivingGeneration = nil
            sampleLivingAttemptID = nil
            #endif
        }
        session = nil
        sessionGeneration = nil
        videoOutput = nil
        photoOutput = nil
        metadataOutput = nil
        activeDevice = nil

        DispatchQueue.main.async {
            self.removePreview()
            completion?()
        }
    }

    @discardableResult
    private func installPreviewIfNeeded(
        session: AVCaptureSession,
        device: AVCaptureDevice,
        generation: UInt64,
        effect: BopFXEffect,
        tuning: BopFXTuning
    ) -> Bool {
        dispatchPrecondition(condition: .onQueue(.main))
        guard let rootView = bridge?.viewController?.view,
            let webView = bridge?.webView,
            let previewHost = webView.superview
        else { return false }

        rootView.backgroundColor = .boothBopCanvas
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        if previewView == nil {
            let nativePreview = UIView(frame: .zero)
            nativePreview.backgroundColor = .black
            nativePreview.clipsToBounds = true
            previewHost.insertSubview(nativePreview, belowSubview: webView)

            let layer = AVCaptureVideoPreviewLayer(session: session)
            layer.videoGravity = .resizeAspectFill
            nativePreview.layer.addSublayer(layer)

            if let effectView = BopFXPreviewView(
                bopFXFrame: nativePreview.bounds)
            {
                effectView.autoresizingMask = [
                    .flexibleWidth,
                    .flexibleHeight,
                ]
                effectView.setEffect(effect)
                effectView.setTuning(tuning)
                nativePreview.addSubview(effectView)
                bopFXPreviewView = effectView
                sampleQueue.async {
                    self.sampleBopFXPreviewView = effectView
                }
                #if DEBUG
                let tuningFrame = BopFXTuningFrameView(tuning: tuning)
                tuningFrame.autoresizingMask = [
                    .flexibleWidth,
                    .flexibleHeight,
                ]
                tuningFrame.onChange = { [weak self] nextTuning in
                    self?.selectBopFXTuningFromLab(nextTuning)
                }
                previewHost.addSubview(tuningFrame)
                bopFXTuningFrame = tuningFrame

                let picker = BopFXLabPicker(effect: effect)
                picker.autoresizingMask = [
                    .flexibleWidth,
                    .flexibleTopMargin,
                ]
                picker.onSelect = { [weak self] selectedEffect in
                    self?.selectBopFXFromLab(selectedEffect)
                }
                picker.onSelectSequence = { [weak self] in
                    self?.startBopFXLabSequence()
                }
                picker.onToggleLiving = { [weak self] enabled in
                    self?.setLivingLabEnabled(enabled)
                }
                picker.onPlayLiving = { [weak self] in
                    self?.playLivingStrip()
                }
                previewHost.addSubview(picker)
                bopFXLabPicker = picker
                sessionQueue.async {
                    let state =
                        self.currentLivingLabPickerState()
                    let attemptID =
                        self.livingAttemptID
                    DispatchQueue.main.async {
                        guard self.bopFXLabPicker === picker else {
                            return
                        }
                        self.livingPickerAttemptID =
                            attemptID
                        picker.setLivingState(state)
                    }
                }
                #endif
            }
            previewView = nativePreview
            previewLayer = layer
            previewGeneration = generation
        } else if previewLayer?.session !== session {
            return false
        } else {
            previewGeneration = generation
        }

        if let connection = previewLayer?.connection {
            configurePortrait(
                connection,
                device: device,
                previewLayer: previewLayer,
                mirrored: true)
        }
        _ = applyPreviewFrame(
            requestedPreviewFrame,
            cornerRadius: requestedPreviewCornerRadius)
        return previewView != nil && previewLayer?.session === session
    }

    private func beginShutterFreeze(
        usingEffectSurface: Bool
    ) -> Int {
        dispatchPrecondition(condition: .onQueue(.main))
        shutterFreezeGeneration &+= 1
        shutterFreezeMinimumElapsed = false
        shutterFreezeCaptureComplete = false
        shutterFreezeDismissRequested = false
        shutterFreezeUsesEffectSurface = usingEffectSurface
        shutterFreezeView?.isHidden = true
        shutterFreezeView?.image = nil
        if usingEffectSurface {
            scheduleShutterFreezeMinimum(
                generation: shutterFreezeGeneration)
        }
        return shutterFreezeGeneration
    }

    private func renderRawShutterFreeze(
        pixelBuffer: CVPixelBuffer?,
        generation: Int
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard let pixelBuffer else {
            DispatchQueue.main.async {
                self.skipShutterFreeze(generation: generation)
            }
            return
        }
        photoProcessingQueue.async {
            let freezeImage = self.makePreviewImage(pixelBuffer)
            DispatchQueue.main.async {
                guard let freezeImage else {
                    return self.skipShutterFreeze(generation: generation)
                }
                self.showShutterFreeze(
                    freezeImage,
                    generation: generation)
            }
        }
    }

    private func showShutterFreeze(
        _ image: UIImage,
        generation: Int
    ) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard shutterFreezeGeneration == generation,
            let previewView = previewView
        else { return }

        let freezeView: UIImageView
        if let existing = shutterFreezeView {
            freezeView = existing
        } else {
            let created = UIImageView(frame: previewView.bounds)
            created.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            created.contentMode = .scaleAspectFill
            created.clipsToBounds = true
            previewView.addSubview(created)
            shutterFreezeView = created
            freezeView = created
        }

        shutterFreezeMinimumElapsed = false
        freezeView.frame = previewView.bounds
        freezeView.image = image
        freezeView.isHidden = false
        scheduleShutterFreezeMinimum(generation: generation)
    }

    private func scheduleShutterFreezeMinimum(generation: Int) {
        dispatchPrecondition(condition: .onQueue(.main))
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(600)) {
            guard self.shutterFreezeGeneration == generation else { return }
            self.shutterFreezeMinimumElapsed = true
            self.finishShutterFreezeIfReady()
        }
    }

    private func skipShutterFreeze(generation: Int) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard shutterFreezeGeneration == generation else { return }
        shutterFreezeMinimumElapsed = true
        finishShutterFreezeIfReady()
    }

    private func completeShutterFreeze() {
        dispatchPrecondition(condition: .onQueue(.main))
        shutterFreezeCaptureComplete = true
        finishShutterFreezeIfReady()
    }

    private func finishShutterFreezeIfReady() {
        dispatchPrecondition(condition: .onQueue(.main))
        guard shutterFreezeMinimumElapsed,
            shutterFreezeCaptureComplete,
            shutterFreezeDismissRequested
        else { return }
        hideShutterFreeze()
    }

    private func hideShutterFreeze() {
        dispatchPrecondition(condition: .onQueue(.main))
        shutterFreezeView?.isHidden = true
        shutterFreezeView?.image = nil
        if shutterFreezeUsesEffectSurface {
            bopFXPreviewView?.resumeAfterFreeze()
        }
        shutterFreezeMinimumElapsed = false
        shutterFreezeCaptureComplete = false
        shutterFreezeDismissRequested = false
        shutterFreezeUsesEffectSurface = false
    }

    @discardableResult
    private func applyPreviewFrame(
        _ cssFrame: CGRect,
        cornerRadius: CGFloat
    ) -> Bool {
        dispatchPrecondition(condition: .onQueue(.main))
        guard let webView = bridge?.webView,
            let previewView = previewView,
            let previewHost = previewView.superview
        else { return false }
        previewView.frame = webView.convert(cssFrame, to: previewHost)
        previewView.layer.cornerRadius = cornerRadius
        previewView.layer.cornerCurve = .continuous
        previewLayer?.frame = previewView.bounds
        bopFXPreviewView?.frame = previewView.bounds
        #if DEBUG
        let previewFrame = previewView.frame
        bopFXTuningFrame?.frame = previewFrame
        bopFXLabPicker?.frame = CGRect(
            x: previewFrame.minX + 8,
            y: max(previewFrame.minY + 8, previewFrame.maxY - 58),
            width: max(0, previewFrame.width - 16),
            height: 50)
        #endif
        shutterFreezeView?.frame = previewView.bounds
        return previewLayer != nil && !previewView.frame.isEmpty
    }

    private func removePreview() {
        dispatchPrecondition(condition: .onQueue(.main))
        shutterFreezeGeneration &+= 1
        shutterFreezeMinimumElapsed = false
        shutterFreezeCaptureComplete = false
        shutterFreezeDismissRequested = false
        shutterFreezeUsesEffectSurface = false
        clearFaceOverlays()
        shutterFreezeView?.removeFromSuperview()
        shutterFreezeView = nil
        bopFXPreviewView?.removeFromSuperview()
        bopFXPreviewView = nil
        #if DEBUG
        stopLivingPlayer()
        livingPickerAttemptID = nil
        bopFXTuningFrame?.removeFromSuperview()
        bopFXTuningFrame = nil
        bopFXLabPicker?.removeFromSuperview()
        bopFXLabPicker = nil
        #endif
        previewLayer?.session = nil
        previewLayer?.removeFromSuperlayer()
        previewView?.removeFromSuperview()
        previewLayer = nil
        previewGeneration = nil
        previewView = nil
        requestedPreviewFrame = .zero
        requestedPreviewCornerRadius = 0

        bridge?.viewController?.view.backgroundColor = .boothBopCanvas
        bridge?.webView?.isOpaque = false
        bridge?.webView?.backgroundColor = .boothBopCanvas
        bridge?.webView?.scrollView.backgroundColor = .boothBopCanvas
    }

    #if DEBUG
    private func selectBopFXFromLab(_ effect: BopFXEffect) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard BopFXNativeSupport.supportedEffects.contains(effect) else { return }
        sessionQueue.async {
            self.bopFXSequenceEnabled = false
            self.bopFXSequenceIndex = 0
            self.activeBopFX = effect
            DispatchQueue.main.async {
                self.bopFXPreviewView?.setEffect(effect)
                self.bopFXLabPicker?.setEffect(effect)
                self.clearFaceOverlays()
            }
        }
    }

    private func selectBopFXTuningFromLab(_ tuning: BopFXTuning) {
        dispatchPrecondition(condition: .onQueue(.main))
        sessionQueue.async {
            self.activeBopFXTuning = tuning
            DispatchQueue.main.async {
                self.bopFXPreviewView?.setTuning(tuning)
                self.bopFXTuningFrame?.setTuning(tuning)
            }
        }
    }

    private func startBopFXLabSequence() {
        dispatchPrecondition(condition: .onQueue(.main))
        sessionQueue.async {
            self.bopFXSequenceEnabled = true
            self.bopFXSequenceIndex = 0
            let effect = self.bopFXSequenceOrder[0]
            self.activeBopFX = effect
            DispatchQueue.main.async {
                self.bopFXPreviewView?.setEffect(effect)
                self.bopFXLabPicker?.setSequenceEffect(effect)
                self.clearFaceOverlays()
            }
        }
    }

    private func advanceBopFXLabSequence() {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard bopFXSequenceEnabled, !bopFXSequenceOrder.isEmpty else { return }
        bopFXSequenceIndex = (bopFXSequenceIndex + 1) % bopFXSequenceOrder.count
        let effect = bopFXSequenceOrder[bopFXSequenceIndex]
        activeBopFX = effect
        DispatchQueue.main.async {
            self.bopFXPreviewView?.setEffect(effect)
            self.bopFXLabPicker?.setSequenceEffect(effect)
            self.clearFaceOverlays()
        }
    }

    private func setLivingLabEnabled(_ enabled: Bool) {
        dispatchPrecondition(condition: .onQueue(.main))
        sessionQueue.async {
            if enabled {
                self.startLivingLab()
            } else {
                self.cancelLivingLab(updatePicker: true)
            }
        }
    }

    private func currentLivingLabPickerState()
        -> BopFXLivingLabState
    {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        switch livingAssembly.phase {
        case .off:
            return .off
        case .collecting:
            if livingAssembly.hasRegisteredAllCaptures {
                return .processing
            }
            return .collecting(
                completedClipCount:
                    livingAssembly.completedClipCount)
        case .composing:
            return .processing
        case .ready:
            return .ready
        case .failed:
            return .failed
        }
    }

    private func startLivingLab() {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard let generation = sessionGeneration,
            session?.isRunning == true,
            livingPipeline != nil
        else {
            DispatchQueue.main.async {
                self.bopFXLabPicker?.setLivingState(.failed)
            }
            return
        }

        let previousDirectory = livingDirectoryURL
        livingCancellationToken?.cancel()
        nextLivingAttemptID &+= 1
        let attemptID = nextLivingAttemptID
        livingAttemptID = attemptID
        livingCancellationToken =
            BopFXLivingCancellationToken()
        _ = livingAssembly.start(
            generation: generation,
            attemptID: attemptID)
        livingLabEnabled = true
        livingCaptureStyles.removeAll(keepingCapacity: true)
        livingClips.removeAll(keepingCapacity: true)
        livingProcessingCaptureIDs.removeAll(keepingCapacity: true)
        pendingLivingCaptureID = nil
        pendingLivingWindowDeadline = nil
        livingOutputURL = nil
        livingDirectoryURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(
                "boothbop-living-\(generation)-\(attemptID)-\(UUID().uuidString)",
                isDirectory: true)
        sampleQueue.async {
            if let previousGeneration = self.sampleLivingGeneration {
                self.livingCaptureBuffer.cancelSession(
                    generation: previousGeneration)
            }
            self.sampleLivingGeneration = generation
            self.sampleLivingAttemptID = attemptID
            self.livingCaptureBuffer.startSession(
                generation: generation)
        }
        DispatchQueue.main.async {
            self.livingPickerAttemptID = attemptID
            self.stopLivingPlayer {
                self.cleanLivingDirectory(previousDirectory)
            }
            self.bopFXLabPicker?.setLivingState(
                .collecting(completedClipCount: 0))
        }
    }

    private func cancelLivingLab(updatePicker: Bool) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        let attemptID = livingAttemptID
        livingCancellationToken?.cancel()
        livingCancellationToken = nil
        if let generation = livingAssembly.generation,
            let attemptID
        {
            _ = livingAssembly.cancel(
                generation: generation,
                attemptID: attemptID)
            sampleQueue.async {
                self.livingCaptureBuffer.cancelSession(
                    generation: generation)
                if self.sampleLivingGeneration == generation,
                    self.sampleLivingAttemptID == attemptID
                {
                    self.sampleLivingGeneration = nil
                    self.sampleLivingAttemptID = nil
                }
            }
        }
        livingAttemptID = nil
        livingLabEnabled = false
        livingCaptureStyles.removeAll(keepingCapacity: true)
        livingClips.removeAll(keepingCapacity: true)
        livingProcessingCaptureIDs.removeAll(keepingCapacity: true)
        livingOutputURL = nil
        let directory = livingDirectoryURL
        livingDirectoryURL = nil
        pendingLivingCaptureID = nil
        pendingLivingWindowDeadline = nil
        DispatchQueue.main.async {
            if self.livingPickerAttemptID == attemptID {
                self.livingPickerAttemptID = nil
            }
            self.stopLivingPlayer {
                self.cleanLivingDirectory(directory)
            }
            if updatePicker {
                self.bopFXLabPicker?.setLivingState(.off)
            }
        }
    }

    private func prepareLivingLabForTeardown() {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        let shouldFinishOffCamera =
            (livingAssembly.phase == .collecting
                && livingAssembly.hasRegisteredAllCaptures
                && livingAssembly.successfulStillCaptureCount
                    == livingAssembly.registeredCaptureCount
                && pendingLivingCaptureID == nil)
            || livingAssembly.phase == .composing || livingAssembly.phase == .ready
        guard shouldFinishOffCamera else {
            cancelLivingLab(updatePicker: false)
            return
        }
        livingLabEnabled = false
        if let generation = livingAssembly.generation,
            let attemptID = livingAttemptID
        {
            sampleQueue.async {
                self.livingCaptureBuffer.cancelSession(
                    generation: generation)
                if self.sampleLivingGeneration == generation,
                    self.sampleLivingAttemptID == attemptID
                {
                    self.sampleLivingGeneration = nil
                    self.sampleLivingAttemptID = nil
                }
            }
        }
    }

    private func armLivingCaptureIfNeeded(
        captureID: Int64,
        effect: BopFXEffect,
        tuning: BopFXTuning
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingLabEnabled,
            let generation = sessionGeneration,
            let attemptID = livingAttemptID,
            livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAssembly.phase == .collecting
        else {
            return
        }
        let armed = sampleQueue.sync {
            guard sampleLivingGeneration == generation,
                sampleLivingAttemptID == attemptID
            else {
                return false
            }
            return livingCaptureBuffer.armShot(
                captureID: captureID,
                generation: generation)
        }
        guard armed,
            livingAssembly.registerCapture(
                id: captureID,
                generation: generation,
                attemptID: attemptID)
        else {
            if armed {
                sampleQueue.async {
                    _ = self.livingCaptureBuffer.cancelShot(
                        captureID: captureID,
                        generation: generation)
                }
            }
            transitionLivingLabToFailure(
                generation: generation,
                attemptID: attemptID)
            return
        }
        livingCaptureStyles[captureID] = LivingCaptureStyle(
            effect: effect,
            tuning: tuning)
        pendingLivingCaptureID = captureID
        pendingLivingWindowDeadline = Date().addingTimeInterval(
            Self.livingMotionWindowTimeout)
        sessionQueue.asyncAfter(
            deadline: .now() + Self.livingMotionWindowTimeout
        ) { [weak self] in
            self?.expireLivingWindowIfNeeded(
                captureID: captureID,
                generation: generation,
                attemptID: attemptID)
        }
    }

    private func resolveLivingShutterIfNeeded(
        captureID: Int64,
        timestamp: CMTime
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard let generation = livingAssembly.generation,
            let attemptID = livingAttemptID,
            livingAssembly.attemptID == attemptID,
            livingAssembly.containsCapture(id: captureID)
        else {
            return
        }
        sampleQueue.async {
            let update = self.livingCaptureBuffer.resolveShutter(
                captureID: captureID,
                timestamp: timestamp,
                generation: generation)
            if case .ignored = update {
                self.sessionQueue.async {
                    self.resolveLivingWindow(
                        captureID: captureID,
                        generation: generation,
                        attemptID: attemptID)
                    guard
                        self.livingAssembly.markClipFailed(
                            captureID: captureID,
                            generation: generation,
                            attemptID: attemptID) == .failed
                    else {
                        return
                    }
                    self.transitionLivingLabToFailure(
                        generation: generation,
                        attemptID: attemptID)
                }
                return
            }
            self.publishLivingCaptureUpdate(
                update,
                generation: generation,
                attemptID: attemptID)
        }
    }

    private func failLivingCaptureIfNeeded(
        captureID: Int64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard let generation = livingAssembly.generation,
            let attemptID = livingAttemptID,
            livingAssembly.attemptID == attemptID,
            livingAssembly.containsCapture(id: captureID)
        else {
            return
        }
        sampleQueue.async {
            _ = self.livingCaptureBuffer.cancelShot(
                captureID: captureID,
                generation: generation)
        }
        guard
            livingAssembly.markClipFailed(
                captureID: captureID,
                generation: generation,
                attemptID: attemptID) == .failed
        else {
            return
        }
        transitionLivingLabToFailure(
            generation: generation,
            attemptID: attemptID)
    }

    private func publishLivingCaptureUpdate(
        _ update: BopFXLivingCaptureUpdate,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sampleQueue))
        switch update {
        case .ignored, .collecting:
            return
        case .failed(let captureID, _):
            sessionQueue.async {
                self.resolveLivingWindow(
                    captureID: captureID,
                    generation: generation,
                    attemptID: attemptID)
                guard
                    self.livingAssembly.markClipFailed(
                        captureID: captureID,
                        generation: generation,
                        attemptID: attemptID) == .failed
                else {
                    return
                }
                self.transitionLivingLabToFailure(
                    generation: generation,
                    attemptID: attemptID)
            }
        case .completed(let shot):
            sessionQueue.async {
                self.resolveLivingWindow(
                    captureID: shot.captureID,
                    generation: generation,
                    attemptID: attemptID)
                self.processLivingShot(
                    shot,
                    generation: generation,
                    attemptID: attemptID)
            }
        }
    }

    private func resolveLivingWindow(
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            pendingLivingCaptureID == captureID
        else {
            return
        }
        pendingLivingCaptureID = nil
        pendingLivingWindowDeadline = nil
    }

    private func expireLivingWindowIfNeeded(
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            pendingLivingCaptureID == captureID
        else {
            return
        }
        pendingLivingCaptureID = nil
        pendingLivingWindowDeadline = nil
        sampleQueue.async {
            _ = self.livingCaptureBuffer.cancelShot(
                captureID: captureID,
                generation: generation)
        }
        guard
            livingAssembly.markClipFailed(
                captureID: captureID,
                generation: generation,
                attemptID: attemptID) == .failed
        else {
            return
        }
        transitionLivingLabToFailure(
            generation: generation,
            attemptID: attemptID)
    }

    private func deferStopForLivingWindowIfNeeded(
        _ call: CAPPluginCall
    ) -> Bool {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        let now = Date.timeIntervalSinceReferenceDate
        guard
            let remaining = livingAssembly.stopDeferralDelay(
                pendingCaptureID: pendingLivingCaptureID,
                deadline: pendingLivingWindowDeadline?
                    .timeIntervalSinceReferenceDate,
                now: now)
        else {
            return false
        }
        sessionQueue.asyncAfter(
            deadline: .now() + remaining
        ) { [weak self] in
            guard let self else {
                call.resolve()
                return
            }
            self.tearDownSession(
                rejectPending: true,
                preserveCompletedDebugWork: true
            ) {
                call.resolve()
            }
        }
        return true
    }

    private func processLivingShot(
        _ shot: BopFXLivingShot,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            livingAssembly.phase == .collecting,
            let style = livingCaptureStyles.removeValue(
                forKey: shot.captureID),
            let pipeline = livingPipeline,
            let cancellation = livingCancellationToken
        else {
            return
        }
        livingProcessingCaptureIDs.insert(shot.captureID)
        let absoluteDeadline = Date().addingTimeInterval(
            Self.livingProcessingTimeout)
        sessionQueue.asyncAfter(
            deadline: .now() + Self.livingProcessingTimeout
        ) { [weak self] in
            self?.expireLivingProcessingIfNeeded(
                captureID: shot.captureID,
                generation: generation,
                attemptID: attemptID)
        }

        livingNormalizationQueue.async {
            let normalized: Result<BopFXLivingClip, Error> =
                autoreleasepool {
                    Result {
                        try pipeline.builder.normalize(
                            shot: shot,
                            cancellation: cancellation,
                            absoluteDeadline: absoluteDeadline)
                    }
                }
            switch normalized {
            case .failure:
                self.sessionQueue.async {
                    guard
                        self.livingAssembly.markClipFailed(
                            captureID: shot.captureID,
                            generation: generation,
                            attemptID: attemptID) == .failed
                    else {
                        return
                    }
                    self.transitionLivingLabToFailure(
                        generation: generation,
                        attemptID: attemptID)
                }
            case .success(let clip):
                self.livingProcessingQueue.async {
                    let shouldRender = self.sessionQueue.sync {
                        self.livingAssembly.generation == generation
                            && self.livingAssembly.attemptID == attemptID
                            && self.livingAttemptID == attemptID
                            && self.livingAssembly.phase == .collecting
                            && !cancellation.isCancelled
                    }
                    guard shouldRender else { return }
                    let rendered: Result<BopFXLivingClip, Error> =
                        autoreleasepool {
                            Result {
                                try pipeline.builder.apply(
                                    effect: style.effect,
                                    tuning: style.tuning,
                                    to: clip,
                                    renderer: pipeline.renderer,
                                    cancellation: cancellation,
                                    absoluteDeadline: absoluteDeadline)
                            }
                        }
                    self.sessionQueue.async {
                        self.publishLivingClip(
                            rendered,
                            captureID: shot.captureID,
                            generation: generation,
                            attemptID: attemptID)
                    }
                }
            }
        }
    }

    private func publishLivingClip(
        _ result: Result<BopFXLivingClip, Error>,
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            livingAssembly.phase == .collecting,
            livingAssembly.containsCapture(id: captureID),
            livingCancellationToken?.isCancelled == false
        else {
            return
        }
        livingProcessingCaptureIDs.remove(captureID)
        guard case .success(let clip) = result else {
            guard
                livingAssembly.markClipFailed(
                    captureID: captureID,
                    generation: generation,
                    attemptID: attemptID) == .failed
            else {
                return
            }
            transitionLivingLabToFailure(
                generation: generation,
                attemptID: attemptID)
            return
        }

        livingClips[captureID] = clip
        let update = livingAssembly.markClipReady(
            captureID: captureID,
            generation: generation,
            attemptID: attemptID)
        handleLivingAssemblyUpdate(
            update,
            generation: generation,
            attemptID: attemptID)
    }

    private func expireLivingProcessingIfNeeded(
        captureID: Int64,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            livingProcessingCaptureIDs.remove(captureID) != nil
        else {
            return
        }
        guard
            livingAssembly.markClipFailed(
                captureID: captureID,
                generation: generation,
                attemptID: attemptID) == .failed
        else {
            return
        }
        transitionLivingLabToFailure(
            generation: generation,
            attemptID: attemptID)
    }

    private func handleLivingAssemblyUpdate(
        _ update: LivingStripAssemblyUpdate,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            let cancellation = livingCancellationToken,
            !cancellation.isCancelled
        else {
            return
        }
        switch update {
        case .collecting(let completedClipCount):
            DispatchQueue.main.async {
                guard self.livingPickerAttemptID == attemptID else {
                    return
                }
                self.bopFXLabPicker?.setLivingState(
                    .collecting(
                        completedClipCount: completedClipCount))
            }
        case .compose(let captureIDs):
            guard
                let directory = livingDirectoryURL,
                captureIDs.allSatisfy({
                    livingClips[$0] != nil
                })
            else {
                _ = livingAssembly.markCompositionFailed(
                    generation: generation,
                    attemptID: attemptID)
                transitionLivingLabToFailure(
                    generation: generation,
                    attemptID: attemptID)
                return
            }
            livingLabEnabled = false
            livingCaptureStyles.removeAll(keepingCapacity: true)
            let clips = captureIDs.compactMap {
                livingClips[$0]
            }
            sampleQueue.async {
                self.livingCaptureBuffer.cancelSession(
                    generation: generation)
                if self.sampleLivingGeneration == generation,
                    self.sampleLivingAttemptID == attemptID
                {
                    self.sampleLivingGeneration = nil
                    self.sampleLivingAttemptID = nil
                }
            }
            DispatchQueue.main.async {
                guard self.livingPickerAttemptID == attemptID else {
                    return
                }
                self.bopFXLabPicker?.setLivingState(.processing)
            }
            composeLivingStrip(
                clips: clips,
                directory: directory,
                generation: generation,
                attemptID: attemptID,
                cancellation: cancellation)
        case .ignored, .ready, .failed:
            return
        }
    }

    private func composeLivingStrip(
        clips: [BopFXLivingClip],
        directory: URL,
        generation: UInt64,
        attemptID: UInt64,
        cancellation: BopFXLivingCancellationToken
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        livingProcessingQueue.async {
            let result: Result<URL, Error> = autoreleasepool {
                Result {
                    try FileManager.default.createDirectory(
                        at: directory,
                        withIntermediateDirectories: true)
                    return try BopFXLivingStripWriter.write(
                        clips: clips,
                        directory: directory,
                        cancellation: cancellation)
                }
            }
            self.sessionQueue.async {
                self.publishLivingStrip(
                    result,
                    directory: directory,
                    generation: generation,
                    attemptID: attemptID)
            }
        }
    }

    private func publishLivingStrip(
        _ result: Result<URL, Error>,
        directory: URL,
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID,
            livingAssembly.phase == .composing,
            livingDirectoryURL == directory
        else {
            cleanLivingDirectory(directory)
            return
        }
        guard case .success(let outputURL) = result,
            livingAssembly.markCompositionSucceeded(
                generation: generation,
                attemptID: attemptID) == .ready
        else {
            _ = livingAssembly.markCompositionFailed(
                generation: generation,
                attemptID: attemptID)
            transitionLivingLabToFailure(
                generation: generation,
                attemptID: attemptID)
            return
        }

        livingOutputURL = outputURL
        livingClips.removeAll(keepingCapacity: true)
        DispatchQueue.main.async {
            guard self.livingPickerAttemptID == attemptID else {
                return
            }
            self.bopFXLabPicker?.setLivingState(.ready)
        }
    }

    private func transitionLivingLabToFailure(
        generation: UInt64,
        attemptID: UInt64
    ) {
        dispatchPrecondition(condition: .onQueue(sessionQueue))
        guard livingAssembly.generation == generation,
            livingAssembly.attemptID == attemptID,
            livingAttemptID == attemptID
        else {
            return
        }
        _ = livingAssembly.markFailed(
            generation: generation,
            attemptID: attemptID)
        livingCancellationToken?.cancel()
        livingCancellationToken = nil
        livingLabEnabled = false
        livingCaptureStyles.removeAll(keepingCapacity: true)
        livingClips.removeAll(keepingCapacity: true)
        livingProcessingCaptureIDs.removeAll(keepingCapacity: true)
        pendingLivingCaptureID = nil
        pendingLivingWindowDeadline = nil
        livingOutputURL = nil
        let directory = livingDirectoryURL
        livingDirectoryURL = nil
        sampleQueue.async {
            self.livingCaptureBuffer.cancelSession(
                generation: generation)
            if self.sampleLivingGeneration == generation,
                self.sampleLivingAttemptID == attemptID
            {
                self.sampleLivingGeneration = nil
                self.sampleLivingAttemptID = nil
            }
        }
        DispatchQueue.main.async {
            guard self.livingPickerAttemptID == attemptID else {
                self.cleanLivingDirectory(directory)
                return
            }
            self.stopLivingPlayer {
                self.cleanLivingDirectory(directory)
            }
            self.bopFXLabPicker?.setLivingState(.failed)
        }
    }

    private func cleanLivingDirectory(_ directory: URL?) {
        guard let directory else { return }
        livingCleanupQueue.async {
            try? FileManager.default.removeItem(
                at: directory)
        }
    }

    private func playLivingStrip() {
        dispatchPrecondition(condition: .onQueue(.main))
        sessionQueue.async {
            guard self.livingAssembly.phase == .ready,
                let attemptID = self.livingAttemptID,
                self.livingAssembly.attemptID == attemptID,
                let outputURL = self.livingOutputURL,
                FileManager.default.fileExists(
                    atPath: outputURL.path)
            else {
                return
            }
            DispatchQueue.main.async {
                guard
                    self.livingPickerAttemptID == attemptID,
                    let presenter = self.bridge?.viewController,
                    presenter.presentedViewController == nil
                else {
                    return
                }
                self.stopLivingPlayer()
                let player = AVQueuePlayer()
                let item = AVPlayerItem(url: outputURL)
                let looper = AVPlayerLooper(
                    player: player,
                    templateItem: item)
                let playerViewController =
                    BopFXLivingPlayerViewController()
                playerViewController.player = player
                playerViewController.onDismiss = {
                    [weak self, weak playerViewController] in
                    guard let self,
                        self.livingPlayerViewController
                            === playerViewController
                    else {
                        return
                    }
                    self.releaseLivingPlayer()
                }
                self.livingPlayer = player
                self.livingPlayerLooper = looper
                self.livingPlayerViewController =
                    playerViewController
                presenter.present(
                    playerViewController,
                    animated: true
                ) {
                    player.play()
                }
            }
        }
    }

    private func stopLivingPlayer(
        completion: (() -> Void)? = nil
    ) {
        dispatchPrecondition(condition: .onQueue(.main))
        let controller = livingPlayerViewController
        controller?.onDismiss = nil
        releaseLivingPlayer()
        guard let controller,
            controller.presentingViewController != nil
        else {
            completion?()
            return
        }
        controller.dismiss(
            animated: false,
            completion: completion)
    }

    private func releaseLivingPlayer() {
        dispatchPrecondition(condition: .onQueue(.main))
        livingPlayer?.pause()
        livingPlayer?.removeAllItems()
        livingPlayerLooper?.disableLooping()
        livingPlayerViewController?.player = nil
        livingPlayerViewController?.onDismiss = nil
        livingPlayerViewController = nil
        livingPlayerLooper = nil
        livingPlayer = nil
    }
    #endif

    deinit {
        let center = NotificationCenter.default
        applicationObservers.forEach(center.removeObserver)
        sessionObservers.forEach(center.removeObserver)
        pendingStartCall?.reject("Camera released", "cancelled")
        pendingCaptureCall?.reject("Camera released", "cancelled")
        videoOutput?.setSampleBufferDelegate(nil, queue: nil)
        metadataOutput?.setMetadataObjectsDelegate(nil, queue: nil)
        let activeSession = session
        let nativePreview = previewView
        let nativePreviewLayer = previewLayer
        let rootView = bridge?.viewController?.view
        let webView = bridge?.webView
        #if DEBUG
        let debugLivingDirectory = livingDirectoryURL
        let debugLivingCancellation = livingCancellationToken
        let debugLivingPlayer = livingPlayer
        let debugLivingLooper = livingPlayerLooper
        let debugLivingPlayerViewController =
            livingPlayerViewController
        debugLivingCancellation?.cancel()
        livingCleanupQueue.async {
            if let debugLivingDirectory {
                try? FileManager.default.removeItem(
                    at: debugLivingDirectory)
            }
        }
        #endif
        sessionQueue.async {
            if activeSession?.isRunning == true {
                activeSession?.stopRunning()
            }
            DispatchQueue.main.async {
                nativePreviewLayer?.session = nil
                nativePreviewLayer?.removeFromSuperlayer()
                nativePreview?.removeFromSuperview()
                rootView?.backgroundColor = .boothBopCanvas
                webView?.isOpaque = false
                webView?.backgroundColor = .boothBopCanvas
                webView?.scrollView.backgroundColor = .boothBopCanvas
                #if DEBUG
                debugLivingPlayer?.pause()
                debugLivingPlayer?.removeAllItems()
                debugLivingLooper?.disableLooping()
                debugLivingPlayerViewController?.player = nil
                debugLivingPlayerViewController?.onDismiss = nil
                #endif
            }
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
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
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
            AVVideoAllowFrameReorderingKey: false,
        ]
        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoColorPropertiesKey: [
                AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
            ],
            AVVideoCompressionPropertiesKey: compression,
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
            kCVPixelBufferIOSurfacePropertiesKey as String: [:],
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
                                || Date() >= appendDeadline
                            {
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
            let image = UIImage(data: data)?.cgImage
        else {
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
        guard
            let ctx = CGContext(
                data: CVPixelBufferGetBaseAddress(buffer),
                width: width, height: height,
                bitsPerComponent: 8,
                bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                space: CGColorSpace(name: CGColorSpace.sRGB)!,
                bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
                    | CGBitmapInfo.byteOrder32Little.rawValue
            )
        else { throw VideoError.decode }

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
        bridge?.registerPluginInstance(BoothBopLaunch())
        bridge?.registerPluginInstance(BoothBopPhotos())
        bridge?.registerPluginInstance(BoothBopCamera())
        bridge?.registerPluginInstance(BoothBopVideo())
    }
}
