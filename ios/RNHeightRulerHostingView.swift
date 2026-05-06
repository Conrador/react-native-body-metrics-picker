import UIKit

public typealias RNBMOnValueChangeBlock = @convention(block) (NSString) -> Void
public typealias RNBMVoidBlock = @convention(block) () -> Void

/// Pure UIKit height ruler; events bubble to the RN host (`RCTHeightRulerView` → `HeightRulerViewEventEmitter`).
@objc(RNHeightRulerHostingView)
public final class RNHeightRulerHostingView: UIView {
  private let model = RulerStateModel()
  private var rulerView: HeightRulerUIKitView!
  private var rulerSyncScheduled = false

  @objc public var onValueChange: RNBMOnValueChangeBlock?
  @objc public var onScrollBegin: RNBMVoidBlock?
  @objc public var onScrollEnd: RNBMVoidBlock?

  public override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear

    rulerView = HeightRulerUIKitView(
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

    addSubview(rulerView)
    rulerView.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      rulerView.topAnchor.constraint(equalTo: topAnchor),
      rulerView.leadingAnchor.constraint(equalTo: leadingAnchor),
      rulerView.trailingAnchor.constraint(equalTo: trailingAnchor),
      rulerView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      scheduleRulerSync()
    }
  }

  private func scheduleRulerSync() {
    guard !rulerSyncScheduled else { return }
    rulerSyncScheduled = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.rulerSyncScheduled = false
      self.rulerView.syncWithModel()
    }
  }

  @objc public var unit: String = "cm" {
    didSet {
      if oldValue != unit {
        model.prepareUnitTransition(from: oldValue, to: unit)
      }
      model.unit = unit
      scheduleRulerSync()
    }
  }

  @objc public var rangeMin: Double = 100 {
    didSet {
      model.rangeMin = rangeMin
      scheduleRulerSync()
    }
  }

  @objc public var rangeMax: Double = 250 {
    didSet {
      model.rangeMax = rangeMax
      scheduleRulerSync()
    }
  }

  @objc public var step: Double = 1 {
    didSet {
      model.step = step
      scheduleRulerSync()
    }
  }

  @objc public var fractionDigits: Int = 0 {
    didSet {
      model.fractionDigits = fractionDigits
      scheduleRulerSync()
    }
  }

  @objc public var initialValue: Double = 175 {
    didSet {
      if model.consumeShouldIgnoreNextJSInitialValueUpdate() {
        return
      }
      model.initialValue = initialValue
      scheduleRulerSync()
    }
  }

  @objc public var rulerTrackWidth: Double = 120 {
    didSet {
      model.rulerTrackWidth = rulerTrackWidth
      scheduleRulerSync()
    }
  }

  @objc public var tickSpacing: Double = 15 {
    didSet {
      model.tickSpacing = tickSpacing
      scheduleRulerSync()
    }
  }

  @objc public var minorTickHeight: Double = 18 {
    didSet {
      model.minorTickHeight = minorTickHeight
      scheduleRulerSync()
    }
  }

  @objc public var midTickHeight: Double = 28 {
    didSet {
      model.midTickHeight = midTickHeight
      scheduleRulerSync()
    }
  }

  @objc public var majorTickHeight: Double = 40 {
    didSet {
      model.majorTickHeight = majorTickHeight
      scheduleRulerSync()
    }
  }

  @objc public var tickWidth: Double = 1.5 {
    didSet {
      model.tickWidth = tickWidth
      scheduleRulerSync()
    }
  }

  @objc public var labelColumnWidth: Double = 60 {
    didSet {
      model.labelColumnWidth = labelColumnWidth
      scheduleRulerSync()
    }
  }

  @objc public var labelToTickGap: Double = 5 {
    didSet {
      model.labelToTickGap = labelToTickGap
      scheduleRulerSync()
    }
  }

  @objc public var tickCellPaddingRight: Double = 6 {
    didSet {
      model.tickCellPaddingRight = tickCellPaddingRight
      scheduleRulerSync()
    }
  }

  @objc public var fontFamily: NSString? {
    didSet {
      model.fontFamily = fontFamily as String?
      scheduleRulerSync()
    }
  }

  @objc public var longStepInterval: Int = 10 {
    didSet {
      model.longStepInterval = longStepInterval
      scheduleRulerSync()
    }
  }

  @objc public var imperialMinInches: Int = 39 {
    didSet {
      model.imperialMinInches = imperialMinInches
      scheduleRulerSync()
    }
  }

  @objc public var colorTick: String = "#D1D5DB" {
    didSet {
      model.colorTick = colorTick
      scheduleRulerSync()
    }
  }

  @objc public var colorMidTick: String = "#6B7280" {
    didSet {
      model.colorMidTick = colorMidTick
      scheduleRulerSync()
    }
  }

  @objc public var colorMajorTick: String = "#374151" {
    didSet {
      model.colorMajorTick = colorMajorTick
      scheduleRulerSync()
    }
  }

  @objc public var colorGlassActiveTick: String = "#FFD60A" {
    didSet {
      model.colorGlassActiveTick = colorGlassActiveTick
      scheduleRulerSync()
    }
  }

  @objc public var colorGlassActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)" {
    didSet {
      model.colorGlassActiveNeighborTick = colorGlassActiveNeighborTick
      scheduleRulerSync()
    }
  }

  @objc public var colorGlassCenterLabel: String = "" {
    didSet {
      model.colorGlassCenterLabel = colorGlassCenterLabel
      scheduleRulerSync()
    }
  }
}
