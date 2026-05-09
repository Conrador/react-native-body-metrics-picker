import UIKit

// MARK: - Custom font resolver (matches Expo / RN `fontFamily` keys)

private enum WeightRulerExpoFontResolver {
  private static var cache: [String: UIFont] = [:]

  static func uiFont(familyKey: String?, size: CGFloat, weight: UIFont.Weight) -> UIFont? {
    guard let raw = familyKey?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
      return nil
    }
    let cacheKey = "\(raw)_\(size)_\(weight.rawValue)"
    if let hit = cache[cacheKey] {
      return hit
    }
    if let exact = UIFont(name: raw, size: size) {
      cache[cacheKey] = exact
      return exact
    }
    guard let u = raw.firstIndex(of: "_") else { return nil }
    let stem = String(raw[..<u])
    let variant = String(raw[raw.index(after: u)...]).lowercased()
    let faces: [String] = UIFont.familyNames.flatMap { fam -> [String] in
      if fam.compare(stem, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame {
        return UIFont.fontNames(forFamilyName: fam)
      }
      if fam.replacingOccurrences(of: " ", with: "").caseInsensitiveCompare(stem) == .orderedSame {
        return UIFont.fontNames(forFamilyName: fam)
      }
      return []
    }
    let candidates = faces.isEmpty ? UIFont.fontNames(forFamilyName: stem) : faces
    guard !candidates.isEmpty else { return nil }
    func pickName() -> String? {
      if variant.contains("700") || (variant.contains("bold") && !variant.contains("semi")) {
        return candidates.first { $0.localizedCaseInsensitiveContains("Bold") && !$0.localizedCaseInsensitiveContains("Semi") }
      }
      if variant.contains("600") {
        return candidates.first { $0.localizedCaseInsensitiveContains("SemiBold") }
      }
      return candidates.first
    }
    guard let n = pickName(), let font = UIFont(name: n, size: size) else { return nil }
    cache[cacheKey] = font
    return font
  }
}

// MARK: - Color helper

private enum WRColor {
  static func parse(_ raw: String?) -> UIColor {
    guard let s = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else {
      return .gray
    }
    if s.hasPrefix("#") {
      let hex = String(s.dropFirst())
      if hex.count == 6, let v = UInt32(hex, radix: 16) {
        let r = CGFloat((v >> 16) & 0xff) / 255
        let g = CGFloat((v >> 8) & 0xff) / 255
        let b = CGFloat(v & 0xff) / 255
        return UIColor(red: r, green: g, blue: b, alpha: 1)
      }
      if hex.count == 8, let v = UInt32(hex, radix: 16) {
        let r = CGFloat((v >> 24) & 0xff) / 255
        let g = CGFloat((v >> 16) & 0xff) / 255
        let b = CGFloat((v >> 8) & 0xff) / 255
        let a = CGFloat(v & 0xff) / 255
        return UIColor(red: r, green: g, blue: b, alpha: a)
      }
    }
    if s.hasPrefix("rgba("), s.hasSuffix(")") {
      let inner = s.dropFirst(5).dropLast()
      let parts = inner.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
      if parts.count >= 4,
         let rf = Double(parts[0]), let gf = Double(parts[1]),
         let bf = Double(parts[2]), let af = Double(parts[3]) {
        var r = CGFloat(rf), g = CGFloat(gf), b = CGFloat(bf), a = CGFloat(af)
        if r > 1 { r /= 255 }
        if g > 1 { g /= 255 }
        if b > 1 { b /= 255 }
        if a > 1 { a /= 255 }
        return UIColor(red: r, green: g, blue: b, alpha: a)
      }
    }
    if s.hasPrefix("rgb("), s.hasSuffix(")") {
      let inner = s.dropFirst(4).dropLast()
      let parts = inner.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
      if parts.count >= 3,
         let rf = Double(parts[0]), let gf = Double(parts[1]), let bf = Double(parts[2]) {
        var r = CGFloat(rf), g = CGFloat(gf), b = CGFloat(bf)
        if r > 1 { r /= 255 }
        if g > 1 { g /= 255 }
        if b > 1 { b /= 255 }
        return UIColor(red: r, green: g, blue: b, alpha: 1)
      }
    }
    return .gray
  }

  static func parseOrNil(_ raw: String?) -> UIColor? {
    guard let s = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else {
      return nil
    }
    if s == "transparent" { return .clear }
    return parse(s)
  }

  static func blend(_ a: UIColor, with b: UIColor, t: CGFloat) -> UIColor {
    let u = max(0, min(1, t))
    var ar: CGFloat = 0, ag: CGFloat = 0, ab: CGFloat = 0, aa: CGFloat = 0
    var br: CGFloat = 0, bg: CGFloat = 0, bb: CGFloat = 0, ba: CGFloat = 0
    a.getRed(&ar, green: &ag, blue: &ab, alpha: &aa)
    b.getRed(&br, green: &bg, blue: &bb, alpha: &ba)
    return UIColor(
      red: ar + (br - ar) * u,
      green: ag + (bg - ag) * u,
      blue: ab + (bb - ab) * u,
      alpha: aa + (ba - aa) * u
    )
  }
}

// MARK: - Default glass chrome

/// Hardcoded glass chrome (sheen / border / rim) — only the highlight + accent colors come from JS.
private enum WeightRulerFixedGlassChrome {
  static let surface = "rgba(255, 255, 255, 0.22)"
  static let border = "rgba(60, 60, 67, 0.16)"
  static let sheen = "rgba(255, 255, 255, 0.32)"
  static let rim = "rgba(10, 20, 40, 0.07)"
  static let liquidBorder = "rgba(255, 255, 255, 0.78)"
}

