import SwiftUI
import UIKit

struct HeightRulerSwiftUIView: View {
  @ObservedObject var model: RulerStateModel
  var onValueEmit: (String) -> Void
  var onScrollBegin: () -> Void
  var onScrollEnd: () -> Void

  @State private var scrolledID: Int?
  @State private var centerPosition: CGFloat = 0
  @State private var glassInMotion = false
  @State private var glassPressActive = false
  @State private var rulerOpacity: Double = 1
  @State private var lastUnit: String = "cm"
  @State private var lastMeasuredValue: Double = 0
  @State private var lastThrottle: TimeInterval = 0
  @State private var scrollEndWork: DispatchWorkItem?
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

  private var itemSize: CGFloat { CGFloat(model.tickSpacing) }
  private var totalSteps: Int { model.totalSteps }

  private var endPadding: CGFloat {
    let viewport = CGFloat(model.verticalViewportHeight)
    return max(0, (viewport - itemSize) / 2)
  }

  var body: some View {
    GeometryReader { geo in
      rulerInteractiveView(geo: geo)
    }
  }

  @ViewBuilder
  private func rulerInteractiveView(geo: GeometryProxy) -> some View {
    let trackW = geo.size.width
    let viewport = CGFloat(model.verticalViewportHeight)
    let glassW = trackW + 38
    let glassH: CGFloat = 52

    ZStack {
      RulerColor.parse(model.colorRulerChrome)
      ScrollView(.vertical) {
        LazyVStack(spacing: 0) {
          ForEach(0 ... totalSteps, id: \.self) { i in
            tickRow(index: i, trackWidth: trackW)
              .frame(height: itemSize)
              .id(i)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, endPadding)
        .scrollTargetLayout()
      }
      // Always snap to the nearest tick (ignore fling distance-based settling).
      .scrollTargetBehavior(RulerNearestTickScrollTargetBehavior(step: itemSize))
      .scrollPosition(id: $scrolledID, anchor: .center)
      .scrollIndicators(.hidden)
      .scrollBounceBehavior(.basedOnSize)
      .rulerTrackCenterPosition(itemSize: itemSize, centerPosition: $centerPosition)
      .rulerTrackScrollMotion(isInMotion: $glassInMotion)
      .rulerTrackGlassPressMotion(
        viewportHeight: viewport,
        glassHeight: glassH,
        isPressingGlass: $glassPressActive
      )
      .rulerDetectScrollBegin {
        glassInMotion = true
        onScrollBegin()
      }
      .opacity(rulerOpacity)

      RulerLiquidGlassOverlay(
        width: glassW,
        height: glassH,
        surface: RulerColor.parse(model.colorGlassSurface),
        border: RulerColor.parse(model.colorGlassBorder),
        sheen: RulerColor.parse(model.colorGlassSheen),
        rim: RulerColor.parse(model.colorGlassRim),
        liquidBorder: RulerColor.parse(model.colorGlassLiquidBorder),
        reduceTransparency: reduceTransparency,
        isInMotion: glassInMotion || glassPressActive
      )
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }
    .frame(width: trackW, height: viewport)
    .background(RulerColor.parse(model.colorBackground))
    .onAppear {
      applyExternalInitialValueIfNeeded(force: true)
      let measured = model.valueForIndex(model.centerIndex, unit: model.unit)
      lastMeasuredValue = measured
      model.currentValue = measured
      lastUnit = model.unit
    }
    .onChange(of: model.initialValue) { _, _ in
      applyExternalInitialValueIfNeeded(force: false)
    }
    .onChange(of: model.unit) { _, newUnit in
      animateUnitTransitionFade()
      let transition = model.consumePendingUnitTransition()
      let previousUnit = transition?.fromUnit ?? lastUnit
      let targetValue =
        model.consumePendingInitialValueOverride()
        ?? model.convertValue(lastMeasuredValue, fromUnit: previousUnit, toUnit: newUnit)
      // Defer one runloop tick so range/step props for the new unit are applied.
      DispatchQueue.main.async {
        let nextIdx = clampIndex(
          indexForValue(
            targetValue,
            unit: newUnit,
            rangeMax: model.rangeMax,
            step: model.step
          )
        )
        let applyTargetIndex = {
          var tx = Transaction()
          tx.animation = nil
          withTransaction(tx) {
            scrolledID = nextIdx
          }
          centerPosition = CGFloat(nextIdx)
          model.centerIndex = nextIdx
          lastMeasuredValue = targetValue
          model.currentValue = targetValue
          model.initialValue = targetValue
          onValueEmit(model.emitString(forIndex: nextIdx))
        }

        // Edge-case: when switching units keeps the same tick id (e.g. 250cm -> 8.2ft => idx 0),
        // SwiftUI can skip re-anchoring to center. Reset id first, then re-apply target.
        if scrolledID == nextIdx {
          var clearTx = Transaction()
          clearTx.animation = nil
          withTransaction(clearTx) {
            scrolledID = nil
          }
          DispatchQueue.main.async {
            applyTargetIndex()
          }
        } else {
          applyTargetIndex()
        }
      }
      scrollEndWork?.cancel()
      glassInMotion = false
      glassPressActive = false
      lastUnit = newUnit
    }
    .onChange(of: scrolledID) { _, newId in
      guard let id = newId else { return }
      let idx = clampIndex(id)
      if #unavailable(iOS 18.0) {
        centerPosition = CGFloat(idx)
      }
      model.centerIndex = idx
      let measured = model.valueForIndex(idx, unit: model.unit)
      lastMeasuredValue = measured
      model.currentValue = measured
      let now = ProcessInfo.processInfo.systemUptime
      if now - lastThrottle >= 0.04 {
        lastThrottle = now
        onValueEmit(model.emitString(forIndex: idx))
      }
      scheduleScrollEndEmit()
    }
  }

