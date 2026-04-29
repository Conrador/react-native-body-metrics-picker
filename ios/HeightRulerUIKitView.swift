import UIKit

// MARK: - Custom font (matches Expo / React Native `fontFamily` keys)

private enum RulerExpoFontResolver {
  private static var cache: [String: UIFont] = [:]

  /// Resolves keys like `Fraunces_600SemiBold` to a loaded `UIFont`; `UIFont(name:)` alone often fails because CT uses a different face name.
  static func uiFont(familyKey: String?, size: CGFloat) -> UIFont? {
    guard let raw = familyKey?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
      return nil
    }
    let cacheKey = "\(raw)_\(size)"
    if let hit = cache[cacheKey] {
      return hit
    }
    if let exact = UIFont(name: raw, size: size) {
      cache[cacheKey] = exact
      return exact
    }
    guard let u = raw.firstIndex(of: "_") else { return nil }
    let familyStem = String(raw[..<u])
    let variant = String(raw[raw.index(after: u)...]).lowercased()
    let facesForStem: [String] = UIFont.familyNames.flatMap { fam -> [String] in
      if fam.compare(familyStem, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame {
        return UIFont.fontNames(forFamilyName: fam)
      }
      if fam.replacingOccurrences(of: " ", with: "").caseInsensitiveCompare(familyStem) == .orderedSame {
        return UIFont.fontNames(forFamilyName: fam)
      }
      return []
    }

    let faces = facesForStem.isEmpty ? UIFont.fontNames(forFamilyName: familyStem) : facesForStem
    guard !faces.isEmpty else { return nil }

    func pick(from names: [String]) -> UIFont? {
      let ordered: [String] = {
        if variant.contains("600"), variant.contains("semibold") || variant.contains("semi") {
          let p = names.filter { $0.localizedCaseInsensitiveContains("SemiBold") }
          return p.isEmpty ? names : p
        }
        if variant.contains("700") || (variant.contains("bold") && !variant.contains("semi")) {
          let p = names.filter { n in
            n.localizedCaseInsensitiveContains("Bold") && !n.localizedCaseInsensitiveContains("Semi")
          }
          return p.isEmpty ? names : p
        }
        if variant.contains("italic") {
          let p = names.filter { $0.localizedCaseInsensitiveContains("Italic") }
          return p.isEmpty ? names : p
        }
        return names
      }()
      return ordered.compactMap { UIFont(name: $0, size: size) }.first
    }

    let picked = pick(from: faces)
    if let picked {
      cache[cacheKey] = picked
    }
    return picked
  }
}

// MARK: - Glass overlay (UIKit)

