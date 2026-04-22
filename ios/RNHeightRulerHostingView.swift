import SwiftUI
import UIKit

public typealias RNBMOnValueChangeBlock = @convention(block) (NSString) -> Void
public typealias RNBMVoidBlock = @convention(block) () -> Void

/// Hosts SwiftUI ruler; events go to Fabric (`RCTHeightRulerView` → `HeightRulerViewEventEmitter`).
@objc(RNHeightRulerHostingView)
public final class RNHeightRulerHostingView: UIView {
  private let model = RulerStateModel()
  private var hostingController: UIHostingController<HeightRulerSwiftUIView>?

  @objc public var onValueChange: RNBMOnValueChangeBlock?
  @objc public var onScrollBegin: RNBMVoidBlock?
  @objc public var onScrollEnd: RNBMVoidBlock?

  public override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear

    let root = HeightRulerSwiftUIView(
      model: model,
      onValueEmit: { [weak self] value in
        self?.onValueChange?(value as NSString)
      },
      onScrollBegin: { [weak self] in
        self?.onScrollBegin?()
      },
      onScrollEnd: { [weak self] in
        self?.onScrollEnd?()
      }
    )

    let hc = UIHostingController(rootView: root)
    hostingController = hc
    hc.view.backgroundColor = .clear
    hc.view.isOpaque = false
    addSubview(hc.view)
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  @objc public var unit: String = "cm" {
    didSet {
      if oldValue != unit {
        model.prepareUnitTransition(from: oldValue, to: unit)
      }
      model.unit = unit
    }
  }

  @objc public var rangeMin: Double = 50 {
    didSet { model.rangeMin = rangeMin }
  }

  @objc public var rangeMax: Double = 250 {
    didSet {
      model.rangeMax = rangeMax
    }
  }

  @objc public var step: Double = 1 {
    didSet {
      model.step = step
    }
  }

  @objc public var fractionDigits: Int = 0 {
    didSet { model.fractionDigits = fractionDigits }
  }

  @objc public var initialValue: Double = 175 {
    didSet {
      if model.consumeShouldIgnoreNextJSInitialValueUpdate() {
        return
      }
      model.initialValue = initialValue
    }
  }

  @objc public var verticalViewportHeight: Double = 240 {
    didSet { model.verticalViewportHeight = verticalViewportHeight }
  }

  @objc public var rulerTrackWidth: Double = 120 {
    didSet { model.rulerTrackWidth = rulerTrackWidth }
  }

  @objc public var tickSpacing: Double = 15 {
    didSet { model.tickSpacing = tickSpacing }
  }

  @objc public var minorTickHeight: Double = 18 {
    didSet { model.minorTickHeight = minorTickHeight }
  }

  @objc public var midTickHeight: Double = 28 {
    didSet { model.midTickHeight = midTickHeight }
  }

  @objc public var majorTickHeight: Double = 40 {
    didSet { model.majorTickHeight = majorTickHeight }
  }

  @objc public var tickWidth: Double = 1.5 {
    didSet { model.tickWidth = tickWidth }
  }

  @objc public var labelColumnWidth: Double = 52 {
    didSet { model.labelColumnWidth = labelColumnWidth }
  }

  @objc public var labelToTickGap: Double = 4 {
    didSet { model.labelToTickGap = labelToTickGap }
  }

  @objc public var tickCellPaddingRight: Double = 6 {
    didSet { model.tickCellPaddingRight = tickCellPaddingRight }
  }

  @objc public var tickLabelFontSize: Double = 24 {
    didSet { model.tickLabelFontSize = tickLabelFontSize }
  }

  @objc public var fontFamily: NSString? {
    didSet { model.fontFamily = fontFamily as String? }
  }

  @objc public var longStepInterval: Int = 10 {
    didSet { model.longStepInterval = longStepInterval }
  }

  @objc public var imperialMinInches: Int = 12 {
    didSet { model.imperialMinInches = imperialMinInches }
  }

  @objc public var colorBackground: String = "#FFFFFF" {
    didSet { model.colorBackground = colorBackground }
  }

  @objc public var colorRulerChrome: String = "rgba(0, 0, 0, 0)" {
    didSet { model.colorRulerChrome = colorRulerChrome }
  }

  @objc public var colorTick: String = "#D1D5DB" {
    didSet { model.colorTick = colorTick }
  }

  @objc public var colorMidTick: String = "#6B7280" {
    didSet { model.colorMidTick = colorMidTick }
  }

  @objc public var colorMajorTick: String = "#374151" {
    didSet { model.colorMajorTick = colorMajorTick }
  }

  @objc public var colorSelectedTick: String = "#D1D5DB" {
    didSet { model.colorSelectedTick = colorSelectedTick }
  }

  @objc public var colorGlassSurface: String = "rgba(255, 255, 255, 0.22)" {
    didSet { model.colorGlassSurface = colorGlassSurface }
  }

  @objc public var colorGlassBorder: String = "rgba(60, 60, 67, 0.16)" {
    didSet { model.colorGlassBorder = colorGlassBorder }
  }

  @objc public var colorGlassSheen: String = "rgba(255, 255, 255, 0.32)" {
    didSet { model.colorGlassSheen = colorGlassSheen }
  }

  @objc public var colorGlassRim: String = "rgba(10, 20, 40, 0.07)" {
    didSet { model.colorGlassRim = colorGlassRim }
  }

  @objc public var colorGlassLiquidBorder: String = "rgba(255, 255, 255, 0.78)" {
    didSet { model.colorGlassLiquidBorder = colorGlassLiquidBorder }
  }

  @objc public var colorGlassActiveTick: String = "#FFD60A" {
    didSet { model.colorGlassActiveTick = colorGlassActiveTick }
  }

  @objc public var colorGlassActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)" {
    didSet { model.colorGlassActiveNeighborTick = colorGlassActiveNeighborTick }
  }
}