  private func scheduleScrollEndEmit() {
    scrollEndWork?.cancel()
    let work = DispatchWorkItem {
      if #unavailable(iOS 18.0) {
        glassInMotion = false
      }
      onValueEmit(model.emitString(forIndex: model.centerIndex))
      onScrollEnd()
    }
    scrollEndWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.14, execute: work)
  }

  private func animateUnitTransitionFade() {
    withAnimation(.easeOut(duration: 0.09)) {
      rulerOpacity = 0.42
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.09) {
      withAnimation(.easeOut(duration: 0.13)) {
        rulerOpacity = 1
      }
    }
  }

  private func clampIndex(_ i: Int) -> Int {
    min(max(0, i), totalSteps)
  }

  @ViewBuilder
  private func tickRow(index i: Int, trackWidth: CGFloat) -> some View {
    let labelW = CGFloat(model.labelColumnWidth)
    let gap = CGFloat(model.labelToTickGap)
    let tw = CGFloat(model.tickWidth)
    let major = CGFloat(model.majorTickHeight)
    let mid = CGFloat(model.midTickHeight)
    let minor = CGFloat(model.minorTickHeight)

    let tickVal = model.rangeMax - Double(i) * model.step
    let indexFromMin = totalSteps - i
    let center = min(max(centerPosition, 0), CGFloat(totalSteps))
    let dist = abs(CGFloat(i) - center)
    let glassLabelPresence: CGFloat = {
      // Smoothly fade neighbor labels in/out instead of hard threshold popping.
      let fadeStart: CGFloat = 1.0
      let fadeEnd: CGFloat = 1.45
      if dist <= fadeStart { return 1 }
      if dist >= fadeEnd { return 0 }
      return 1 - ((dist - fadeStart) / (fadeEnd - fadeStart))
    }()
    // Keep glass-label text alive in a wider window; visibility is controlled by smooth alpha.
    // This avoids rapid text toggling ("flicker") near threshold while slowly scrolling.
    let showGlassLabelText = dist <= 1.8
    // Glass is ~44pt high with ~15pt spacing => about 3 visible ticks.
    // Keep the wave local to the glass area: center strongest + two neighbors softer.
    let wave: CGFloat = {
      guard dist <= 1.8 else { return 0 }
      return exp(-pow(dist / 0.9, 2))
    }()

    let (barW, baseUIColor, labelText, waveXGain, waveYGain, isAlwaysLabel):
      (CGFloat, UIColor, String, CGFloat, CGFloat, Bool) = {
      if model.unit == "ft" {
        let ti = imperialMaxInches() - i
        let kind = RulerTickKind.imperial(ti)
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
        let isLong = indexFromMin % model.longStepInterval == 0
        let half = max(1, model.longStepInterval / 2)
        let isMid = !isLong && indexFromMin % half == 0
        let w = isLong ? major : isMid ? mid : minor
        let base: UIColor = isLong
          ? .rulerParse(model.colorMajorTick)
          : isMid ? .rulerParse(model.colorMidTick) : .rulerParse(model.colorTick)
        let lbl = showGlassLabelText ? glassMetricLabel(tickVal) : model.metricLabel(idx: i, tickVal: tickVal)
        let xGain: CGFloat = isLong ? 0.24 : isMid ? 0.38 : 0.5
        let yGain: CGFloat = isLong ? 0.06 : isMid ? 0.1 : 0.14
        return (w, base, lbl, xGain, yGain, isLong)
      }
    }()

    let centerHighlight = UIColor.rulerParse(model.colorGlassActiveTick)
    let neighborHighlight = UIColor.rulerParse(model.colorGlassActiveNeighborTick)
    let centerGlow = exp(-pow(dist / 0.45, 2))
    let neighborGlow = exp(-pow((dist - 1.0) / 0.55, 2))
    let neighborBlend = min(1, neighborGlow * 0.72)
    let centerBlend = min(1, centerGlow * 0.96)
    let labelCenterGlow = exp(-pow(dist / 0.5, 2))
    let labelNeighborGlow = exp(-pow((dist - 1.0) / 0.5, 2))
    let labelScaleRaw = max(0.96, 1 + (0.34 * labelCenterGlow) - (0.04 * labelNeighborGlow))
    let labelOpacityRaw = max(0.72, 1 - (0.28 * labelNeighborGlow))
    let labelScale = 1 + ((labelScaleRaw - 1) * glassLabelPresence)
    let labelOpacity = isAlwaysLabel
      ? 1 + ((labelOpacityRaw - 1) * glassLabelPresence)
      : labelOpacityRaw * glassLabelPresence
    let majorLabelUIColor = UIColor.rulerParse(model.colorMajorTick)
    let dimLabelUIColor = UIColor.rulerParse(model.colorMidTick)
    let labelUIColor = majorLabelUIColor.rulerLerp(to: dimLabelUIColor, t: min(1, labelNeighborGlow * 0.82))
    let labelColor = Color(uiColor: labelUIColor)
    let highlightedUIColor = baseUIColor
      .rulerLerp(to: neighborHighlight, t: neighborBlend)
      .rulerLerp(to: centerHighlight, t: centerBlend)
    let highlightedBarColor = Color(uiColor: highlightedUIColor)

    HStack(alignment: .center, spacing: 0) {
      Text(labelText)
        .font(tickFont())
        .foregroundStyle(labelColor)
        .frame(width: labelW, alignment: .trailing)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .opacity(isAlwaysLabel ? labelOpacity : (showGlassLabelText ? labelOpacity : 1))
        .scaleEffect(labelScale, anchor: .trailing)
      Rectangle()
        .fill(highlightedBarColor)
        .frame(width: barW, height: max(1, tw))
        .cornerRadius(1)
        .scaleEffect(
          x: 1 + (waveXGain * wave),
          y: 1 + (waveYGain * wave),
          anchor: .leading
        )
        .offset(x: 3.2 * wave)
        .padding(.leading, gap)
      Spacer(minLength: 0)
    }
    .frame(width: trackWidth, alignment: .leading)
  }

  private func tickFont() -> Font {
    let size = CGFloat(model.tickLabelFontSize)
    if let name = model.fontFamily, !name.isEmpty {
      return .custom(name, size: size).weight(.semibold)
    }
    return .system(size: size, weight: .semibold)
  }

  private func glassMetricLabel(_ value: Double) -> String {
    if abs(value - value.rounded()) < 1e-6 {
      return "\(Int(value.rounded()))"
    }
    return String(format: "%.\(model.fractionDigits)f", value)
  }

  private func imperialMaxInches() -> Int {
    Int((model.rangeMax * 12.0).rounded())
  }

  private func indexForValue(_ value: Double, unit: String, rangeMax: Double, step: Double) -> Int {
    if unit == "ft" {
      let maxInches = Int((rangeMax * 12.0).rounded())
      return maxInches - Int((value * 12.0).rounded())
    }
    return Int(((rangeMax - value) / step).rounded())
  }

  private func applyExternalInitialValueIfNeeded(force: Bool) {
    if !force, glassInMotion || glassPressActive {
      return
    }
    let targetIdx = clampIndex(model.valueToIndex(model.initialValue))
    if !force, targetIdx == model.centerIndex {
      return
    }
    var tx = Transaction()
    tx.animation = nil
    withTransaction(tx) {
      scrolledID = targetIdx
    }
    centerPosition = CGFloat(targetIdx)
    model.centerIndex = targetIdx
  }
}

