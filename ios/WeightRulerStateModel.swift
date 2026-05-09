import Foundation

/// Holds weight-ruler props; updated from `RCTWeightRulerView` and read by `WeightRulerUIKitView`.
final class WeightRulerStateModel {

  var unit: String = "kg"
  var rangeMin: Double = 50
  var rangeMax: Double = 250
  var step: Double = 1
  var fractionDigits: Int = 0
  var longStepInterval: Int = 10

  var initialValue: Double = 75
  /// Last value under the pointer in the **active** unit.
  var currentValue: Double = 75

  var tickSpacingPx: Double = 12
  var minorTickHeight: Double = 14
  var midTickHeight: Double = 22
  var majorTickHeight: Double = 32
  var tickWidth: Double = 1.5

  /// Vertical distance from the bottom of the host view to the arc center.
  /// Larger = flatter arc. Drawn arc is an arc of a circle centered at `(midX, height + arcCenterOffset)`.
  var arcCenterOffset: Double = 240

  /// Fixed font size for tick labels (kept aligned with `WEIGHT_TICK_LABEL_FONT_SIZE` in JS).
  let tickLabelFontSize: Double = 14
  var fontFamily: String?

  var colorTick: String = "#D1D5DB"
  var colorMidTick: String = "#6B7280"
  var colorMajorTick: String = "#111827"
  var colorActiveTick: String = "#FFD60A"
  var colorActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)"
  var colorGlassCenterLabel: String = ""
  var glassPillBackgroundColor: String = ""
  var glassPillBorderColor: String = ""
  /// `0` = derive a sensible angular span from `tickSpacingPx` (~3 labels under the glass + side overhang).
  var glassArcHalfAngle: Double = 0
  /// Extra dp above the labels where the outer edge of the glass band sits.
  var glassOuterPadding: Double = 10
  /// Vertical room (along the radius) for labels rendered **above** the tick tips, under the glass.
  var glassLabelArea: Double = 22
  var glassLabelFontSize: Double = 18
  var colorTrack: String = ""

  /// Total snap positions: indices 0...totalSteps cover `rangeMin...rangeMax`.
  var totalSteps: Int {
    max(0, Int(((rangeMax - rangeMin) / step).rounded()))
  }

  func clampValue(_ v: Double) -> Double {
    min(max(v, rangeMin), rangeMax)
  }

  func snappedValue(_ v: Double) -> Double {
    let clamped = clampValue(v)
    let q = ((clamped - rangeMin) / step).rounded()
    return min(max(rangeMin + q * step, rangeMin), rangeMax)
  }

  func indexForValue(_ v: Double) -> Int {
    let snapped = snappedValue(v)
    return Int(((snapped - rangeMin) / step).rounded())
  }

  func valueForIndex(_ idx: Int) -> Double {
    rangeMin + Double(min(max(idx, 0), totalSteps)) * step
  }

  func emitString(forValue v: Double) -> String {
    String(format: "%.2f", snappedValue(v))
  }

  func tickLabel(forValue v: Double) -> String {
    if abs(v - v.rounded()) < 1e-6 {
      return "\(Int(v.rounded()))"
    }
    return String(format: "%.\(fractionDigits)f", v)
  }

  /// True when this tick value sits on a long-step major (every `longStepInterval`).
  func isMajor(value v: Double) -> Bool {
    let stepsFromMin = Int(((v - rangeMin) / step).rounded())
    return longStepInterval > 0 && stepsFromMin % longStepInterval == 0
  }

  /// True when this tick value sits on a half of `longStepInterval` (e.g. 5/10).
  func isMid(value v: Double) -> Bool {
    if isMajor(value: v) { return false }
    let half = max(1, longStepInterval / 2)
    let stepsFromMin = Int(((v - rangeMin) / step).rounded())
    return stepsFromMin % half == 0
  }
}
