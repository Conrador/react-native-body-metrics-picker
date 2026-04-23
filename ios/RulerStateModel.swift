import Foundation

/// Holds ruler props; updated from Fabric (`RCTHeightRulerView`) and read by `HeightRulerUIKitView`.
final class RulerStateModel {

  struct UnitTransitionContext {
    let fromUnit: String
    let toUnit: String
    let previousRangeMax: Double
    let previousStep: Double
    /// Physical height and bounds in cm, captured while `fromUnit` still matches `rangeMin`/`rangeMax` semantics.
    let heightCm: Double
    let minCm: Double
    let maxCm: Double
  }

  var unit: String = "cm"
  var rangeMin: Double = 100
  var rangeMax: Double = 250
  var step: Double = 1
  var fractionDigits: Int = 0
  var initialValue: Double = 175
  var verticalViewportHeight: Double = 240
  var rulerTrackWidth: Double = 120
  var tickSpacing: Double = 15
  var minorTickHeight: Double = 18
  var midTickHeight: Double = 28
  var majorTickHeight: Double = 40
  var tickWidth: Double = 1.5
  var labelColumnWidth: Double = 52
  var labelToTickGap: Double = 5
  var tickCellPaddingRight: Double = 6
  var tickLabelFontSize: Double = 19
  var fontFamily: String?
  var longStepInterval: Int = 10
  var imperialMinInches: Int = 39