// MARK: - Scroll begin (avoid DragGesture(minimumDistance: 0) fighting ScrollView)

private struct RulerScrollBeginDetector: ViewModifier {
  let onBegin: () -> Void
  @State private var phaseActive = false
  @State private var legacyArmed = false

  func body(content: Content) -> some View {
    Group {
      if #available(iOS 18.0, *) {
        content.onScrollPhaseChange { _, newPhase in
          if newPhase == .idle {
            phaseActive = false
          } else if !phaseActive {
            phaseActive = true
            onBegin()
          }
        }
      } else {
        content.simultaneousGesture(
          DragGesture(minimumDistance: 16)
            .onChanged { _ in
              if !legacyArmed {
                legacyArmed = true
                onBegin()
              }
            }
            .onEnded { _ in
              legacyArmed = false
            }
        )
      }
    }
  }
}

private struct RulerScrollMotionTracker: ViewModifier {
  @Binding var isInMotion: Bool

  func body(content: Content) -> some View {
    Group {
      if #available(iOS 18.0, *) {
        content.onScrollPhaseChange { _, newPhase in
          let moving = newPhase != .idle
          if isInMotion != moving { isInMotion = moving }
        }
      } else {
        content
      }
    }
  }
}

private struct RulerGlassPressMotionTracker: ViewModifier {
  let viewportHeight: CGFloat
  let glassHeight: CGFloat
  @Binding var isPressingGlass: Bool