// MARK: - Arc-band glass overlay

/// Visual effect view masked into an arc band shape (top of the kitchen-scale dial).
/// Mirrors `RulerGlassUIKitView` from `HeightRulerUIKitView` but with an arc-band path
/// instead of a vertical capsule.
private final class WeightRulerArcGlassView: UIView {
  private let blurView = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialLight))
  private let reduceTransparencyFill = UIView()
  private let sheenLayer = CAGradientLayer()
  private let tintLayer = CAShapeLayer()
  private let borderLayer = CAShapeLayer()
  private let liquidBorderLayer = CAShapeLayer()
  private let blurMaskLayer = CAShapeLayer()
  private let reduceMaskLayer = CAShapeLayer()

  private(set) var arcGeometry: ArcGlassGeometry = .zero
  private var lastPath: UIBezierPath?

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    clipsToBounds = false
    backgroundColor = .clear

    reduceTransparencyFill.translatesAutoresizingMaskIntoConstraints = false
    reduceTransparencyFill.isHidden = true
    reduceTransparencyFill.backgroundColor = .clear
    addSubview(reduceTransparencyFill)
    NSLayoutConstraint.activate([
      reduceTransparencyFill.topAnchor.constraint(equalTo: topAnchor),
      reduceTransparencyFill.leadingAnchor.constraint(equalTo: leadingAnchor),
      reduceTransparencyFill.trailingAnchor.constraint(equalTo: trailingAnchor),
      reduceTransparencyFill.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
    reduceTransparencyFill.layer.mask = reduceMaskLayer

    blurView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(blurView)
    NSLayoutConstraint.activate([
      blurView.topAnchor.constraint(equalTo: topAnchor),
      blurView.leadingAnchor.constraint(equalTo: leadingAnchor),
      blurView.trailingAnchor.constraint(equalTo: trailingAnchor),
      blurView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
    blurView.layer.mask = blurMaskLayer

    sheenLayer.colors = [UIColor.white.withAlphaComponent(0.34).cgColor, UIColor.clear.cgColor]
    sheenLayer.startPoint = CGPoint(x: 0.5, y: 0)
    sheenLayer.endPoint = CGPoint(x: 0.5, y: 0.62)
    blurView.contentView.layer.addSublayer(sheenLayer)

    tintLayer.fillColor = UIColor.clear.cgColor
    blurView.contentView.layer.addSublayer(tintLayer)

    borderLayer.fillColor = UIColor.clear.cgColor
    liquidBorderLayer.fillColor = UIColor.clear.cgColor
    layer.addSublayer(borderLayer)
    layer.addSublayer(liquidBorderLayer)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func updateGeometry(_ geom: ArcGlassGeometry) {
    arcGeometry = geom
    let path = geom.bezierPath()
    lastPath = path
    blurMaskLayer.path = path.cgPath
    reduceMaskLayer.path = path.cgPath
    tintLayer.path = path.cgPath
    borderLayer.path = path.cgPath
    liquidBorderLayer.path = path.cgPath
    sheenLayer.frame = path.bounds
  }

  /// Mirrors the `apply(...)` used by `HeightRulerUIKitView`'s glass capsule:
  ///   - In-motion (drag / decel / glass press): blur reads stronger, sheen brightens, tint
  ///     thins out, the liquid rim picks up extra opacity.
  ///   - Idle: blur sits more opaquely over the canvas, sheen dims slightly, tint thickens.
  /// The fixed chrome (surface / border / sheen / rim / liquidBorder) is intentionally NOT
  /// configurable from JS on iOS — same as `HeightRulerFixedGlassChrome`. Custom JS pill colors
  /// only apply on Android (where they map onto `glassPillBackgroundColor`).
  func apply(
    surface: UIColor,
    border: UIColor,
    sheenTop: UIColor,
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
      // Slightly stronger "live glass" while scrolling or pressing the band (clearer blur + sheen),
      // calmer when idle — same ratios as `RulerGlassUIKitView` in `HeightRulerUIKitView`.
      blurView.alpha = inMotion ? 0.20 : 0.42
      sheenLayer.colors = [sheenTop.withAlphaComponent(inMotion ? 0.28 : 0.34).cgColor, UIColor.clear.cgColor]
      let tintAlpha: CGFloat = inMotion ? 0.05 : 0.20
      tintLayer.fillColor = surface.withAlphaComponent(tintAlpha).cgColor
      borderLayer.lineWidth = 1 / UIScreen.main.scale
      borderLayer.strokeColor = border.cgColor
      liquidBorderLayer.lineWidth = 1 / UIScreen.main.scale
      liquidBorderLayer.strokeColor = liquidBorder.withAlphaComponent(inMotion ? 0.72 : 0.9).cgColor
    }
  }

  /// Same press / drag transform feel as the height ruler glass capsule — a slight horizontal
  /// stretch + vertical squash + tiny lift so the band visibly "responds" to long-press / scroll
  /// without distorting the arc curvature.
  func setInMotion(_ motion: Bool) {
    UIView.animate(withDuration: 0.06, delay: 0, options: [.beginFromCurrentState, .curveLinear]) {
      let sx: CGFloat = motion ? 1.035 : 1
      let sy: CGFloat = motion ? 0.94 : 1
      self.transform = CGAffineTransform(scaleX: sx, y: sy).translatedBy(x: 0, y: motion ? -0.6 : 0)
    }
  }
}

/// Geometry of the arc band glass overlay.
private struct ArcGlassGeometry {
  let arcCenter: CGPoint
  let outerRadius: CGFloat
  let innerRadius: CGFloat
  let halfAngle: CGFloat
  let topAngle: CGFloat
  /// Rounding (in points) applied to the four corners of the arc band.
  var cornerRadius: CGFloat = 0

  static let zero = ArcGlassGeometry(
    arcCenter: .zero, outerRadius: 0, innerRadius: 0, halfAngle: 0, topAngle: -.pi / 2, cornerRadius: 0
  )

  func bezierPath() -> UIBezierPath {
    let path = UIBezierPath()
    let leftAngle = topAngle - halfAngle
    let rightAngle = topAngle + halfAngle
    // Defensive clamp: corner can't exceed half the radial thickness or half the arc length.
    let radialThickness = max(0, outerRadius - innerRadius)
    let arcLength = max(0, 2 * halfAngle * innerRadius)
    let cr = max(0, min(cornerRadius, min(radialThickness * 0.5, arcLength * 0.5)))

    func pt(_ a: CGFloat, _ r: CGFloat) -> CGPoint {
      return CGPoint(x: arcCenter.x + cos(a) * r, y: arcCenter.y + sin(a) * r)
    }

    if cr <= 0.5 {
      // Original (sharp) path — keep as a fallback for very tiny glass bands.
      path.move(to: pt(leftAngle, outerRadius))
      path.addArc(withCenter: arcCenter, radius: outerRadius, startAngle: leftAngle, endAngle: rightAngle, clockwise: true)
      path.addLine(to: pt(rightAngle, innerRadius))
      path.addArc(withCenter: arcCenter, radius: innerRadius, startAngle: rightAngle, endAngle: leftAngle, clockwise: false)
      path.close()
      return path
    }

    let outerInsetA = cr / max(outerRadius, 1)
    let innerInsetA = cr / max(innerRadius, 1)
    let arcLeftStart = leftAngle + outerInsetA
    let arcRightEnd = rightAngle - outerInsetA
    let arcRightStartInner = rightAngle - innerInsetA
    let arcLeftEndInner = leftAngle + innerInsetA

    let outerStart = pt(arcLeftStart, outerRadius)
    let outerEndInsetOnRight = pt(rightAngle, outerRadius - cr)
    let innerEndInsetOnRight = pt(rightAngle, innerRadius + cr)
    let innerStart = pt(arcRightStartInner, innerRadius)
    let innerEnd = pt(arcLeftEndInner, innerRadius)
    let innerStartInsetOnLeft = pt(leftAngle, innerRadius + cr)
    let outerStartInsetOnLeft = pt(leftAngle, outerRadius - cr)

    let cornerB_corner = pt(rightAngle, outerRadius)   // sharp top-right (outer × right radial)
    let cornerC_corner = pt(rightAngle, innerRadius)   // sharp bottom-right (right radial × inner)
    let cornerD_corner = pt(leftAngle, innerRadius)    // sharp bottom-left (inner × left radial)
    let cornerA_corner = pt(leftAngle, outerRadius)    // sharp top-left (left radial × outer)

    path.move(to: outerStart)
    path.addArc(
      withCenter: arcCenter, radius: outerRadius,
      startAngle: arcLeftStart, endAngle: arcRightEnd, clockwise: true
    )
    path.addQuadCurve(to: outerEndInsetOnRight, controlPoint: cornerB_corner)
    path.addLine(to: innerEndInsetOnRight)
    path.addQuadCurve(to: innerStart, controlPoint: cornerC_corner)
    path.addArc(
      withCenter: arcCenter, radius: innerRadius,
      startAngle: arcRightStartInner, endAngle: arcLeftEndInner, clockwise: false
    )
    path.addQuadCurve(to: innerStartInsetOnLeft, controlPoint: cornerD_corner)
    path.addLine(to: outerStartInsetOnLeft)
    path.addQuadCurve(to: outerStart, controlPoint: cornerA_corner)
    path.close()
    return path
  }
}

// MARK: - Main ruler

/// Custom view that draws an arc weight scale and handles pan-to-scroll with momentum + snap.
final class WeightRulerUIKitView: UIView, UIGestureRecognizerDelegate {

  private let model: WeightRulerStateModel
  private let onValueEmit: (String) -> Void
  private let onScrollBegin: () -> Void
  private let onScrollEnd: () -> Void

  private var panRecognizer: UIPanGestureRecognizer!
  /// Long-press recognizer with `minimumPressDuration = 0` — fires immediately when the user
  /// touches inside the glass band. Used to drive the same `inMotion` chrome / transform that
  /// scrolling uses, exactly like `HeightRulerUIKitView`'s `glassPressRecognizer`.
  private var glassPressRecognizer: UILongPressGestureRecognizer!
  /// True when a finger is currently down on the glass band (not necessarily moving). Combined
  /// with the active motion state to decide whether the chrome should look "live" or idle.
  private var glassPressActive: Bool = false
  /// True from the moment a pan gesture begins until the resulting snap/inertia animation
  /// finalizes. Keeps the glass chrome "active" for the entire scroll even when the finger
  /// drags outside the small glass hit-rect (which would otherwise drop `glassPressActive`).
  private var isPanActive: Bool = false
  private var displayLink: CADisplayLink?

  /// Continuous (un-snapped) value used for rendering — driven by gesture, momentum, snap animation.
  private var liveValue: Double = 75

  private var motionState: MotionState = .idle
  private enum MotionState { case idle, inertial, snapping }
  private var inertialVelocity: Double = 0
  private var snapStartValue: Double = 0
  private var snapTargetValue: Double = 0
  private var snapStartTime: CFTimeInterval = 0
  private var snapDuration: CFTimeInterval = 0.22

  private var lastEmitPayload: String?
  private var lastTickHapticIndex: Int?
  private let tickHaptic = UIImpactFeedbackGenerator(style: .light)
  private let majorHaptic = UIImpactFeedbackGenerator(style: .rigid)

  private var lastSyncedInitialValue: Double = .nan
  private var hasAppeared = false

  /// Glass arc-band overlay on the topmost part of the arc.
  private let glassView = WeightRulerArcGlassView()

  init(
    model: WeightRulerStateModel,
    onValueEmit: @escaping (String) -> Void,
    onScrollBegin: @escaping () -> Void,
    onScrollEnd: @escaping () -> Void
  ) {
    self.model = model
    self.onValueEmit = onValueEmit
    self.onScrollBegin = onScrollBegin
    self.onScrollEnd = onScrollEnd
    super.init(frame: .zero)

    backgroundColor = .clear
    isUserInteractionEnabled = true
    contentMode = .redraw
    clipsToBounds = false

    panRecognizer = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
    panRecognizer.delegate = self
    panRecognizer.maximumNumberOfTouches = 1
    addGestureRecognizer(panRecognizer)

    glassPressRecognizer = UILongPressGestureRecognizer(target: self, action: #selector(handleGlassPress(_:)))
    glassPressRecognizer.minimumPressDuration = 0
    glassPressRecognizer.cancelsTouchesInView = false
    glassPressRecognizer.delegate = self
    addGestureRecognizer(glassPressRecognizer)

    glassView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(glassView)
    NSLayoutConstraint.activate([
      glassView.topAnchor.constraint(equalTo: topAnchor),
      glassView.leadingAnchor.constraint(equalTo: leadingAnchor),
      glassView.trailingAnchor.constraint(equalTo: trailingAnchor),
      glassView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      stopDisplayLink()
    }
  }

  // MARK: - Sync

  func syncWithModel() {
    let trackColor = WRColor.parseOrNil(model.colorTrack)
    backgroundColor = trackColor ?? .clear
    if !hasAppeared || lastSyncedInitialValue != model.initialValue {
      lastSyncedInitialValue = model.initialValue
      liveValue = model.snappedValue(model.initialValue)
      model.currentValue = liveValue
      stopMotion()
      hasAppeared = true
      emitValueIfChanged(model.emitString(forValue: liveValue))
    }
    setNeedsLayout()
    setNeedsDisplay()
  }

  // MARK: - Pan + momentum

  @objc private func handlePan(_ gr: UIPanGestureRecognizer) {
    switch gr.state {
    case .began:
      stopMotion()
      onScrollBegin()
      tickHaptic.prepare()
      majorHaptic.prepare()
      isPanActive = true
      refreshMotionVisuals()
    case .changed:
      let translation = gr.translation(in: self)
      gr.setTranslation(.zero, in: self)
      let dValue = -Double(translation.x) / Double(valuePxAtArc())
      liveValue = rubberBand(value: liveValue + dValue)
      handleHapticsForLive()
      emitThrottled()
      setNeedsDisplay()
    case .ended, .cancelled, .failed:
      let velocityX = Double(gr.velocity(in: self).x)
      inertialVelocity = -velocityX / Double(valuePxAtArc())
      if abs(inertialVelocity) > 6 {
        startInertia()
      } else {
        startSnapToNearest()
      }
    default:
      break
    }
  }

  private func valuePxAtArc() -> CGFloat {
    let spacing = max(0.1, CGFloat(model.tickSpacingPx))
    let stepsPerUnit = 1.0 / max(0.0001, CGFloat(model.step))
    return spacing * stepsPerUnit
  }

  private func rubberBand(value: Double) -> Double {
    let lo = model.rangeMin
    let hi = model.rangeMax
    let band = max(2.0, model.step * 4.0)
    if value < lo {
      let over = lo - value
      return lo - band * (1.0 - 1.0 / (1.0 + over / band))
    }
    if value > hi {
      let over = value - hi
      return hi + band * (1.0 - 1.0 / (1.0 + over / band))
    }
    return value
  }

  // MARK: - Inertia + snap (CADisplayLink driven)

  private func startInertia() {
    motionState = .inertial
    startDisplayLinkIfNeeded()
  }

  private func startSnapToNearest() {
    let target = model.snappedValue(liveValue)
    if abs(target - liveValue) < 0.001 {
      finalizeSnap(target: target)
      return
    }
    snapStartValue = liveValue
    snapTargetValue = target
    snapStartTime = CACurrentMediaTime()
    snapDuration = 0.22
    motionState = .snapping
    startDisplayLinkIfNeeded()
  }

  private func finalizeSnap(target: Double) {
    motionState = .idle
    isPanActive = false
    stopDisplayLink()
    liveValue = target
    model.currentValue = target
    emitValueIfChanged(model.emitString(forValue: target))
    onScrollEnd()
    refreshMotionVisuals()
    setNeedsDisplay()
  }

  private func stopMotion() {
    motionState = .idle
    isPanActive = false
    inertialVelocity = 0
    stopDisplayLink()
  }

  private func startDisplayLinkIfNeeded() {
    if displayLink != nil { return }
    let dl = CADisplayLink(target: self, selector: #selector(tickFrame(_:)))
    dl.add(to: .main, forMode: .common)
    displayLink = dl
  }

  private func stopDisplayLink() {
    displayLink?.invalidate()
    displayLink = nil
  }

  @objc private func tickFrame(_ link: CADisplayLink) {
    let dt = max(0.0001, link.targetTimestamp - link.timestamp)
    switch motionState {
    case .idle:
      stopDisplayLink()
    case .inertial:
      stepInertia(dt: dt)
    case .snapping:
      stepSnap()
    }
    handleHapticsForLive()
    emitThrottled()
    setNeedsDisplay()
  }

  private func stepInertia(dt: CFTimeInterval) {
    let friction = 3.6
    inertialVelocity *= exp(-friction * dt)
    liveValue += inertialVelocity * dt
    let lo = model.rangeMin, hi = model.rangeMax
    if liveValue <= lo - 0.5 || liveValue >= hi + 0.5 {
      liveValue = min(max(liveValue, lo), hi)
      startSnapToNearest()
      return
    }
    if abs(inertialVelocity) < 1.0 {
      startSnapToNearest()
    }
  }

  private func stepSnap() {
    let now = CACurrentMediaTime()
    let t = min(1.0, max(0.0, (now - snapStartTime) / snapDuration))
    let eased = 1.0 - pow(1.0 - t, 3.0)
    liveValue = snapStartValue + (snapTargetValue - snapStartValue) * eased
    if t >= 1.0 {
      finalizeSnap(target: snapTargetValue)
    }
  }

  // MARK: - Haptics + emit

  private func handleHapticsForLive() {
    let idx = model.indexForValue(liveValue)
    if idx == lastTickHapticIndex { return }
    let hadPrior = lastTickHapticIndex != nil
    lastTickHapticIndex = idx
    guard hadPrior else { return }
    let v = model.valueForIndex(idx)
    if model.isMajor(value: v) {
      majorHaptic.impactOccurred(intensity: 0.6)
    } else {
      tickHaptic.impactOccurred(intensity: 0.35)
    }
  }

  private var lastEmitTime: CFTimeInterval = 0
  private func emitThrottled() {
    let now = CACurrentMediaTime()
    if now - lastEmitTime < 0.04 { return }
    lastEmitTime = now
    emitValueIfChanged(model.emitString(forValue: liveValue))
  }

  private func emitValueIfChanged(_ payload: String) {
    if lastEmitPayload == payload { return }
    lastEmitPayload = payload
    onValueEmit(payload)
    model.currentValue = model.snappedValue(liveValue)
  }

  // MARK: - Drawing

  override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext(), bounds.width > 0, bounds.height > 0 else { return }
    drawArcRuler(in: ctx)
    drawGlassLabels(in: ctx)
  }

  // Glass animation tuning constants — used by the snap boost (tick growth + radial lift) and the
  // angular spread that pushes neighbor labels further left/right under the glass.
  private let glassUnifiedTickBonus: CGFloat = 4    // extra dp added to the longest snapped tick
  private let glassLiftMax: CGFloat = 0             // ticks only grow/shrink — no radial lift animation
  private let glassBoostSigma: CGFloat = 1.1        // Gaussian width of the snap boost (smaller = steeper falloff)
  private let glassUniformSigma: CGFloat = 2.0      // wider Gaussian — how strongly we treat a tick as "uniform" inside the glass
  private let glassLabelSpread: CGFloat = 2.0       // visual angular multiplier for the 3 glass labels
  private let glassCornerRadius: CGFloat = 9        // rounded corner radius for the arc-band
  private let glassStaticFadeBand: CGFloat = 0.55   // angular fade halo (in step-units) on each side of the band edge
  /// Extra radial padding (dp) that pushes the entire glass band outward — i.e. visually UP — so it
  /// sits a little higher above the tick tips and the static labels below have more breathing room.
  private let glassRadialOffset: CGFloat = 8

  /// Vertical reserve (along the radius) above the arc edge that fits ticks pointing outward,
  /// the snapped lift + unified bonus, and the glass top padding. Labels live INSIDE the arc face
  /// (deeper toward the arc center) so they do **not** consume space above the tick tips.
  private func topRadialReserve() -> CGFloat {
    return CGFloat(model.majorTickHeight)
      + glassUnifiedTickBonus
      + glassLiftMax
      + max(0, CGFloat(model.glassOuterPadding))
      + glassRadialOffset
      + 4
  }

  private func arcGeometry() -> (center: CGPoint, radius: CGFloat) {
    let centerX = bounds.midX
    let centerY = bounds.maxY + max(40, CGFloat(model.arcCenterOffset))
    // Reserve room above the arc tip for ticks-extending-outward + labels + the glass band.
    let radius = centerY - bounds.minY - topRadialReserve()
    return (CGPoint(x: centerX, y: centerY), max(40, radius))
  }

  /// Visual reference value used for tick/label rendering — clamped to the configured range so the
  /// snapped boundary tick (`rangeMin` / `rangeMax`) stays visually centered when the user
  /// rubber-band-overdrags past the edge. The underlying `liveValue` keeps overshooting so the
  /// gesture still feels springy, but nothing animates past the boundary.
  private func displayLiveValue() -> Double {
    return min(model.rangeMax, max(model.rangeMin, liveValue))
  }

  private func angleFor(value v: Double, geom: (center: CGPoint, radius: CGFloat)) -> CGFloat {
    let angleStep = CGFloat(model.tickSpacingPx) / geom.radius / CGFloat(max(0.0001, model.step))
    return -CGFloat.pi / 2.0 + CGFloat(v - displayLiveValue()) * angleStep
  }

  /// Half angular span used by the glass band. Derives from `tickSpacingPx` for a clearly horizontal
  /// strip — covers ~6 ticks total when the JS default `glassArcHalfAngle = 0` is passed.
  private func glassHalfAngle(geom: (center: CGPoint, radius: CGFloat)) -> CGFloat {
    if model.glassArcHalfAngle > 0 {
      return CGFloat(model.glassArcHalfAngle)
    }
    let perStep = CGFloat(model.tickSpacingPx) / geom.radius / CGFloat(max(0.0001, model.step))
    // 3.0 step-spans on each side so the glass is clearly wider than tall (3 labels + side overhang).
    return perStep * (3.0 * model.step)
  }

  /// Snap-centered boost (in [0, 1]) used uniformly for tick growth, stroke bump, and radial lift.
  /// Gaussian falloff so the snapped tick is clearly the tallest and neighbors taper down sharply
  /// (peak 1.0 at snap, ~0.44 at ±1 step, ~0.04 at ±2 steps, ~0 at ±3 steps).
  private func glassSnapBoost(distSteps: Double) -> Double {
    let d = abs(distSteps)
    if d > 3.0 { return 0 }
    return exp(-pow(d / Double(glassBoostSigma), 2.0))
  }

  /// Wider Gaussian weight used to treat ticks UNIFORMLY under the glass — i.e. a major neighbor
  /// gets visually pulled down toward the minor base length so it doesn't tower over its peers.
  /// 1.0 at snap, ~0.78 at ±1 step, ~0.37 at ±2 steps, ~0.10 at ±3 steps, 0 beyond.
  private func glassUniformWeight(distSteps: Double) -> Double {
    let d = abs(distSteps)
    if d > 4.0 { return 0 }
    return exp(-pow(d / Double(glassUniformSigma), 2.0))
  }

  /// `1` when a value lives **inside** the glass band (so static labels underneath the glass are
  /// fully hidden), `0` outside, with a smooth crossfade across the band edge so static labels
  /// fade in/out as the band slides over them.
  private func glassCoverage(distSteps: Double, geom: (center: CGPoint, radius: CGFloat)) -> Double {
    let halfA = Double(glassHalfAngle(geom: geom))
    let angleStep = Double(model.tickSpacingPx) / Double(geom.radius) / max(0.0001, model.step)
    let halfSteps = halfA / max(0.0001, angleStep) / max(0.0001, model.step)
    let d = abs(distSteps)
    let band = Double(glassStaticFadeBand)
    let lo = max(0, halfSteps - band)
    let hi = halfSteps + band
    if d <= lo { return 1 }
    if d >= hi { return 0 }
    let t = (d - lo) / (hi - lo)
    let smooth = t * t * (3 - 2 * t)
    return 1 - smooth
  }

  private func drawArcRuler(in ctx: CGContext) {
    let geom = arcGeometry()
    let lo = Int(model.rangeMin)
    let hi = Int(model.rangeMax)
    let stepInt = max(1, Int(model.step))

    let halfWidth = bounds.width / 2.0
    let visibleHalfAngle = atan2(halfWidth + 60, geom.radius - 8)

    let baseColor = WRColor.parse(model.colorTick)
    let midColor = WRColor.parse(model.colorMidTick)
    let majorColor = WRColor.parse(model.colorMajorTick)
    let activeColor = WRColor.parse(model.colorActiveTick)
    let neighborColor = WRColor.parse(model.colorActiveNeighborTick)

    let labelFont = WeightRulerExpoFontResolver.uiFont(
      familyKey: model.fontFamily,
      size: CGFloat(model.tickLabelFontSize),
      weight: .semibold
    ) ?? .systemFont(ofSize: CGFloat(model.tickLabelFontSize), weight: .semibold)

    // Use the clamped (in-range) reference value so the boundary tick stays the snapped one and
    // its label/length doesn't visually animate while the user overdrags past the edge.
    let visualLive = displayLiveValue()
    let snappedIndex = model.indexForValue(visualLive)
    // Static major labels live INSIDE the arc face (deeper toward arc center) — `glassLabelArea` controls
    // how far below the arc edge the label center sits, leaving the tick area entirely above the arc.
    let staticLabelRadius = max(40, geom.radius - CGFloat(model.glassLabelArea) * 0.5 - 4)
    let unifiedTargetLen = CGFloat(model.majorTickHeight) + glassUnifiedTickBonus
    var v = lo
    while v <= hi {
      let dValue = Double(v) - visualLive
      let dStep = dValue / max(0.0001, model.step)
      let angle = angleFor(value: Double(v), geom: geom)
      let deltaAngle = abs(angle - (-CGFloat.pi / 2.0))
      if deltaAngle > visibleHalfAngle {
        v += stepInt
        continue
      }
      let cosA = cos(angle), sinA = sin(angle)
      let isMajor = model.isMajor(value: Double(v))
      let isMid = model.isMid(value: Double(v))

      // Snap boost — drives tick length, stroke bump, **and** radial lift uniformly.
      let boost = glassSnapBoost(distSteps: dStep)
      // Wider weight that pulls every tick under the glass toward the minor baseline so a MAJOR
      // landing on a neighbor slot doesn't keep its full natural height (it should look like its peers).
      let uniform = glassUniformWeight(distSteps: dStep)
      let baseLength: CGFloat = {
        if isMajor { return CGFloat(model.majorTickHeight) }
        if isMid { return CGFloat(model.midTickHeight) }
        return CGFloat(model.minorTickHeight)
      }()
      let glassFloor = CGFloat(model.minorTickHeight)
      // Inside the glass area, suppress the natural baseLen toward `glassFloor` so all ticks share
      // a common starting size — then add the snap boost on top so the centered tick is the tallest.
      let suppressedBase = baseLength + (glassFloor - baseLength) * CGFloat(uniform)
      let mixedLen = suppressedBase + (unifiedTargetLen - suppressedBase) * CGFloat(boost)
      // Lift the entire tick outward (away from arc center) — snapped highest, neighbors slightly lower.
      let lift = glassLiftMax * CGFloat(boost)
      let inner = geom.radius + lift
      let outer = inner + mixedLen
      let pBase = CGPoint(x: geom.center.x + cosA * inner, y: geom.center.y + sinA * inner)
      let pTip = CGPoint(x: geom.center.x + cosA * outer, y: geom.center.y + sinA * outer)

      let valueIndex = model.indexForValue(Double(v))
      let distSnap = abs(valueIndex - snappedIndex)
      var color: UIColor = isMajor ? majorColor : (isMid ? midColor : baseColor)
      if distSnap == 0 {
        let fraction = max(0.0, 1.0 - abs(dValue / max(0.5, model.step)))
        color = WRColor.blend(color, with: activeColor, t: CGFloat(fraction))
      } else if distSnap == 1 {
        color = WRColor.blend(color, with: neighborColor, t: 0.45)
      }

      ctx.saveGState()
      ctx.setStrokeColor(color.cgColor)
      // Stroke width follows the snap boost too, peaking on the centered tick.
      let strokeBump: CGFloat = 1 + 0.6 * CGFloat(boost)
      ctx.setLineWidth(CGFloat(model.tickWidth) * strokeBump)
      ctx.setLineCap(.round)
      ctx.move(to: pBase)
      ctx.addLine(to: pTip)
      ctx.strokePath()
      ctx.restoreGState()

      // Static major labels — drawn INSIDE the arc face (between arc edge and arc center). Their
      // alpha smoothly fades to 0 while the glass band slides over them and back to ~0.85 once they
      // leave the band.
      if isMajor {
        let coverage = glassCoverage(distSteps: dStep, geom: geom)
        let alpha = max(0.0, 1.0 - coverage) * 0.85
        if alpha > 0.01 {
          let label = model.tickLabel(forValue: Double(v))
          drawRadialLabel(
            ctx: ctx,
            text: label,
            center: geom.center,
            radius: staticLabelRadius,
            angle: angle,
            font: labelFont,
            color: majorColor.withAlphaComponent(CGFloat(alpha))
          )
        }
      }
      v += stepInt
    }
  }

  /// Renders the 3 labels visible under the glass (snapped center + the two adjacent step values),
  /// growing/shrinking based on distance to the live (continuous) value.
  private func drawGlassLabels(in ctx: CGContext) {
    let geom = arcGeometry()
    // Clamp the visual reference so glass labels (snap + neighbors) stop sliding past the boundary
    // while the gesture rubber-bands. `liveValue` itself is unclamped — only rendering uses this.
    let visualLive = displayLiveValue()
    let snappedIdx = model.indexForValue(visualLive)
    let candidates: [Int] = [-1, 0, 1].map { snappedIdx + $0 }
      .filter { $0 >= 0 && $0 <= model.totalSteps }

    let activeColor = WRColor.parse(model.colorActiveTick)
    let majorColor = WRColor.parse(model.colorMajorTick)
    let centerAccent: UIColor = {
      let trimmed = model.colorGlassCenterLabel.trimmingCharacters(in: .whitespacesAndNewlines)
      if trimmed.isEmpty { return activeColor }
      return WRColor.parse(trimmed)
    }()
    let neighborInk = WRColor.blend(majorColor, with: activeColor, t: 0.35)

    let baseFontSize = CGFloat(model.glassLabelFontSize)
    let labelFontFamily = model.fontFamily
    // Labels live INSIDE the arc face (between arc edge and arc center, lower in view space).
    let labelRadius = max(40, geom.radius - CGFloat(model.glassLabelArea) * 0.5 - 4)
    let centerAngle: CGFloat = -CGFloat.pi / 2.0

    for idx in candidates {
      let v = model.valueForIndex(idx)
      let dValue = v - visualLive
      let dSteps = dValue / max(0.0001, model.step)
      let baseAngle = angleFor(value: v, geom: geom)
      // Push the ±1 neighbors visually further left/right than their real angular position so the
      // 3 labels don't crowd the centered value.
      let angle = centerAngle + (baseAngle - centerAngle) * glassLabelSpread
      let dist = abs(dSteps)

      // Center wave — large bump at center, smaller for ±1 neighbor.
      let centerGlow = exp(-pow(dist / 0.55, 2.0))
      let neighborGlow = exp(-pow((dist - 1.0) / 0.55, 2.0))

      // Stronger size differential — snap goes up to ~1.30, neighbors shrink to ~0.72 — so the
      // selected value clearly dominates and the ±1 neighbors read as quiet hints.
      let baseScale: CGFloat = 0.65
      let scale = baseScale + 0.65 * CGFloat(centerGlow) + 0.10 * CGFloat(neighborGlow)
      // Smooth fade-out as the label drifts past ~0.5 step-distances; cull entirely beyond ~1.6.
      let presence: Double = dist < 0.5 ? 1.0 : max(0.0, 1.0 - (dist - 0.5) / 1.1)
      if presence <= 0.001 { continue }

      let inkBase = WRColor.blend(neighborInk, with: centerAccent, t: CGFloat(centerGlow))
      // Snap stays fully opaque; neighbors drop to ~0.45 so they don't compete visually with the snap.
      let alpha = max(0.40, 1.0 - 0.7 * dist) * presence
      let ink = inkBase.withAlphaComponent(CGFloat(min(1.0, max(0.0, alpha))))

      // Heavier weight on the snap label, lighter on neighbors — extra typographic separation.
      let weight: UIFont.Weight = dist < 0.5 ? .heavy : .regular
      let fontSize = baseFontSize * scale
      let resolved = WeightRulerExpoFontResolver.uiFont(familyKey: labelFontFamily, size: fontSize, weight: weight)
        ?? .systemFont(ofSize: fontSize, weight: weight)

      drawRadialLabel(
        ctx: ctx,
        text: model.tickLabel(forValue: v),
        center: geom.center,
        radius: labelRadius,
        angle: angle,
        font: resolved,
        color: ink
      )
    }
  }

  private func drawRadialLabel(
    ctx: CGContext,
    text: String,
    center: CGPoint,
    radius: CGFloat,
    angle: CGFloat,
    font: UIFont,
    color: UIColor
  ) {
    let attrs: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: color,
    ]
    let attributed = NSAttributedString(string: text, attributes: attrs)
    let size = attributed.size()

    let position = CGPoint(x: center.x + cos(angle) * radius, y: center.y + sin(angle) * radius)
    ctx.saveGState()
    ctx.translateBy(x: position.x, y: position.y)
    ctx.rotate(by: angle + CGFloat.pi / 2.0)
    let drawRect = CGRect(x: -size.width / 2, y: -size.height / 2, width: size.width, height: size.height)
    attributed.draw(in: drawRect)
    ctx.restoreGState()
  }

  // MARK: - Layout

  override func layoutSubviews() {
    super.layoutSubviews()
    if bounds.width > 0, bounds.height > 0 {
      let geom = arcGeometry()
      let halfA = glassHalfAngle(geom: geom)
      // Outer edge sits ABOVE the maximum lifted tick tip with a small padding.
      let maxLiftedTipR = geom.radius
        + glassLiftMax
        + CGFloat(model.majorTickHeight)
        + glassUnifiedTickBonus
      let outerR = maxLiftedTipR + max(2, CGFloat(model.glassOuterPadding)) + glassRadialOffset
      // Inner edge sits BELOW the inside-the-arc labels, with room for the centered (largest) label.
      // Same `glassRadialOffset` is added so the band shifts as a whole instead of stretching.
      let labelHalfHeight = CGFloat(model.glassLabelFontSize) * 0.65
      let innerR = max(
        40,
        geom.radius - CGFloat(model.glassLabelArea) - labelHalfHeight
          - max(2, CGFloat(model.glassOuterPadding)) + glassRadialOffset
      )
      let glassGeom = ArcGlassGeometry(
        arcCenter: geom.center,
        outerRadius: outerR,
        innerRadius: innerR,
        halfAngle: halfA,
        topAngle: -CGFloat.pi / 2,
        cornerRadius: glassCornerRadius
      )
      glassView.updateGeometry(glassGeom)
      refreshMotionVisuals()
    }
    setNeedsDisplay()
  }

  // MARK: - Gesture coordination

  /// Allow the pan recognizer (drag-to-scroll) and the glass long-press (instant chrome feedback)
  /// to track touches simultaneously — same approach as `HeightRulerUIKitView`.
  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    if gestureRecognizer === panRecognizer, otherGestureRecognizer === glassPressRecognizer {
      return true
    }
    if gestureRecognizer === glassPressRecognizer, otherGestureRecognizer === panRecognizer {
      return true
    }
    return false
  }

  // MARK: - Glass press

  /// Hit-test rect used by the glass press recognizer — bounding box of the arc-band path with a
  /// small touch slop so users don't have to land exactly inside the rounded band edges.
  private func glassHitRect() -> CGRect {
    let path = glassView.arcGeometry.bezierPath()
    if path.isEmpty { return .null }
    return path.bounds.insetBy(dx: -8, dy: -8)
  }

  @objc private func handleGlassPress(_ gr: UILongPressGestureRecognizer) {
    let pt = gr.location(in: self)
    let inside = glassHitRect().contains(pt)
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
    refreshMotionVisuals()
  }

  /// Pushes the current motion / press state into the glass chrome + transform. Called from pan,
  /// snap finalize, and the long-press recognizer so the glass always reflects the union of
  /// "the user is interacting with us" and "we're animating the value".
  private func refreshMotionVisuals() {
    let motion = motionState != .idle || glassPressActive || isPanActive
    glassView.setInMotion(motion)
    updateGlassChrome(motion: motion)
  }

  private func updateGlassChrome(motion: Bool) {
    let reduce = UIAccessibility.isReduceTransparencyEnabled
    // iOS uses the fixed white-frosted chrome from `WeightRulerFixedGlassChrome` (matches
    // `HeightRulerFixedGlassChrome`). `glassPillBackgroundColor` / `glassPillBorderColor` props
    // exist for Android only and are intentionally ignored here.
    glassView.apply(
      surface: WRColor.parse(WeightRulerFixedGlassChrome.surface),
      border: WRColor.parse(WeightRulerFixedGlassChrome.border),
      sheenTop: WRColor.parse(WeightRulerFixedGlassChrome.sheen),
      liquidBorder: WRColor.parse(WeightRulerFixedGlassChrome.liquidBorder),
      reduceTransparency: reduce,
      inMotion: motion
    )
  }
}
