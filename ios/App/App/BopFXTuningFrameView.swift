#if DEBUG
import UIKit

final class BopFXTuningFrameView: UIView {
    var onChange: ((BopFXTuning) -> Void)?

    private let hueAxis = BopFXTuningAxis(
        orientation: .vertical,
        accessibilityName: "Hue",
        colors: [
            .systemRed,
            .systemPink,
            .systemBlue,
            .systemCyan,
            .systemGreen,
            .systemYellow,
            .systemRed,
        ])
    private let saturationAxis = BopFXTuningAxis(
        orientation: .vertical,
        accessibilityName: "Saturation",
        colors: [
            UIColor(red: 1, green: 0.16, blue: 0.08, alpha: 1),
            UIColor(white: 0.72, alpha: 1),
        ])
    private let warmthAxis = BopFXTuningAxis(
        orientation: .horizontal,
        accessibilityName: "Warmth",
        colors: [
            UIColor(red: 0.12, green: 0.56, blue: 1, alpha: 1),
            UIColor(white: 0.96, alpha: 1),
            UIColor(red: 1, green: 0.42, blue: 0.08, alpha: 1),
        ])
    private var tuning = BopFXTuning.neutral

    init(tuning: BopFXTuning = .neutral) {
        super.init(frame: .zero)
        isOpaque = false
        backgroundColor = .clear
        accessibilityLabel = "Tuning frame"
        [hueAxis, saturationAxis, warmthAxis].forEach(addSubview)

        hueAxis.onValueChange = { [weak self] value in
            guard let self else { return }
            self.setTuning(
                BopFXTuning(
                    hue: (0.5 - value) * 2,
                    saturation: self.tuning.saturation,
                    warmth: self.tuning.warmth),
                notify: true)
        }
        saturationAxis.onValueChange = { [weak self] value in
            guard let self else { return }
            self.setTuning(
                BopFXTuning(
                    hue: self.tuning.hue,
                    saturation: (0.5 - value) * 2,
                    warmth: self.tuning.warmth),
                notify: true)
        }
        warmthAxis.onValueChange = { [weak self] value in
            guard let self else { return }
            self.setTuning(
                BopFXTuning(
                    hue: self.tuning.hue,
                    saturation: self.tuning.saturation,
                    warmth: (value - 0.5) * 2),
                notify: true)
        }
        setTuning(tuning, notify: false)
    }

    required init?(coder: NSCoder) {
        return nil
    }

    func setTuning(_ tuning: BopFXTuning, notify: Bool = false) {
        self.tuning = tuning
        hueAxis.setValue(0.5 - tuning.hue / 2)
        saturationAxis.setValue(0.5 - tuning.saturation / 2)
        warmthAxis.setValue(0.5 + tuning.warmth / 2)
        if notify {
            onChange?(tuning)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let edgeWidth: CGFloat = 38
        let topHeight: CGFloat = 38
        warmthAxis.frame = CGRect(
            x: edgeWidth,
            y: 0,
            width: max(0, bounds.width - edgeWidth * 2),
            height: topHeight)
        hueAxis.frame = CGRect(
            x: 0,
            y: topHeight,
            width: edgeWidth,
            height: max(0, bounds.height - topHeight))
        saturationAxis.frame = CGRect(
            x: max(0, bounds.width - edgeWidth),
            y: topHeight,
            width: edgeWidth,
            height: max(0, bounds.height - topHeight))
    }

    override func point(
        inside point: CGPoint,
        with event: UIEvent?
    ) -> Bool {
        return [hueAxis, saturationAxis, warmthAxis].contains { axis in
            axis.frame.contains(point)
        }
    }
}

private final class BopFXTuningAxis: UIControl {
    enum Orientation {
        case horizontal
        case vertical
    }

    var onValueChange: ((CGFloat) -> Void)?

    private let orientation: Orientation
    private let gradientLayer = CAGradientLayer()
    private let railLayer = CALayer()
    private let thumbView = UIView()
    private let impact = UIImpactFeedbackGenerator(style: .light)
    private var value: CGFloat = 0.5
    private var wasAtNeutral = true

