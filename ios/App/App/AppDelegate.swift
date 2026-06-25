import UIKit
import Capacitor
import Photos
import AVFoundation
import StoreKit

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

// The Main storyboard (referenced by the scene manifest) supplies the Capacitor
// bridge view controller and the window automatically, so this scene delegate
// only forwards URL / user-activity opens to Capacitor (deep links, universal
// links). Defined here, in the existing file, to avoid Xcode project edits.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

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
        CAPPluginMethod(name: "make", returnType: CAPPluginReturnPromise)
    ]

    private enum VideoError: Error { case decode, writer, append }

    // make({ images: [base64 jpeg], size, bitrate, frameMs, loops, fps }) -> { base64 }
    @objc func make(_ call: CAPPluginCall) {
        let images = call.getArray("images", String.self) ?? []
        guard !images.isEmpty else {
            return call.reject("No frames provided", "argumentError")
        }
        let size = call.getInt("size") ?? 720
        let bitrate = call.getInt("bitrate") ?? 6_000_000
        let frameMs = call.getInt("frameMs") ?? 600
        let loops = max(1, call.getInt("loops") ?? 2)
        let fps = max(1, call.getInt("fps") ?? 30)

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let data = try self.renderMP4(
                    images: images, size: size, bitrate: bitrate,
                    frameMs: frameMs, loops: loops, fps: fps)
                call.resolve(["base64": data.base64EncodedString()])
            } catch {
                call.reject("Video render failed: \(error.localizedDescription)", "renderError")
            }
        }
    }

    private func renderMP4(
        images: [String], size: Int, bitrate: Int,
        frameMs: Int, loops: Int, fps: Int
    ) throws -> Data {
        let outURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("boothbop-\(UUID().uuidString).mp4")
        try? FileManager.default.removeItem(at: outURL)

        let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: size,
            AVVideoHeightKey: size,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate]
        ]
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = false
        let attrs: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
            kCVPixelBufferWidthKey as String: size,
            kCVPixelBufferHeightKey as String: size
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input, sourcePixelBufferAttributes: attrs)
        guard writer.canAdd(input) else { throw VideoError.writer }
        writer.add(input)
        guard writer.startWriting() else { throw writer.error ?? VideoError.writer }
        writer.startSession(atSourceTime: .zero)

        // Decode each frame to a pixel buffer once, then hold it for its slot.
        let buffers = try images.map { try self.pixelBuffer(fromBase64: $0, size: size) }
        let framesPerPhoto = max(1, Int((Double(frameMs) / 1000.0 * Double(fps)).rounded()))
        let timescale = CMTimeScale(fps)
        var frameIndex: Int64 = 0

        for _ in 0..<loops {
            for buffer in buffers {
                for _ in 0..<framesPerPhoto {
                    while !input.isReadyForMoreMediaData { usleep(2000) }
                    let time = CMTime(value: frameIndex, timescale: timescale)
                    if !adaptor.append(buffer, withPresentationTime: time) {
                        throw writer.error ?? VideoError.append
                    }
                    frameIndex += 1
                }
            }
        }

        input.markAsFinished()
        let sem = DispatchSemaphore(value: 0)
        writer.finishWriting { sem.signal() }
        sem.wait()
        guard writer.status == .completed else { throw writer.error ?? VideoError.writer }

        let data = try Data(contentsOf: outURL)
        try? FileManager.default.removeItem(at: outURL)
        return data
    }

    private func pixelBuffer(fromBase64 base64: String, size: Int) throws -> CVPixelBuffer {
        // Tolerate an optional "data:...;base64," prefix.
        let raw = base64.contains(",") ? String(base64.split(separator: ",").last ?? "") : base64
        guard let data = Data(base64Encoded: raw),
              let image = UIImage(data: data)?.cgImage else {
            throw VideoError.decode
        }

        let attrs: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ]
        var pb: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault, size, size,
            kCVPixelFormatType_32BGRA, attrs as CFDictionary, &pb)
        guard status == kCVReturnSuccess, let buffer = pb else { throw VideoError.decode }

        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
        guard let ctx = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: size, height: size,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
                | CGBitmapInfo.byteOrder32Little.rawValue
        ) else { throw VideoError.decode }

        ctx.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
        return buffer
    }
}

// MARK: - BoothBopStore: in-app purchases via StoreKit 2
//
// A tiny local plugin for the one-time "Remove Watermark" non-consumable. Uses
// StoreKit 2 (iOS 15+) directly — NO third-party SDK (e.g. RevenueCat), which
// would phone home and break our "Data Not Collected" privacy label. Apple owns
// the entitlement, so a non-consumable stays with the user forever and syncs
// across their devices via their Apple ID. Registered in code below.
@objc(BoothBopStore)
public class BoothBopStore: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BoothBopStore"
    public let jsName = "BoothBopStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isPurchased", returnType: CAPPluginReturnPromise),
    ]

    // getProducts({ productIds: [String] }) -> { products: [{ id, displayName, description, price }] }
    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                let arr: [[String: String]] = products.map { p in
                    [
                        "id": p.id,
                        "displayName": p.displayName,
                        "description": p.description,
                        "price": p.displayPrice, // already localized, e.g. "$0.99"
                    ]
                }
                call.resolve(["products": arr])
            } catch {
                call.reject("Couldn't load products: \(error.localizedDescription)")
            }
        }
    }

    // purchase({ productId }) -> { status: "purchased"|"pending"|"cancelled", purchased: Bool }
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            return call.reject("productId required", "argumentError")
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    return call.reject("Product not found", "notFound")
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    if case .verified(let transaction) = verification {
                        await transaction.finish()
                        call.resolve(["status": "purchased", "purchased": true])
                    } else {
                        call.reject("Purchase could not be verified", "unverified")
                    }
                case .userCancelled:
                    call.resolve(["status": "cancelled", "purchased": false])
                case .pending:
                    call.resolve(["status": "pending", "purchased": false])
                @unknown default:
                    call.resolve(["status": "unknown", "purchased": false])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)", "purchaseError")
            }
        }
    }

    // restore() -> { restored: Bool } — user-initiated; syncs then re-checks.
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                let owned = await self.hasEntitlement(nil)
                call.resolve(["restored": owned])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)", "restoreError")
            }
        }
    }

    // isPurchased({ productId }) -> { purchased: Bool } — silent, offline-safe.
    @objc func isPurchased(_ call: CAPPluginCall) {
        let productId = call.getString("productId")
        Task {
            let owned = await self.hasEntitlement(productId)
            call.resolve(["purchased": owned])
        }
    }

    private func hasEntitlement(_ productId: String?) async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               transaction.revocationDate == nil,
               productId == nil || transaction.productID == productId {
                return true
            }
        }
        return false
    }
}

// Custom bridge VC: registers our local plugins in code so they never depend on
// the SPM auto-registration path that failed for the third-party plugin.
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BoothBopPhotos())
        bridge?.registerPluginInstance(BoothBopVideo())
        bridge?.registerPluginInstance(BoothBopStore())
    }
}