private final class RulerGlassUIKitView: UIView {
  private let blurView = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialLight))
  private let reduceTransparencyFill = UIView()
  private let sheen = CAGradientLayer()
  private let tintView = UIView()
  private let rimView = UIView()
  private let borderLayer = CAShapeLayer()
  private let liquidBorderLayer = CAShapeLayer()

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    clipsToBounds = false

    reduceTransparencyFill.translatesAutoresizingMaskIntoConstraints = false
    reduceTransparencyFill.layer.cornerCurve = .continuous
    reduceTransparencyFill.clipsToBounds = true
    reduceTransparencyFill.isHidden = true
    addSubview(reduceTransparencyFill)
    NSLayoutConstraint.activate([
      reduceTransparencyFill.topAnchor.constraint(equalTo: topAnchor),
      reduceTransparencyFill.leadingAnchor.constraint(equalTo: leadingAnchor),
      reduceTransparencyFill.trailingAnchor.constraint(equalTo: trailingAnchor),
      reduceTransparencyFill.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    blurView.layer.cornerCurve = .continuous
    blurView.clipsToBounds = true
    blurView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(blurView)
    NSLayoutConstraint.activate([
      blurView.topAnchor.constraint(equalTo: topAnchor),
      blurView.leadingAnchor.constraint(equalTo: leadingAnchor),
      blurView.trailingAnchor.constraint(equalTo: trailingAnchor),
      blurView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    sheen.colors = [UIColor.white.withAlphaComponent(0.34).cgColor, UIColor.clear.cgColor]
    sheen.startPoint = CGPoint(x: 0.5, y: 0)
    sheen.endPoint = CGPoint(x: 0.5, y: 0.62)
    blurView.contentView.layer.addSublayer(sheen)

    tintView.translatesAutoresizingMaskIntoConstraints = false
    blurView.contentView.addSubview(tintView)
    NSLayoutConstraint.activate([
      tintView.topAnchor.constraint(equalTo: blurView.contentView.topAnchor),
      tintView.leadingAnchor.constraint(equalTo: blurView.contentView.leadingAnchor),
      tintView.trailingAnchor.constraint(equalTo: blurView.contentView.trailingAnchor),
      tintView.bottomAnchor.constraint(equalTo: blurView.contentView.bottomAnchor),
    ])

    rimView.translatesAutoresizingMaskIntoConstraints = false
    blurView.contentView.addSubview(rimView)
    NSLayoutConstraint.activate([
      rimView.leadingAnchor.constraint(equalTo: blurView.contentView.leadingAnchor),
      rimView.trailingAnchor.constraint(equalTo: blurView.contentView.trailingAnchor),
      rimView.bottomAnchor.constraint(equalTo: blurView.contentView.bottomAnchor),
      rimView.heightAnchor.constraint(equalToConstant: 0.5),
    ])

    borderLayer.fillColor = UIColor.clear.cgColor
    liquidBorderLayer.fillColor = UIColor.clear.cgColor
    layer.addSublayer(borderLayer)
    layer.addSublayer(liquidBorderLayer)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let r = bounds.height / 2
    let path = UIBezierPath(roundedRect: bounds.insetBy(dx: 0.5 / UIScreen.main.scale, dy: 0.5 / UIScreen.main.scale), cornerRadius: r)
    blurView.layer.cornerRadius = r
    reduceTransparencyFill.layer.cornerRadius = r
    sheen.frame = blurView.contentView.bounds
    borderLayer.path = path.cgPath
    liquidBorderLayer.path = path.cgPath
  }

  func apply(
    surface: UIColor,
    border: UIColor,
    sheenTop: UIColor,
    rim: UIColor,
    liquidBorder: UIColor,
    reduceTransparency: Bool,
    inMotion: Bool
  ) {
    if reduceTransparency {
      blurView.isHidden = true
      reduceTransparencyFill.isHidden = false
      reduceTransparencyFill.backgroundColor = surface.withAlphaComponent(inMotion ? 0.12 : 0.3)
      borderLayer.lineWidth = 1 / UIScreen.main.scale
      borderLayer.strokeColor = border.cgColor
      liquidBorderLayer.strokeColor = UIColor.clear.cgColor
    } else {
      blurView.isHidden = false
      reduceTransparencyFill.isHidden = true
      // Slightly stronger “live glass” when scrolling or pressing the pill (clearer blur + sheen).
      blurView.alpha = inMotion ? 0.20 : 0.42
      sheen.colors = [sheenTop.withAlphaComponent(inMotion ? 0.28 : 0.34).cgColor, UIColor.clear.cgColor]
      tintView.backgroundColor = surface.withAlphaComponent(inMotion ? 0.05 : 0.2)
      borderLayer.lineWidth = 1 / UIScreen.main.scale
      borderLayer.strokeColor = border.cgColor
      liquidBorderLayer.lineWidth = 1 / UIScreen.main.scale
      liquidBorderLayer.strokeColor = liquidBorder.withAlphaComponent(inMotion ? 0.72 : 0.9).cgColor
    }
    rimView.backgroundColor = rim.withAlphaComponent(inMotion ? 0.55 : 1)
  }

  func setInMotion(_ motion: Bool) {
    UIView.animate(withDuration: 0.06, delay: 0, options: [.beginFromCurrentState, .curveLinear]) {
      let sx: CGFloat = motion ? 1.04 : 1
      let sy: CGFloat = motion ? 0.93 : 1
      self.transform = CGAffineTransform(scaleX: sx, y: sy).translatedBy(x: 0, y: motion ? -0.6 : 0)
    }
  }
}

// MARK: - Tick row

private final class HeightRulerTickRowView: UIView {
  private let label = UILabel()
  private let bar = UIView()
  private let labelWidthConstraint: NSLayoutConstraint
  private let barLeadingGapConstraint: NSLayoutConstraint
  private let barWidthConstraint: NSLayoutConstraint
  private let barHeightConstraint: NSLayoutConstraint
  /// Skip width tween on next `apply` (e.g. collection cell reuse).
  private var suppressBarWidthAnimation = false
  private var didApplyBarWidthOnce = false

  override init(frame: CGRect) {
    label.translatesAutoresizingMaskIntoConstraints = false
    label.textAlignment = .right
    label.lineBreakMode = .byTruncatingTail
    label.adjustsFontSizeToFitWidth = true
    label.minimumScaleFactor = 0.6

    bar.translatesAutoresizingMaskIntoConstraints = false
    bar.layer.cornerRadius = 1
    bar.layer.masksToBounds = true

    labelWidthConstraint = label.widthAnchor.constraint(equalToConstant: 60)
    barLeadingGapConstraint = bar.leadingAnchor.constraint(equalTo: label.trailingAnchor, constant: 4)
    barWidthConstraint = bar.widthAnchor.constraint(equalToConstant: 40)
    barHeightConstraint = bar.heightAnchor.constraint(equalToConstant: 1.5)

    super.init(frame: frame)
    addSubview(label)
    addSubview(bar)

    NSLayoutConstraint.activate([
      label.leadingAnchor.constraint(equalTo: leadingAnchor),
      label.centerYAnchor.constraint(equalTo: centerYAnchor),
      labelWidthConstraint,
      barLeadingGapConstraint,
      bar.centerYAnchor.constraint(equalTo: centerYAnchor),
      barWidthConstraint,
      barHeightConstraint,
    ])
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func prepareForReuse() {
    suppressBarWidthAnimation = true
  }

  func apply(
    index i: Int,
    model: RulerStateModel,
    centerPosition: CGFloat,
    totalSteps: Int,
    labelColumnWidth: CGFloat,
    labelToTickGap: CGFloat
  ) {
    let major = CGFloat(model.majorTickHeight)
    let mid = CGFloat(model.midTickHeight)
    let minor = CGFloat(model.minorTickHeight)
    let tw = CGFloat(model.tickWidth)

    let tickVal = model.rangeMax - Double(i) * model.step
    let indexFromMin = totalSteps - i
    let center = min(max(centerPosition, 0), CGFloat(totalSteps))
    let dist = abs(CGFloat(i) - center)
    let fadeStart: CGFloat = 1.0
    let fadeEnd: CGFloat = 1.45
    let glassLabelPresence: CGFloat = {
      if dist <= fadeStart { return 1 }
      if dist >= fadeEnd { return 0 }
      return 1 - ((dist - fadeStart) / (fadeEnd - fadeStart))
    }()
    let showGlassLabelText = dist <= 1.8
    let waveSigma: CGFloat = 0.82
    let wave: CGFloat = {
      guard dist <= 1.8 else { return 0 }
      return CGFloat(exp(-pow(Double(dist / waveSigma), 2)))
    }()
    let waveStrength: CGFloat = 1.32

    // Under the glass: if the snapped center is not a grid major, borrow “major” styling for it
    // and shrink an adjacent grid-major neighbor to a normal tick (e.g. 160, 161, 162 → 161 is long).
    let selectedIdx = min(max(Int(Double(centerPosition).rounded()), 0), totalSteps)
    let centerIsGridMajor: Bool = {
      if model.unit == "ft" {
        let t = model.imperialRulerMaxInches - selectedIdx
        return t % 12 == 0
      }
      return (totalSteps - selectedIdx) % model.longStepInterval == 0
    }()
    let promoteGlassMajor = !centerIsGridMajor && i == selectedIdx
    let demoteAdjacentGridMajor: Bool = {
      guard !centerIsGridMajor, abs(i - selectedIdx) == 1 else { return false }
      if model.unit == "ft" {
        return (model.imperialRulerMaxInches - i) % 12 == 0
      }
      return (totalSteps - i) % model.longStepInterval == 0
    }()

    let (barW, baseUIColor, labelText, waveXGain, waveYGain, isAlwaysLabel): (CGFloat, UIColor, String, CGFloat, CGFloat, Bool) = {
      if model.unit == "ft" {
        let ti = model.imperialRulerMaxInches - i
        var kind = RulerTickKind.imperial(ti)
        if demoteAdjacentGridMajor {
          kind = .small
        }
        if promoteGlassMajor {
          kind = .major
        }
        let w = kind.barWidth(major: major, mid: mid, minor: minor)
        let base: UIColor = {
          switch kind {
          case .major: return .rulerParse(model.colorMajorTick)
          case .large, .medium: return .rulerParse(model.colorMidTick)
          case .small: return .rulerParse(model.colorTick)
          }
        }()
        let lbl = (showGlassLabelText || kind == .major)
          ? model.formatImperialLabel(totalInches: ti)
          : ""
        let xGain: CGFloat = {
          switch kind {
          case .major: return 0.24
          case .large, .medium: return 0.38
          case .small: return 0.5
          }
        }()
        let yGain: CGFloat = {
          switch kind {
          case .major: return 0.06
          case .large, .medium: return 0.1
          case .small: return 0.14
          }
        }()
        return (w, base, lbl, xGain, yGain, kind == .major)
      } else {
        var isLong = indexFromMin % model.longStepInterval == 0
        let half = max(1, model.longStepInterval / 2)
        var isMid = !isLong && indexFromMin % half == 0
        if demoteAdjacentGridMajor {
          isLong = false
          isMid = false
        }
        if promoteGlassMajor {
          isLong = true
          isMid = false
        }
        let w = isLong ? major : isMid ? mid : minor
        let base: UIColor = isLong
          ? .rulerParse(model.colorMajorTick)
          : isMid ? .rulerParse(model.colorMidTick) : .rulerParse(model.colorTick)
        let lbl = showGlassLabelText ? glassMetricLabel(tickVal, model: model) : model.metricLabel(idx: i, tickVal: tickVal)
        let xGain: CGFloat = isLong ? 0.24 : isMid ? 0.38 : 0.5
        let yGain: CGFloat = isLong ? 0.06 : isMid ? 0.1 : 0.14
        return (w, base, lbl, xGain, yGain, isLong)
      }
    }()

    let centerHighlight = UIColor.rulerParse(model.colorGlassActiveTick)
    let neighborHighlight = UIColor.rulerParse(model.colorGlassActiveNeighborTick)
    let centerGlow = CGFloat(exp(-pow(Double(dist / 0.45), 2)))
    let neighborGlow = CGFloat(exp(-pow(Double((dist - 1.0) / 0.55), 2)))
    let neighborBlend = min(1, neighborGlow * 0.72)
    let centerBlend = min(1, centerGlow * 0.96)
    let labelNeighborGlow = CGFloat(exp(-pow(Double((dist - 1.0) / 0.5), 2)))
    let labelCenterGlow = CGFloat(exp(-pow(Double(dist / 0.5), 2)))
    // Glass emphasis: stronger center bump; neighbors get a light scale lift.
    let labelScaleRaw = max(0.96, 1 + (0.14 * labelCenterGlow) - (0.035 * labelNeighborGlow))
    let labelOpacityRaw = max(0.72, 1 - (0.28 * labelNeighborGlow))
    let neighborLabelScaleBoost = 1 + (0.042 * labelNeighborGlow * glassLabelPresence)
    let labelScale = (1 + ((labelScaleRaw - 1) * glassLabelPresence)) * neighborLabelScaleBoost
    let labelOpacity = isAlwaysLabel
      ? 1 + ((labelOpacityRaw - 1) * glassLabelPresence)
      : labelOpacityRaw * glassLabelPresence
    let majorLabelUIColor = UIColor.rulerParse(model.colorMajorTick)
    let dimLabelUIColor = UIColor.rulerParse(model.colorMidTick)
    let labelUIColor = majorLabelUIColor.rulerLerp(to: dimLabelUIColor, t: min(1, labelNeighborGlow * 0.82))
    let highlightedUIColor = baseUIColor
      .rulerLerp(to: neighborHighlight, t: neighborBlend)
      .rulerLerp(to: centerHighlight, t: centerBlend)

    label.text = labelText
    label.textColor = labelUIColor
    label.font = Self.tickFont(model: model)
    label.alpha = isAlwaysLabel ? labelOpacity : (showGlassLabelText ? labelOpacity : 1)
    // Match Android: scale from trailing edge so enlarged glass label grows left, not into the tick.
    applyLabelScale(labelScale, labelColumnWidth: labelColumnWidth)

    bar.backgroundColor = highlightedUIColor
    let previousBarW = barWidthConstraint.constant
    let shouldAnimateBarWidth =
      didApplyBarWidthOnce
      && !suppressBarWidthAnimation
      && abs(previousBarW - barW) > 0.25
    suppressBarWidthAnimation = false
    didApplyBarWidthOnce = true
    if shouldAnimateBarWidth {
      UIView.animate(
        withDuration: 0.68,
        delay: 0,
        options: [.beginFromCurrentState, .allowUserInteraction, .curveEaseOut]
      ) {
        self.barWidthConstraint.constant = barW
        self.layoutIfNeeded()
      }
    } else {
      barWidthConstraint.constant = barW
    }
    barHeightConstraint.constant = max(1, tw)
    labelWidthConstraint.constant = labelColumnWidth
    barLeadingGapConstraint.constant = labelToTickGap

    let sx = 1 + (waveXGain * wave * waveStrength)
    let sy = 1 + (waveYGain * wave * waveStrength)
    // Horizontally scaled/translated ticks extend past nominal bar width — JS adds IOS_RULER_EXTRA_TRACK_DP so the UICollectionView does not clip the trailing edge.
    // Center tick nudges right most; neighbors under the glass nudge slightly right too (lekko wysunięte).
    let tickSelectionNudgeX: CGFloat = 5.6 * centerGlow
    let neighborNudgeX: CGFloat = 2.75 * neighborGlow
    let tx = 4.35 * wave + tickSelectionNudgeX + neighborNudgeX
    bar.transform = CGAffineTransform(translationX: tx, y: 0).scaledBy(x: sx, y: sy)
  }

  /// Scale around a point just inset from the label’s trailing edge: keeps ink off the tick but avoids over-shifting vs neighbors.
  private func applyLabelScale(_ scale: CGFloat, labelColumnWidth: CGFloat) {
    if abs(scale - 1) < 0.0001 {
      label.transform = .identity
      return
    }
    let b = label.bounds
    let trailingPivotInset: CGFloat = 4
    let ax = max(1, labelColumnWidth - trailingPivotInset)
    let ay = b.height > 0 ? b.midY : (bounds.height > 0 ? bounds.height / 2 : 0)
    label.transform = CGAffineTransform(translationX: ax, y: ay)
      .scaledBy(x: scale, y: scale)
      .translatedBy(x: -ax, y: -ay)
  }

  private static func tickFont(model: RulerStateModel) -> UIFont {
    let size = CGFloat(model.tickLabelFontSize)
    if let resolved = RulerExpoFontResolver.uiFont(familyKey: model.fontFamily, size: size) {
      return resolved
    }
    return .systemFont(ofSize: size, weight: .semibold)
  }

  private func glassMetricLabel(_ value: Double, model: RulerStateModel) -> String {
    if abs(value - value.rounded()) < 1e-6 {
      return "\(Int(value.rounded()))"
    }
    return String(format: "%.\(model.fractionDigits)f", value)
  }
}

// MARK: - Collection cell

private final class HeightRulerTickCell: UICollectionViewCell {
  static let reuseId = "HeightRulerTickCell"

  private let row = HeightRulerTickRowView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.clipsToBounds = false
    row.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(row)
    NSLayoutConstraint.activate([
      row.topAnchor.constraint(equalTo: contentView.topAnchor),
      row.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
      row.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
      row.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
    ])
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    row.prepareForReuse()
  }

  func apply(
    index: Int,
    model: RulerStateModel,
    centerPosition: CGFloat,
    totalSteps: Int,
    labelColumnWidth: CGFloat,
    labelToTickGap: CGFloat
  ) {
    row.apply(
      index: index,
      model: model,
      centerPosition: centerPosition,
      totalSteps: totalSteps,
      labelColumnWidth: labelColumnWidth,
      labelToTickGap: labelToTickGap
    )
  }
}

/// Glass chrome is not configurable from JS — only active tick highlight colors are props.
private enum HeightRulerFixedGlassChrome {
  static let surface = "rgba(255, 255, 255, 0.22)"
  static let border = "rgba(60, 60, 67, 0.16)"
  static let sheen = "rgba(255, 255, 255, 0.32)"
  static let rim = "rgba(10, 20, 40, 0.07)"
  static let liquidBorder = "rgba(255, 255, 255, 0.78)"
}

// MARK: - Main ruler

final class HeightRulerUIKitView: UIView, UICollectionViewDelegate, UICollectionViewDataSource, UIGestureRecognizerDelegate {
  private let model: RulerStateModel
  private var onValueEmit: (String) -> Void
  private var onScrollBegin: () -> Void
  private var onScrollEnd: () -> Void

  private let chromeView = UIView()
  private let collectionView: UICollectionView
  private let glassView = RulerGlassUIKitView()

  private var heightConstraint: NSLayoutConstraint!
  private var displayedUnit: String = "cm"
  private var isUnitTransitionInFlight = false
  private var structureKey: String = ""
  private var centerPosition: CGFloat = 0
  private var lastThrottle: TimeInterval = 0
  private var scrollEndWork: DispatchWorkItem?
  private var ignoreScrollPositionEventsUntil: TimeInterval = 0
  private var lastMeasuredValue: Double = 0
  private var programmaticScrollDepth = 0
  private var hasAppeared = false
  /// Finger down in the center glass band (tap / hold / long-press) — same visual treatment as scrolling.
  private var glassPressActive = false
  private let glassPressRecognizer = UILongPressGestureRecognizer()
  private let majorTickHaptic = UIImpactFeedbackGenerator(style: .rigid)
  /// Last snapped center index used for major-tick haptics (avoids buzz on first layout / programmatic scroll).
  private var lastMajorHapticScrollIndex: Int?
  /// Last `onValueChange` payload; skip emitting when the snapped value is unchanged (scroll without crossing ticks).
  private var lastEmittedValuePayload: String?

  init(
    model: RulerStateModel,
    onValueEmit: @escaping (String) -> Void,
    onScrollBegin: @escaping () -> Void,
    onScrollEnd: @escaping () -> Void
  ) {
    self.model = model
    self.onValueEmit = onValueEmit
    self.onScrollBegin = onScrollBegin
    self.onScrollEnd = onScrollEnd

    let flow = UICollectionViewFlowLayout()
    flow.scrollDirection = .vertical
    flow.minimumLineSpacing = 0
    flow.minimumInteritemSpacing = 0
    collectionView = UICollectionView(frame: .zero, collectionViewLayout: flow)

    super.init(frame: .zero)
    backgroundColor = .clear

    collectionView.delegate = self
    collectionView.dataSource = self
    collectionView.showsVerticalScrollIndicator = false
    collectionView.showsHorizontalScrollIndicator = false
    collectionView.alwaysBounceVertical = true
    collectionView.contentInsetAdjustmentBehavior = .never
    collectionView.delaysContentTouches = false
    collectionView.backgroundColor = .clear
    collectionView.register(HeightRulerTickCell.self, forCellWithReuseIdentifier: HeightRulerTickCell.reuseId)

    glassPressRecognizer.addTarget(self, action: #selector(handleGlassPress(_:)))
    glassPressRecognizer.minimumPressDuration = 0
    glassPressRecognizer.cancelsTouchesInView = false
    glassPressRecognizer.delegate = self
    collectionView.addGestureRecognizer(glassPressRecognizer)

    chromeView.translatesAutoresizingMaskIntoConstraints = false
    collectionView.translatesAutoresizingMaskIntoConstraints = false
    glassView.translatesAutoresizingMaskIntoConstraints = true

    addSubview(chromeView)
    addSubview(collectionView)
    addSubview(glassView)

    heightConstraint = heightAnchor.constraint(equalToConstant: 240)
    NSLayoutConstraint.activate([
      heightConstraint,
      chromeView.topAnchor.constraint(equalTo: topAnchor),
      chromeView.leadingAnchor.constraint(equalTo: leadingAnchor),
      chromeView.trailingAnchor.constraint(equalTo: trailingAnchor),
      chromeView.bottomAnchor.constraint(equalTo: bottomAnchor),
      collectionView.topAnchor.constraint(equalTo: topAnchor),
      collectionView.leadingAnchor.constraint(equalTo: leadingAnchor),
      collectionView.trailingAnchor.constraint(equalTo: trailingAnchor),
      collectionView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    updateFlowLayout(force: false)
    let trackW = bounds.width
    let glassW = trackW + 38
    let glassH: CGFloat = 52
    glassView.bounds = CGRect(x: 0, y: 0, width: glassW, height: glassH)
    glassView.center = CGPoint(x: bounds.midX, y: bounds.midY)
    updateGlassInteractionVisuals()
  }

  // MARK: - Public sync

  func syncWithModel() {
    heightConstraint.constant = CGFloat(model.verticalViewportHeight)
    backgroundColor = .clear
    chromeView.backgroundColor = .clear

    if isUnitTransitionInFlight {
      updateGlassInteractionVisuals()
      return
    }

    if model.unit != displayedUnit {
      performUnitTransition()
      return
    }

    let key = structureKeyForModel()
    if key != structureKey {
      structureKey = key
      rebuildTickStack()
    } else {
      refreshTickCells()
    }

    updateGlassInteractionVisuals()
    applyExternalInitialValueIfNeeded(force: false)

    if !hasAppeared {
      hasAppeared = true
      applyExternalInitialValueIfNeeded(force: true)
      let idx = clampIndex(model.centerIndex)
      model.centerIndex = idx
      lastMeasuredValue = model.heightCmForIndex(idx)
      model.currentValue = model.valueForIndex(idx, unit: model.unit)
    }
  }

  private func structureKeyForModel() -> String {
    "\(model.unit)|\(model.totalSteps)|\(model.tickSpacing)|\(model.verticalViewportHeight)|\(model.rulerTrackWidth)"
  }

  private func performUnitTransition() {
    isUnitTransitionInFlight = true
    ignoreScrollPositionEventsUntil = ProcessInfo.processInfo.systemUptime + 0.45
    let newUnit = model.unit
    let transition = model.consumePendingUnitTransition()
    let pendingCm = model.consumePendingInitialValueOverride()
    animateUnitTransitionFade()

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let nextIdx: Int
      if let t = transition {
        nextIdx = self.clampIndex(
          self.model.indexForHeightCmSnapshot(
            t.heightCm,
            displayUnit: newUnit,
            minCm: t.minCm,
            maxCm: t.maxCm
          ))
      } else {
        let cm = pendingCm ?? self.lastMeasuredValue
        nextIdx = self.clampIndex(
          self.model.indexForHeightCmSnapshot(cm, displayUnit: newUnit, minCm: 100, maxCm: 250)
        )
      }

      self.structureKey = self.structureKeyForModel()
      self.rebuildTickStack()
      self.layoutIfNeeded()

      self.model.centerIndex = nextIdx
      self.centerPosition = CGFloat(nextIdx)
      let measuredDisplay = self.model.valueForIndex(nextIdx, unit: newUnit)
      let measuredCm = self.model.heightCmForIndex(nextIdx)
      let storeCm: Double
      if newUnit == "cm" {
        storeCm = (measuredCm / 1.0).rounded()
      } else if let t = transition, t.fromUnit == "cm" {
        // Inch grid cm ≠ cm-grid value (e.g. 250 cm → 98″ → ~248.92); keep cm snapshot for round-trip.
        storeCm = t.heightCm
      } else {
        storeCm = measuredCm
      }
      self.lastMeasuredValue = storeCm
      self.model.currentValue = measuredDisplay
      self.model.initialValue = storeCm

      self.scrollToCenterIndex(nextIdx, postLayoutRetries: true)
      let emitPayload: String
      if newUnit == "ft", let t = transition, t.fromUnit == "cm" {
        emitPayload = String(format: "%.2f", t.heightCm)
      } else {
        emitPayload = self.model.emitString(forIndex: nextIdx)
      }
      self.emitValueIfChanged(emitPayload)
      self.refreshTickCells()
      self.lastMajorHapticScrollIndex = self.clampIndex(nextIdx)

      self.scrollEndWork?.cancel()
      self.glassPressActive = false
      self.hasAppeared = true
      self.displayedUnit = newUnit
      self.updateGlassInteractionVisuals()
      self.isUnitTransitionInFlight = false
      self.syncWithModel()
    }
  }

  private func animateUnitTransitionFade() {
    UIView.animate(withDuration: 0.09, delay: 0, options: .curveEaseOut) {
      self.collectionView.alpha = 0.42
    } completion: { _ in
      UIView.animate(withDuration: 0.13, delay: 0, options: .curveEaseOut) {
        self.collectionView.alpha = 1
      }
    }
  }

  private func endPadding() -> CGFloat {
    let itemSize = CGFloat(model.tickSpacing)
    let viewport = CGFloat(model.verticalViewportHeight)
    return max(0, (viewport - itemSize) / 2)
  }

  private func updateFlowLayout(force: Bool) {
    guard let flow = collectionView.collectionViewLayout as? UICollectionViewFlowLayout else { return }
    let w = bounds.width > 0 ? bounds.width : max(1, CGFloat(model.rulerTrackWidth))
    let h = max(1, CGFloat(model.tickSpacing))
    let pad = endPadding()
    let newSize = CGSize(width: w, height: h)
    let newInset = UIEdgeInsets(top: pad, left: 0, bottom: pad, right: 0)
    var changed = force
    if flow.itemSize != newSize {
      flow.itemSize = newSize
      changed = true
    }
    if flow.sectionInset != newInset {
      flow.sectionInset = newInset
      changed = true
    }
    if changed {
      flow.invalidateLayout()
    }
  }

  private func rebuildTickStack() {
    updateFlowLayout(force: true)
    collectionView.reloadData()
    collectionView.layoutIfNeeded()
  }

  /// Reconfigures visible cells plus a band around the glass center (wave / label cross-fade).
  private func refreshTickCells() {
    let totalSteps = model.totalSteps
    let lw = CGFloat(model.labelColumnWidth)
    let gap = CGFloat(model.labelToTickGap)
    let bandCenter = Int(round(Double(centerPosition)))
    var indices = Set<Int>()
    for ip in collectionView.indexPathsForVisibleItems {
      indices.insert(ip.item)
    }
    let bandLo = max(0, bandCenter - 6)
    let bandHi = min(totalSteps, bandCenter + 6)
    if bandLo <= bandHi {
      for i in bandLo...bandHi {
        indices.insert(i)
      }
    }
    for i in indices {
      guard i >= 0, i <= totalSteps else { continue }
      let ip = IndexPath(item: i, section: 0)
      if let cell = collectionView.cellForItem(at: ip) as? HeightRulerTickCell {
        cell.apply(
          index: i,
          model: model,
          centerPosition: centerPosition,
          totalSteps: totalSteps,
          labelColumnWidth: lw,
          labelToTickGap: gap
        )
      }
    }
  }

  private func layoutGlassColors() {
    let reduce = UIAccessibility.isReduceTransparencyEnabled
    let motion = collectionView.isDragging || collectionView.isDecelerating || glassPressActive
    glassView.apply(
      surface: UIColor.rulerParse(HeightRulerFixedGlassChrome.surface),
      border: UIColor.rulerParse(HeightRulerFixedGlassChrome.border),
      sheenTop: UIColor.rulerParse(HeightRulerFixedGlassChrome.sheen),
      rim: UIColor.rulerParse(HeightRulerFixedGlassChrome.rim),
      liquidBorder: UIColor.rulerParse(HeightRulerFixedGlassChrome.liquidBorder),
      reduceTransparency: reduce,
      inMotion: motion
    )
  }

  private func updateGlassInteractionVisuals() {
    let motion = collectionView.isDragging || collectionView.isDecelerating || glassPressActive
    glassView.setInMotion(motion)
    layoutGlassColors()
  }

  private func centerGlassRectInSelf() -> CGRect {
    let trackW = bounds.width
    let glassW = trackW + 38
    let glassH: CGFloat = 52
    return CGRect(
      x: bounds.midX - glassW / 2,
      y: bounds.midY - glassH / 2,
      width: glassW,
      height: glassH
    )
  }

  @objc private func handleGlassPress(_ gr: UILongPressGestureRecognizer) {
    let pt = gr.location(in: self)
    let inside = centerGlassRectInSelf().contains(pt)
    switch gr.state {
    case .began:
      glassPressActive = inside
      if inside {
        UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.55)
      }
    case .changed:
      glassPressActive = inside
    case .ended, .cancelled, .failed:
      glassPressActive = false
    default:
      break
    }
    updateGlassInteractionVisuals()
  }

  func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
    if gestureRecognizer === glassPressRecognizer, otherGestureRecognizer === collectionView.panGestureRecognizer {
      return true
    }
    if gestureRecognizer === collectionView.panGestureRecognizer, otherGestureRecognizer === glassPressRecognizer {
      return true
    }
    return false
  }

  private func clampIndex(_ i: Int) -> Int {
    min(max(0, i), model.totalSteps)
  }

  /// Major ticks: whole feet in `ft` mode, `longStepInterval` cm steps in `cm` mode (matches tick row styling).
  private func isMajorTickIndex(_ i: Int) -> Bool {
    let totalSteps = model.totalSteps
    guard i >= 0, i <= totalSteps else { return false }
    if model.unit == "ft" {
      let ti = model.imperialRulerMaxInches - i
      return ti % 12 == 0
    }
    let indexFromMin = totalSteps - i
    return indexFromMin % model.longStepInterval == 0
  }

  /// Major + mid (“half”) grid for scroll haptics — e.g. cm every 10 and 5; ft every 6″ (half-foot).
  private func isHalfGridTickIndex(_ i: Int) -> Bool {
    let totalSteps = model.totalSteps
    guard i >= 0, i <= totalSteps else { return false }
    if model.unit == "ft" {
      let ti = model.imperialRulerMaxInches - i
      return ti % 6 == 0
    }
    let indexFromMin = totalSteps - i
    let half = max(1, model.longStepInterval / 2)
    return indexFromMin % half == 0
  }

  private func contentOffsetY(forCenterIndex index: Int) -> CGFloat {
    let itemSize = CGFloat(model.tickSpacing)
    let vp = collectionView.bounds.height > 0 ? collectionView.bounds.height : CGFloat(model.verticalViewportHeight)
    let pad = endPadding()
    return pad + CGFloat(index) * itemSize + itemSize / 2 - vp / 2
  }

  private func scrollToCenterIndex(_ index: Int, postLayoutRetries: Bool) {
    collectionView.layoutIfNeeded()
    let y = contentOffsetY(forCenterIndex: clampIndex(index))
    let maxY = max(0, collectionView.contentSize.height - collectionView.bounds.height)
    let clampedY = min(max(0, y), maxY)
    programmaticScrollDepth += 1
    collectionView.setContentOffset(CGPoint(x: 0, y: clampedY), animated: false)
    programmaticScrollDepth -= 1

    if postLayoutRetries {
      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        self.programmaticScrollDepth += 1
        self.collectionView.setContentOffset(CGPoint(x: 0, y: clampedY), animated: false)
        self.programmaticScrollDepth -= 1
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.04) { [weak self] in
          guard let self else { return }
          let y2 = self.contentOffsetY(forCenterIndex: self.clampIndex(index))
          let maxY2 = max(0, self.collectionView.contentSize.height - self.collectionView.bounds.height)
          let cy = min(max(0, y2), maxY2)
          self.programmaticScrollDepth += 1
          self.collectionView.setContentOffset(CGPoint(x: 0, y: cy), animated: false)
          self.programmaticScrollDepth -= 1
          self.updateCenterFromScroll(emit: false)
          self.refreshTickCells()
        }
      }
    }
  }

  private func fractionalCenterIndex() -> CGFloat {
    let itemSize = CGFloat(model.tickSpacing)
    guard itemSize > 0, collectionView.bounds.height > 0 else { return 0 }
    let vp = collectionView.bounds.height
    let pad = endPadding()
    let midY = collectionView.contentOffset.y + vp / 2
    let raw = (midY - pad - itemSize / 2) / itemSize
    let trimmed = (raw * 100).rounded() / 100
    return min(max(0, trimmed), CGFloat(model.totalSteps))
  }

  private func currentCenterIndexFromOffset() -> Int {
    Int(round(Double(fractionalCenterIndex())))
  }

  private func emitValueIfChanged(_ payload: String) {
    if lastEmittedValuePayload == payload { return }
    lastEmittedValuePayload = payload
    onValueEmit(payload)
  }

  private func updateCenterFromScroll(emit: Bool) {
    let newVal = fractionalCenterIndex()
    if collectionView.isDragging || collectionView.isDecelerating {
      centerPosition = centerPosition * 0.62 + newVal * 0.38
    } else {
      let delta = abs(newVal - centerPosition)
      if delta > 1.5 {
        centerPosition = newVal
      } else {
        centerPosition = centerPosition * 0.72 + newVal * 0.28
      }
    }

    guard ProcessInfo.processInfo.systemUptime >= ignoreScrollPositionEventsUntil else {
      refreshTickCells()
      return
    }

    let idx = clampIndex(currentCenterIndexFromOffset())
    if !collectionView.isDragging, !collectionView.isDecelerating {
      centerPosition = CGFloat(idx)
    }

    if idx != lastMajorHapticScrollIndex {
      let hadPriorIndex = lastMajorHapticScrollIndex != nil
      lastMajorHapticScrollIndex = idx
      if hadPriorIndex,
         programmaticScrollDepth == 0,
         ProcessInfo.processInfo.systemUptime >= ignoreScrollPositionEventsUntil,
         collectionView.isDragging || collectionView.isDecelerating,
         isHalfGridTickIndex(idx)
      {
        let intensity: CGFloat = isMajorTickIndex(idx) ? 0.52 : 0.36
        majorTickHaptic.impactOccurred(intensity: intensity)
      }
    }

    model.centerIndex = idx
    let measuredDisplay = model.valueForIndex(idx, unit: model.unit)
    lastMeasuredValue = model.heightCmForIndex(idx)
    model.currentValue = measuredDisplay

    if emit {
      let now = ProcessInfo.processInfo.systemUptime
      if now - lastThrottle >= 0.04 {
        lastThrottle = now
        emitValueIfChanged(model.emitString(forIndex: idx))
      }
      scheduleScrollEndEmit()
    }
    refreshTickCells()
  }

  private func scheduleScrollEndEmit() {
    scrollEndWork?.cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self else { return }
      guard ProcessInfo.processInfo.systemUptime >= self.ignoreScrollPositionEventsUntil else { return }
      let idx = self.clampIndex(self.currentCenterIndexFromOffset())
      self.model.centerIndex = idx
      self.emitValueIfChanged(self.model.emitString(forIndex: idx))
      self.onScrollEnd()
    }
    scrollEndWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.14, execute: work)
  }

  private func applyExternalInitialValueIfNeeded(force: Bool) {
    if !force, collectionView.isDragging || collectionView.isDecelerating { return }
    let targetIdx = clampIndex(model.indexForInitialValueCm(model.initialValue))
    if !force, targetIdx == model.centerIndex { return }
    model.centerIndex = targetIdx
    centerPosition = CGFloat(targetIdx)
    scrollToCenterIndex(targetIdx, postLayoutRetries: true)
    refreshTickCells()
  }

  // MARK: - UICollectionViewDataSource & UIScrollViewDelegate

  func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
    model.totalSteps + 1
  }

  func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
    let cell = collectionView.dequeueReusableCell(withReuseIdentifier: HeightRulerTickCell.reuseId, for: indexPath) as! HeightRulerTickCell
    cell.apply(
      index: indexPath.item,
      model: model,
      centerPosition: centerPosition,
      totalSteps: model.totalSteps,
      labelColumnWidth: CGFloat(model.labelColumnWidth),
      labelToTickGap: CGFloat(model.labelToTickGap)
    )
    return cell
  }

  func scrollViewWillBeginDragging(_ scrollView: UIScrollView) {
    scrollEndWork?.cancel()
    onScrollBegin()
    majorTickHaptic.prepare()
    updateGlassInteractionVisuals()
  }

  func scrollViewWillEndDragging(
    _ scrollView: UIScrollView,
    withVelocity velocity: CGPoint,
    targetContentOffset: UnsafeMutablePointer<CGPoint>
  ) {
    let itemSize = CGFloat(model.tickSpacing)
    guard itemSize > 0, scrollView.bounds.height > 0 else { return }
    let vp = scrollView.bounds.height
    let pad = endPadding()
    let proposedY = targetContentOffset.pointee.y
    let midContentY = proposedY + vp / 2
    let rawIndex = (midContentY - pad - itemSize / 2) / itemSize
    let snapped = round(Double(rawIndex))
    let clampedIndex = min(max(0, snapped), Double(model.totalSteps))
    let snappedY = pad + CGFloat(clampedIndex) * itemSize + itemSize / 2 - vp / 2
    let maxY = max(0, scrollView.contentSize.height - scrollView.bounds.height)
    targetContentOffset.pointee.y = min(max(0, snappedY), maxY)
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    if programmaticScrollDepth > 0 {
      refreshTickCells()
      return
    }
    if ProcessInfo.processInfo.systemUptime < ignoreScrollPositionEventsUntil {
      refreshTickCells()
      return
    }
    updateCenterFromScroll(emit: true)
    updateGlassInteractionVisuals()
  }

  func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
    if !decelerate {
      updateGlassInteractionVisuals()
      centerPosition = CGFloat(clampIndex(currentCenterIndexFromOffset()))
      refreshTickCells()
    }
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    updateGlassInteractionVisuals()
    centerPosition = CGFloat(clampIndex(currentCenterIndexFromOffset()))
    refreshTickCells()
  }
}