  var colorTick: String = "#D1D5DB"
  var colorMidTick: String = "#6B7280"
  var colorMajorTick: String = "#374151"
  var colorGlassActiveTick: String = "#FFD60A"
  var colorGlassActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)"

  /// Center tick index (0...totalSteps), updated by the native ruler.
  var centerIndex: Int = 0
  /// Last value under glass in **display** unit (cm or ft) for native layout math.
  var currentValue: Double = 175
  private var pendingUnitTransitionContext: UnitTransitionContext?
  private var pendingInitialValueOverride: Double?
  private var ignoreNextJSInitialValueUpdate = false

  /// Physical cm extent — single source with `RCTHeightRulerView` / native bounds (not `rangeMin`/`rangeMax` floats).
  private enum RulerExtentCm {
    static let min = 100.0
    static let max = 250.0
    static let perFoot = 30.48
  }

  /// Imperial ticks: whole inches [lo...hi] matching cm extent only (avoids transient `rangeMin`/`rangeMax` corrupting `totalSteps` and scroll clamp).
  private func imperialInchBoundsFtGrid() -> (lo: Int, hi: Int) {
    let hi = Int((RulerExtentCm.max / RulerExtentCm.perFoot * 12.0).rounded())
    let lo = Int((RulerExtentCm.min / RulerExtentCm.perFoot * 12.0).rounded())
    return (lo, hi)
  }

  var totalSteps: Int {
    if unit == "ft" {
      let b = imperialInchBoundsFtGrid()
      return max(0, b.hi - b.lo)
    }
    return RulerTickLogic.totalSteps(rangeMin: rangeMin, rangeMax: rangeMax, step: step)
  }

  func valueToIndex(_ v: Double) -> Int {
    indexForValue(v, unit: unit)
  }

  func indexForValue(_ v: Double, unit: String) -> Int {
    if unit == "ft" {
      let b = imperialInchBoundsFtGrid()
      let span = max(0, b.hi - b.lo)
      let raw = Int((v * 12.0).rounded())
      let ti = min(max(raw, b.lo), b.hi)
      let idx = b.hi - ti
      return min(max(0, idx), span)
    }
    let span = RulerTickLogic.totalSteps(rangeMin: rangeMin, rangeMax: rangeMax, step: step)
    let idx = Int(((rangeMax - v) / step).rounded())
    return min(max(0, idx), span)
  }

  func valueForIndex(_ idx: Int, unit: String) -> Double {
    if unit == "ft" {
      let b = imperialInchBoundsFtGrid()
      return Double(b.hi - idx) / 12.0
    }
    return rangeMax - Double(idx) * step
  }

  /// Physical height in centimeters for the tick at `idx` (JS / events always use cm).
  func heightCmForIndex(_ idx: Int) -> Double {
    if unit == "ft" {
      let b = imperialInchBoundsFtGrid()
      return Double(b.hi - idx) * 30.48 / 12.0
    }
    return rangeMax - Double(idx) * step
  }

  /// `initialValue` from React is always centimeters; map to scroll index for current `unit`.
  func indexForInitialValueCm(_ cm: Double) -> Int {
    indexForHeightCmSnapshot(cm, displayUnit: unit, minCm: RulerExtentCm.min, maxCm: RulerExtentCm.max)
  }

  /// Event payload to JS: always centimeters as a decimal string.
  func emitString(forIndex idx: Int) -> String {
    String(format: "%.2f", heightCmForIndex(idx))
  }

  func formatImperialLabel(totalInches: Int) -> String {
    let feet = totalInches / 12
    let inches = totalInches % 12
    return "\(feet)′\(inches)″"
  }

  func metricLabel(idx: Int, tickVal: Double) -> String {
    if idx % longStepInterval != 0 { return "" }
    if abs(tickVal - tickVal.rounded()) < 1e-6 {
      return "\(Int(tickVal.rounded()))"
    }
    return String(format: "%.\(fractionDigits)f", tickVal)
  }

  func prepareUnitTransition(from oldUnit: String, to newUnit: String) {
    let minCm: Double
    let maxCm: Double
    if oldUnit == "cm" {
      minCm = rangeMin
      maxCm = rangeMax
    } else {
      minCm = rangeMin * 30.48
      maxCm = rangeMax * 30.48
    }
    // Use tick physics (integer inches or cm steps), not `currentValue * 30.48` — float feet
    // drift below ~120 cm and desync cm ↔ ft after a round trip.
    // In `ft`, `heightCmForIndex` is cm derived from whole inches (e.g. 98″ → ~248.92), which
    // rounds to the wrong cm tick after ft→cm; `initialValue` is always cm from JS and keeps
    // the pre-inch snapshot (e.g. 250) after cm→ft if native preserved it on transition.
    let heightCm: Double
    if oldUnit == "cm" {
      heightCm = heightCmForIndex(centerIndex)
    } else {
      heightCm = initialValue
    }
    pendingUnitTransitionContext = UnitTransitionContext(
      fromUnit: oldUnit,
      toUnit: newUnit,
      previousRangeMax: rangeMax,
      previousStep: step,
      heightCm: heightCm,
      minCm: minCm,
      maxCm: maxCm
    )
    pendingInitialValueOverride = heightCm
    // Do not assign `initialValue` here: `model.unit` is still the old unit until the host
    // finishes `unit` didSet — avoid mapping ft display as cm and corrupting scroll/index.
    ignoreNextJSInitialValueUpdate = true
  }

  func consumePendingUnitTransition() -> UnitTransitionContext? {
    defer { pendingUnitTransitionContext = nil }
    return pendingUnitTransitionContext
  }

  func hasPendingInitialValueOverride() -> Bool {
    pendingInitialValueOverride != nil
  }

  func consumePendingInitialValueOverride() -> Double? {
    defer { pendingInitialValueOverride = nil }
    return pendingInitialValueOverride
  }

  func consumeShouldIgnoreNextJSInitialValueUpdate() -> Bool {
    let shouldIgnore = ignoreNextJSInitialValueUpdate
    ignoreNextJSInitialValueUpdate = false
    return shouldIgnore
  }

  /// Whole inches at the top tick when in ft mode.
  var imperialRulerMaxInches: Int {
    imperialInchBoundsFtGrid().hi
  }

  /// Scroll index for `displayUnit` from a **cm** snapshot (immune to ft + cm-range races).
  func indexForHeightCmSnapshot(
    _ heightCm: Double,
    displayUnit: String,
    minCm: Double,
    maxCm: Double
  ) -> Int {
    if displayUnit == "cm" {
      let cmStep = 1.0
      let span = RulerTickLogic.totalSteps(rangeMin: minCm, rangeMax: maxCm, step: cmStep)
      // Snap to nearest cm tick on the grid (float noise from ft→cm was landing on 217 vs 218).
      let q = (heightCm / cmStep).rounded()
      let onGrid = min(max(q * cmStep, minCm), maxCm)
      let idx = Int(((maxCm - onGrid) / cmStep).rounded())
      return min(max(0, idx), span)
    }
    let maxInches = Int((maxCm / 30.48 * 12.0).rounded())
    let minInches = Int((minCm / 30.48 * 12.0).rounded())
    let span = max(0, maxInches - minInches)
    // One expression cm → total inches avoids feet intermediate float error.
    let targetInches = Int((heightCm * 12.0 / 30.48).rounded())
    let ti = min(max(targetInches, minInches), maxInches)
    let idx = maxInches - ti
    return min(max(0, idx), span)
  }
}
