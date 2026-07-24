#if DEBUG
import UIKit

final class BopFXLabPicker: UIVisualEffectView {
    var onSelect: ((BopFXEffect) -> Void)?
    var onSelectSequence: (() -> Void)?

    private let scrollView = UIScrollView()
    private let stackView = UIStackView()
    private let sequenceButton = UIButton(type: .system)
    private var buttons: [BopFXEffect: UIButton] = [:]
    private var selectedEffect: BopFXEffect
    private var sequenceSelected = false

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

    private func updateSelection() {
        for (candidate, button) in buttons {
            applySelection(
                !sequenceSelected && candidate == selectedEffect,
                to: button)
        }
        applySelection(sequenceSelected, to: sequenceButton)
        let selectedButton = sequenceSelected
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
            equalToConstant: 34).isActive = true
        stackView.addArrangedSubview(sequenceButton)
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
        configuration.background.backgroundColor = selected
            ? UIColor.white
            : UIColor.white.withAlphaComponent(0.12)
        button.configuration = configuration
        button.accessibilityTraits = selected
            ? [.button, .selected]
            : [.button]
    }

    private func announceSelection(_ message: String) {
        UIAccessibility.post(
            notification: .announcement,
            argument: message)
    }
}

private extension BopFXEffect {
    var labTitle: String {
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