  func body(content: Content) -> some View {
    content.simultaneousGesture(
      DragGesture(minimumDistance: 0)
        .onChanged { value in
          let halfGlass = glassHeight / 2
          let centerY = viewportHeight / 2
          let insideGlassBand = abs(value.location.y - centerY) <= halfGlass
          if isPressingGlass != insideGlassBand {
            isPressingGlass = insideGlassBand
          }
        }
        .onEnded { _ in
          isPressingGlass = false
        }
    )
  }
}

extension View {
  fileprivate func rulerDetectScrollBegin(_ onBegin: @escaping () -> Void) -> some View {
    modifier(RulerScrollBeginDetector(onBegin: onBegin))
  }

  fileprivate func rulerTrackCenterPosition(
    itemSize: CGFloat,
    centerPosition: Binding<CGFloat>
  ) -> some View {
    modifier(
      RulerScrollCenterTracker(
        itemSize: itemSize,
        centerPosition: centerPosition
      )
    )
  }

  fileprivate func rulerTrackScrollMotion(isInMotion: Binding<Bool>) -> some View {
    modifier(RulerScrollMotionTracker(isInMotion: isInMotion))
  }

  fileprivate func rulerTrackGlassPressMotion(
    viewportHeight: CGFloat,
    glassHeight: CGFloat,
    isPressingGlass: Binding<Bool>
  ) -> some View {
    modifier(
      RulerGlassPressMotionTracker(
        viewportHeight: viewportHeight,
        glassHeight: glassHeight,
        isPressingGlass: isPressingGlass
      )
    )
  }
}

private struct RulerScrollCenterTracker: ViewModifier {
  let itemSize: CGFloat
  @Binding var centerPosition: CGFloat

  func body(content: Content) -> some View {
    Group {
      if #available(iOS 18.0, *) {
        content.onScrollGeometryChange(for: CGFloat.self) { geometry in
          guard itemSize > 0 else { return 0 }
          let raw = geometry.contentOffset.y / itemSize
          // Trim sensor noise to reduce shimmer in per-tick scaling.
          return (raw * 100).rounded() / 100
        } action: { _, newValue in
          // Low-pass smoothing to keep the wave fluid and glitch-free.
          centerPosition = (centerPosition * 0.72) + (newValue * 0.28)
        }
      } else {
        content
      }
    }
  }
}

private struct RulerNearestTickScrollTargetBehavior: ScrollTargetBehavior {
  let step: CGFloat

  func updateTarget(_ target: inout ScrollTarget, context: TargetContext) {
    guard step > 0 else { return }
    let proposedY = target.rect.origin.y
    let snappedY = (proposedY / step).rounded() * step
    let maxY = max(0, context.contentSize.height - context.containerSize.height)
    target.rect.origin.y = min(max(0, snappedY), maxY)
  }
}
