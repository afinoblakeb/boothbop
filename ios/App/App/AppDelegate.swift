import UIKit
import Capacitor
import Photos

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

// Custom bridge VC: registers our local plugin in code so it never depends on
// the SPM auto-registration path that failed for the third-party plugin.
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BoothBopPhotos())
    }
}
