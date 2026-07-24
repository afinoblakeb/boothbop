#if DEBUG
import UIKit

enum BopFXLivingLabState: Equatable {
    case off
    case collecting(completedClipCount: Int)
    case processing
    case ready
    case failed
}

final class BopFXLabPicker: UIVisualEffectView {
    var onSelect: ((BopFXEffect) -> Void)?
    var onSelectSequence: (() -> Void)?
    var onToggleLiving: ((Bool) -> Void)?
    var onPlayLiving: (() -> Void)?

    private let scrollView = UIScrollView()
    private let stackView = UIStackView()
    private let sequenceButton = UIButton(type: .system)
    private let livingButton = UIButton(type: .system)
    private let playLivingButton = UIButton(type: .system)
    private var buttons: [BopFXEffect: UIButton] = [:]
    private var selectedEffect: BopFXEffect
    private var sequenceSelected = false
    private var livingState = BopFXLivingLabState.off

    init(effect: BopFXEffect) {
        self.selectedEffect = effect
        super.init(effect: UIBlurEffect(style: .systemUltraThinMaterialDark))
        configure()
        setEffect(effect, announce: false)
    }

    required init?(coder: NSCoder) {
        return nil
    }

    func setEffect(_ effect: BopFXEffect, announce: Bool = false) {
        selectedEffect = effect
        sequenceSelected = false
        updateSelection()
        if announce {
            announceSelection("\(effect.labTitle) effect")
        }
    }

    func setSequenceEffect(
        _ effect: BopFXEffect,
        announce: Bool = false
    ) {
        selectedEffect = effect
        sequenceSelected = true
        updateSelection()
        if announce {
            announceSelection("Sequence mode")
        }
    }

    func setLivingState(_ state: BopFXLivingLabState) {
        livingState = state
        switch state {
        case .off:
            livingButton.configuration?.title = "Live"
            livingButton.isEnabled = true
            playLivingButton.isHidden = true
        case .collecting(let completedClipCount):
            livingButton.configuration?.title =
                "Live \(completedClipCount)/4"
            livingButton.isEnabled = true
            playLivingButton.isHidden = true
        case .processing:
            livingButton.configuration?.title = "Live 4/4"
            livingButton.isEnabled = false
            playLivingButton.isHidden = true
        case .ready:
            livingButton.configuration?.title = "Live Ready"
            livingButton.isEnabled = true
            playLivingButton.isHidden = false
        case .failed:
            livingButton.configuration?.title = "Live Retry"
            livingButton.isEnabled = true
            playLivingButton.isHidden = true
        }
        updateSelection()
    }

    private func updateSelection() {
        for (candidate, button) in buttons {
            applySelection(
                !sequenceSelected && candidate == selectedEffect,
                to: button)
        }
        applySelection(sequenceSelected, to: sequenceButton)
        applySelection(livingState.isActive, to: livingButton)
        let selectedButton =
            sequenceSelected
            ? sequenceButton
            : buttons[selectedEffect]
        if let selectedButton {
            DispatchQueue.main.async {
                self.scrollView.scrollRectToVisible(
                    selectedButton.frame.insetBy(dx: -6, dy: 0),
                    animated: true)
            }
        }
    }

