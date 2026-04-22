import Combine
import Foundation

/// Holds ruler props for SwiftUI; updated from Fabric (`RCTHeightRulerView`) or tests.
final class RulerStateModel: ObservableObject {

  struct UnitTransitionContext {
    let fromUnit: String
    let toUnit: String
    let previousRangeMax: Double
    let previousStep: Double
  }

  @Published var unit: String = "cm"
  @Published var rangeMin: Double = 50
  @Published var rangeMax: Double = 250
  @Published var step: Double = 1
  @Published var fractionDigits: Int = 0
  @Published var initialValue: Double = 175
  @Published var verticalViewportHeight: Double = 240
  @Published var rulerTrackWidth: Double = 120
  @Published var tickSpacing: Double = 15
  @Published var minorTickHeight: Double = 18
  @Published var midTickHeight: Double = 28
  @Published var majorTickHeight: Double = 40
  @Published var tickWidth: Double = 1.5
  @Published var labelColumnWidth: Double = 52
  @Published var labelToTickGap: Double = 4
  @Published var tickCellPaddingRight: Double = 6
  @Published var tickLabelFontSize: Double = 24
  @Published var fontFamily: String?
  @Published var longStepInterval: Int = 10
  @Published var imperialMinInches: Int = 12

  @Published var colorBackground: String = "#FFFFFF"
  @Published var colorRulerChrome: String = "rgba(0, 0, 0, 0)"
  @Published var colorTick: String = "#D1D5DB"
  @Published var colorMidTick: String = "#6B7280"
  @Published var colorMajorTick: String = "#374151"
  @Published var colorSelectedTick: String = "#D1D5DB"
  @Published var colorGlassSurface: String = "rgba(255, 255, 255, 0.22)"
  @Published var colorGlassBorder: String = "rgba(60, 60, 67, 0.16)"
  @Published var colorGlassSheen: String = "rgba(255, 255, 255, 0.32)"
  @Published var colorGlassRim: String = "rgba(10, 20, 40, 0.07)"
  @Published var colorGlassLiquidBorder: String = "rgba(255, 255, 255, 0.78)"
  @Published var colorGlassActiveTick: String = "#FFD60A"
  @Published var colorGlassActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)"

  /// Center tick index (0...totalSteps), updated by the SwiftUI ruler.
  @Published var centerIndex: Int = 0
  /// Last value measured under glass in the currently active unit.
  @Published var currentValue: Double = 175
  private var pendingUnitTransitionContext: UnitTransitionContext?
  private var pendingInitialValueOverride: Double?
  private var ignoreNextJSInitialValueUpdate = false

  var totalSteps: Int {
    RulerTickLogic.totalSteps(rangeMin: rangeMin, rangeMax: rangeMax, step: step)
  }

  func valueToIndex(_ v: Double) -> Int {
    indexForValue(v, unit: unit)
  }

  func indexForValue(_ v: Double, unit: String) -> Int {
    if unit == "ft" {
      let maxInches = Int((rangeMax * 12.0).rounded())
      return maxInches - Int((v * 12.0).rounded())
    }
    return Int(((rangeMax - v) / step).rounded())
  }

  func valueForIndex(_ idx: Int, unit: String) -> Double {
    if unit == "ft" {
      let maxInches = Int((rangeMax * 12.0).rounded())
      return Double(maxInches - idx) / 12.0
    }
    return rangeMax - Double(idx) * step
  }

  func emitString(forIndex idx: Int) -> String {
    let value = valueForIndex(idx, unit: unit)
    if unit == "ft" {
      return String(format: "%.4f", value)
    }
    return String(format: "%.\(fractionDigits)f", value)
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
    pendingUnitTransitionContext = UnitTransitionContext(
      fromUnit: oldUnit,
      toUnit: newUnit,
      previousRangeMax: rangeMax,
      previousStep: step
    )
    let converted = convertValue(currentValue, fromUnit: oldUnit, toUnit: newUnit)
    pendingInitialValueOverride = converted
    // Do not assign `initialValue` here: `model.unit` is still the old unit until the host
    // finishes `unit` didSet, and SwiftUI would run `applyExternalInitialValueIfNeeded`
    // while unit is cm — treating the converted ft value as cm and corrupting scroll/index.
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

  func convertValue(_ value: Double, fromUnit: String, toUnit: String) -> Double {
    if fromUnit == toUnit {
      return value
    }
    if fromUnit == "cm", toUnit == "ft" {
      return value / 30.48
    }
    if fromUnit == "ft", toUnit == "cm" {
      return value * 30.48
    }
    return value
  }
}