    init(
        orientation: Orientation,
        accessibilityName: String,
        colors: [UIColor]
    ) {
        self.orientation = orientation
        super.init(frame: .zero)

        isAccessibilityElement = true
        accessibilityLabel = accessibilityName
        accessibilityTraits = [.adjustable]
        clipsToBounds = false

        railLayer.backgroundColor = UIColor.black
            .withAlphaComponent(0.28).cgColor
        railLayer.shadowColor = UIColor.black.cgColor
        railLayer.shadowOpacity = 0.24
        railLayer.shadowRadius = 2
        railLayer.shadowOffset = CGSize(width: 0, height: 1)
        layer.addSublayer(railLayer)

        gradientLayer.colors = colors.map(\.cgColor)
        gradientLayer.locations = colors.indices.map { index in
            NSNumber(
                value: Double(index) /
                    Double(max(1, colors.count - 1)))
        }
        if orientation == .horizontal {
            gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
            gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)
        } else {
            gradientLayer.startPoint = CGPoint(x: 0.5, y: 0)
            gradientLayer.endPoint = CGPoint(x: 0.5, y: 1)
        }
        railLayer.addSublayer(gradientLayer)

        thumbView.isUserInteractionEnabled = false
        thumbView.backgroundColor = .white
        thumbView.layer.borderColor = UIColor.black
            .withAlphaComponent(0.58).cgColor
        thumbView.layer.borderWidth = 1.5
        thumbView.layer.shadowColor = UIColor.black.cgColor
        thumbView.layer.shadowOpacity = 0.32
        thumbView.layer.shadowRadius = 2.5
        thumbView.layer.shadowOffset = CGSize(width: 0, height: 1)
        addSubview(thumbView)

        let resetGesture = UITapGestureRecognizer(
            target: self,
            action: #selector(resetToNeutral))
        resetGesture.numberOfTapsRequired = 2
        addGestureRecognizer(resetGesture)
    }

    required init?(coder: NSCoder) {
        return nil
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let railThickness: CGFloat = 7
        if orientation == .horizontal {
            railLayer.frame = CGRect(
                x: 8,
                y: (bounds.height - railThickness) / 2,
                width: max(0, bounds.width - 16),
                height: railThickness)
        } else {
            railLayer.frame = CGRect(
                x: (bounds.width - railThickness) / 2,
                y: 8,
                width: railThickness,
                height: max(0, bounds.height - 16))
        }
        railLayer.cornerRadius = railThickness / 2
        gradientLayer.frame = railLayer.bounds.insetBy(dx: 1, dy: 1)
        gradientLayer.cornerRadius = max(0, railThickness / 2 - 1)

        let thumbSize: CGFloat = 17
        thumbView.bounds = CGRect(
            x: 0,
            y: 0,
            width: thumbSize,
            height: thumbSize)
        thumbView.layer.cornerRadius = thumbSize / 2
        thumbView.center = point(for: value)
    }

    func setValue(_ value: CGFloat) {
        self.value = min(1, max(0, value))
        wasAtNeutral = abs(self.value - 0.5) < 0.015
        accessibilityValue = accessibilityValueText
        setNeedsLayout()
    }

    override func beginTracking(
        _ touch: UITouch,
        with event: UIEvent?
    ) -> Bool {
        impact.prepare()
        updateValue(at: touch.location(in: self))
        return true
    }

    override func continueTracking(
        _ touch: UITouch,
        with event: UIEvent?
    ) -> Bool {
        updateValue(at: touch.location(in: self))
        return true
    }

    override func accessibilityIncrement() {
        updateValue(value + 0.05)
    }

    override func accessibilityDecrement() {
        updateValue(value - 0.05)
    }

    @objc private func resetToNeutral() {
        impact.impactOccurred()
        updateValue(0.5)
    }

    private func updateValue(at point: CGPoint) {
        let next: CGFloat
        if orientation == .horizontal {
            next = (point.x - 8) / max(1, bounds.width - 16)
        } else {
            next = (point.y - 8) / max(1, bounds.height - 16)
        }
        updateValue(next)
    }

    private func updateValue(_ nextValue: CGFloat) {
        let clamped = min(1, max(0, nextValue))
        let atNeutral = abs(clamped - 0.5) < 0.015
        if atNeutral && !wasAtNeutral {
            impact.impactOccurred()
        }
        value = atNeutral ? 0.5 : clamped
        wasAtNeutral = atNeutral
        accessibilityValue = accessibilityValueText
        setNeedsLayout()
        onValueChange?(value)
        sendActions(for: .valueChanged)
    }

    private func point(for value: CGFloat) -> CGPoint {
        if orientation == .horizontal {
            return CGPoint(
                x: 8 + value * max(0, bounds.width - 16),
                y: bounds.midY)
        }
        return CGPoint(
            x: bounds.midX,
            y: 8 + value * max(0, bounds.height - 16))
    }

    private var accessibilityValueText: String {
        let percent = Int(((value - 0.5) * 200).rounded())
        if percent == 0 {
            return "Neutral"
        }
        return "\(percent > 0 ? "+" : "")\(percent) percent"
    }
}
#endif