    private func configure() {
        clipsToBounds = true
        layer.cornerRadius = 17
        layer.cornerCurve = .continuous
        accessibilityLabel = "BopFX effect picker"

        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.alwaysBounceHorizontal = true
        contentView.addSubview(scrollView)

        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.spacing = 6
        scrollView.addSubview(stackView)

        NSLayoutConstraint.activate([
            scrollView.leadingAnchor.constraint(
                equalTo: contentView.leadingAnchor,
                constant: 6),
            scrollView.trailingAnchor.constraint(
                equalTo: contentView.trailingAnchor,
                constant: -6),
            scrollView.topAnchor.constraint(
                equalTo: contentView.topAnchor,
                constant: 5),
            scrollView.bottomAnchor.constraint(
                equalTo: contentView.bottomAnchor,
                constant: -5),
            stackView.leadingAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            stackView.trailingAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            stackView.topAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.topAnchor),
            stackView.bottomAnchor.constraint(
                equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            stackView.heightAnchor.constraint(
                equalTo: scrollView.frameLayoutGuide.heightAnchor),
        ])

        for effect in BopFXEffect.allCases {
            let button = configuredButton(title: effect.labTitle)
            button.accessibilityLabel = "\(effect.labTitle) effect"
            button.addAction(
                UIAction { [weak self] _ in
                    self?.choose(effect)
                },
                for: .touchUpInside)
            button.heightAnchor.constraint(equalToConstant: 34).isActive = true
            stackView.addArrangedSubview(button)
            buttons[effect] = button
        }

        configure(sequenceButton, title: "Sequence")
        sequenceButton.accessibilityLabel = "Four effect sequence"
        sequenceButton.addAction(
            UIAction { [weak self] _ in
                self?.chooseSequence()
            },
            for: .touchUpInside)
        sequenceButton.heightAnchor.constraint(
            equalToConstant: 34
        ).isActive = true
        stackView.addArrangedSubview(sequenceButton)

        configure(livingButton, title: "Live")
        livingButton.accessibilityLabel = "Living Strip motion capture"
        livingButton.addAction(
            UIAction { [weak self] _ in
                self?.toggleLiving()
            },
            for: .touchUpInside)
        livingButton.heightAnchor.constraint(
            equalToConstant: 34
        ).isActive = true
        stackView.addArrangedSubview(livingButton)

        configure(playLivingButton, title: "Play")
        playLivingButton.accessibilityLabel = "Play Living Strip"
        playLivingButton.addAction(
            UIAction { [weak self] _ in
                self?.onPlayLiving?()
            },
            for: .touchUpInside)
        playLivingButton.heightAnchor.constraint(
            equalToConstant: 34
        ).isActive = true
        playLivingButton.isHidden = true
        stackView.addArrangedSubview(playLivingButton)
    }

    private func choose(_ effect: BopFXEffect) {
        guard sequenceSelected || selectedEffect != effect else { return }
        setEffect(effect, announce: true)
        onSelect?(effect)
    }

    private func chooseSequence() {
        guard !sequenceSelected else { return }
        setSequenceEffect(.spectralEcho, announce: true)
        onSelectSequence?()
    }

    private func toggleLiving() {
        let enabled = !livingState.isActive
        setLivingState(
            enabled
                ? .collecting(completedClipCount: 0)
                : .off)
        onToggleLiving?(enabled)
        announceSelection(
            enabled
                ? "Living Strip on"
                : "Living Strip off")
    }

    private func configuredButton(title: String) -> UIButton {
        let button = UIButton(type: .system)
        configure(button, title: title)
        return button
    }

    private func configure(_ button: UIButton, title: String) {
        button.translatesAutoresizingMaskIntoConstraints = false
        var configuration = UIButton.Configuration.plain()
        configuration.title = title
        configuration.contentInsets = NSDirectionalEdgeInsets(
            top: 0,
            leading: 12,
            bottom: 0,
            trailing: 12)
        configuration.background.cornerRadius = 12
        configuration.titleTextAttributesTransformer =
            UIConfigurationTextAttributesTransformer { attributes in
                var transformed = attributes
                transformed.font = UIFontMetrics(forTextStyle: .caption1)
                    .scaledFont(
                        for: .systemFont(
                            ofSize: 12,
                            weight: .semibold))
                return transformed
            }
        button.configuration = configuration
    }

    private func applySelection(_ selected: Bool, to button: UIButton) {
        var configuration = button.configuration ?? .plain()
        configuration.baseForegroundColor = selected ? .black : .white
        configuration.background.backgroundColor =
            selected
            ? UIColor.white
            : UIColor.white.withAlphaComponent(0.12)
        button.configuration = configuration
        button.accessibilityTraits =
            selected
            ? [.button, .selected]
            : [.button]
    }

    private func announceSelection(_ message: String) {
        UIAccessibility.post(
            notification: .announcement,
            argument: message)
    }
}

extension BopFXLivingLabState {
    fileprivate var isActive: Bool {
        switch self {
        case .collecting, .processing, .ready:
            return true
        case .off, .failed:
            return false
        }
    }
}

extension BopFXEffect {
    fileprivate var labTitle: String {
        switch self {
        case .original: return "Original"
        case .spectralEcho: return "Echo"
        case .funhouse: return "Warp"
        case .cutoutChorus: return "Cutout"
        case .mirrorBloom: return "Mirror"
        case .spinCycle: return "Spin"
        }
    }
}
#endif
