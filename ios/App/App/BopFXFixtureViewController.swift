#if DEBUG
import UIKit

final class BopFXFixtureViewController: UIViewController {
    private let contentStack = UIStackView()
    private var imageViews: [BopFXEffect: UIImageView] = [:]
    private var detailLabels: [BopFXEffect: UILabel] = [:]
    private let renderQueue = DispatchQueue(
        label: "com.boothbop.bopfx.fixture-render",
        qos: .userInitiated)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        configureLayout()
        renderFixtures()
    }

    private func configureLayout() {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.alwaysBounceVertical = true
        view.addSubview(scrollView)

        contentStack.translatesAutoresizingMaskIntoConstraints = false
        contentStack.axis = .vertical
        contentStack.spacing = 12
        scrollView.addSubview(contentStack)

        let title = UILabel()
        title.text = "BopFX Native Lab"
        title.font = .preferredFont(forTextStyle: .title2)
        title.adjustsFontForContentSizeCategory = true
        title.accessibilityTraits = .header
        contentStack.addArrangedSubview(title)

        let subtitle = UILabel()
        subtitle.text = "One source. Native Vision + Core Image + Metal."
        subtitle.font = .preferredFont(forTextStyle: .subheadline)
        subtitle.textColor = .secondaryLabel
        subtitle.numberOfLines = 0
        contentStack.addArrangedSubview(subtitle)

        var effects = BopFXEffect.allCases
        while !effects.isEmpty {
            let row = UIStackView()
            row.axis = .horizontal
            row.alignment = .top
            row.distribution = .fillEqually
            row.spacing = 10
            for _ in 0..<2 {
                guard !effects.isEmpty else {
                    row.addArrangedSubview(UIView())
                    break
                }
                row.addArrangedSubview(makeCard(for: effects.removeFirst()))
            }
            contentStack.addArrangedSubview(row)
        }

        NSLayoutConstraint.activate([
            scrollView.leadingAnchor.constraint(
                equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            scrollView.trailingAnchor.constraint(
                equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            scrollView.topAnchor.constraint(
                equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.bottomAnchor.constraint(
                equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            contentStack.leadingAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.leadingAnchor,
                constant: 12),
            contentStack.trailingAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.trailingAnchor,
                constant: -12),
            contentStack.topAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.topAnchor,
                constant: 12),
            contentStack.bottomAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.bottomAnchor,
                constant: -12),
            contentStack.widthAnchor.constraint(
                equalTo: scrollView.frameLayoutGuide.widthAnchor,
                constant: -24),
        ])
    }

    private func makeCard(for effect: BopFXEffect) -> UIView {
        let card = UIStackView()
        card.axis = .vertical
        card.spacing = 6
        card.isLayoutMarginsRelativeArrangement = true
        card.layoutMargins = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        card.backgroundColor = .secondarySystemBackground
        card.layer.cornerRadius = 8
        card.layer.cornerCurve = .continuous

        let label = UILabel()
        label.text = effect.fixtureTitle
        label.font = .preferredFont(forTextStyle: .headline)
        label.adjustsFontForContentSizeCategory = true
        card.addArrangedSubview(label)

        let detail = UILabel()
        detail.text = "Rendering..."
        detail.font = .preferredFont(forTextStyle: .caption2)
        detail.textColor = .secondaryLabel
        detail.adjustsFontForContentSizeCategory = true
        detail.numberOfLines = 2
        card.addArrangedSubview(detail)
        detailLabels[effect] = detail

        let imageView = UIImageView()
        imageView.backgroundColor = .black
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 5
        imageView.layer.cornerCurve = .continuous
        imageView.accessibilityLabel = "\(effect.fixtureTitle) result"
        imageView.heightAnchor.constraint(
            equalTo: imageView.widthAnchor).isActive = true
        card.addArrangedSubview(imageView)
        imageViews[effect] = imageView
        return card
    }

    private func renderFixtures() {
        guard let sourceURL = Bundle.main.url(
            forResource: "set1-1",
            withExtension: "jpg"),
            let source = UIImage(contentsOfFile: sourceURL.path),
            let renderer = BopFXRenderer(),
            let directory = labDirectory() else {
            showFailure()
            return
        }
        var capabilities = BopFXNativeSupport.payload
        capabilities["deviceClass"] = UIDevice.current.model
        capabilities["systemName"] = UIDevice.current.systemName
        capabilities["systemVersion"] = UIDevice.current.systemVersion

        renderQueue.async { [weak self] in
            guard let self else { return }
            self.writeJSON(capabilities, filename: "capabilities.json")
            var reports: [[String: Any]] = []
            for effect in BopFXEffect.allCases {
                let coldResult: BopFXStillRender? = autoreleasepool {
                    renderer.renderStillResult(
                        source,
                        effect: effect,
                        phase: 0.2)
                }
                let warmResult: BopFXStillRender? = autoreleasepool {
                    renderer.renderStillResult(
                        source,
                        effect: effect,
                        phase: 0.2)
                }
                let result = warmResult ?? coldResult
                guard let result else {
                    reports.append([
                        "effect": effect.rawValue,
                        "rendered": false,
                    ])
                    continue
                }
                let rendered = result.image
                self.writeFixture(rendered, effect: effect)
                var report: [String: Any] = [
                    "effect": effect.rawValue,
                    "rendered": true,
                    "faceCount": result.faceCount,
                    "personMask": result.personMaskAvailable,
                    "coldDurationMs":
                        coldResult?.durationMilliseconds ?? NSNull(),
                    "warmDurationMs":
                        warmResult?.durationMilliseconds ?? NSNull(),
                    "analysisError": result.analysisError ?? NSNull(),
                ]
                do {
                    let recording = try BopFXLabVideoWriter.write(
                        source: source,
                        renderer: renderer,
                        effect: effect,
                        directory: directory)
                    report["recording"] = recording.lastPathComponent
                } catch {
                    report["recordingError"] = error.localizedDescription
                }
                reports.append(report)
                DispatchQueue.main.async {
                    self.imageViews[effect]?.image = rendered
                    self.detailLabels[effect]?.text = self.detailText(
                        for: result,
                        coldDuration: coldResult?.durationMilliseconds)
                }
            }
            self.writeJSON(reports, filename: "report.json")
        }
    }

    private func writeFixture(_ image: UIImage, effect: BopFXEffect) {
        guard let data = image.pngData(),
              let directory = labDirectory() else { return }
        try? data.write(
            to: directory.appendingPathComponent("\(effect.rawValue).png"),
            options: .atomic)
    }

    private func writeJSON(_ value: Any, filename: String) {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(
                withJSONObject: value,
                options: [.prettyPrinted, .sortedKeys]),
              let directory = labDirectory() else { return }
        try? data.write(
            to: directory.appendingPathComponent(filename),
            options: .atomic)
    }

    private func labDirectory() -> URL? {
        guard let documents = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask).first else { return nil }
        let directory = documents.appendingPathComponent(
            "BopFXLab",
            isDirectory: true)
        do {
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true)
            return directory
        } catch {
            return nil
        }
    }

    private func detailText(
        for result: BopFXStillRender,
        coldDuration: Int?
    ) -> String {
        if let error = result.analysisError {
            return "\(result.durationMilliseconds) ms warm - \(error)"
        }
        return [
            coldDuration.map {
                "\($0) -> \(result.durationMilliseconds) ms"
            } ?? "\(result.durationMilliseconds) ms",
            "faces \(result.faceCount)",
            result.personMaskAvailable ? "person mask" : nil,
        ].compactMap { $0 }.joined(separator: " - ")
    }

    private func showFailure() {
        let label = UILabel()
        label.text = "Native renderer or fixture unavailable."
        label.textColor = .systemRed
        label.numberOfLines = 0
        contentStack.addArrangedSubview(label)
    }
}

private extension BopFXEffect {
    var fixtureTitle: String {
        switch self {
        case .original: return "Original"
        case .spectralEcho: return "Spectral Echo"
        case .funhouse: return "Funhouse"
        case .cutoutChorus: return "Cutout Chorus"
        case .mirrorBloom: return "Mirror Bloom"
        }
    }
}
#endif
