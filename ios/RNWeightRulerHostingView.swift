import UIKit

public typealias RNBMWeightOnValueChangeBlock = @convention(block) (NSString) -> Void
public typealias RNBMWeightVoidBlock = @convention(block) () -> Void

/// Pure UIKit weight ruler host; events bubble to the RN host (`RCTWeightRulerView` → `WeightRulerViewEventEmitter`).
@objc(RNWeightRulerHostingView)
public final class RNWeightRulerHostingView: UIView {
  private let model = WeightRulerStateModel()
  private var rulerView: WeightRulerUIKitView!
  private var rulerSyncScheduled = false

  @objc public var onValueChange: RNBMWeightOnValueChangeBlock?
  @objc public var onScrollBegin: RNBMWeightVoidBlock?
  @objc public var onScrollEnd: RNBMWeightVoidBlock?

  public override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear

    rulerView = WeightRulerUIKitView(
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
      scheduleSync()
    }
  }

  private func scheduleSync() {
    guard !rulerSyncScheduled else { return }
    rulerSyncScheduled = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.rulerSyncScheduled = false
      self.rulerView.syncWithModel()
    }
  }

  @objc public var unit: String = "kg" {
    didSet {
      model.unit = unit
      scheduleSync()
    }
  }

  @objc public var rangeMin: Double = 50 {
    didSet { model.rangeMin = rangeMin; scheduleSync() }
  }
  @objc public var rangeMax: Double = 250 {
    didSet { model.rangeMax = rangeMax; scheduleSync() }
  }
  @objc public var step: Double = 1 {
    didSet { model.step = step; scheduleSync() }
  }
  @objc public var fractionDigits: Int = 0 {
    didSet { model.fractionDigits = fractionDigits; scheduleSync() }
  }
  @objc public var longStepInterval: Int = 10 {
    didSet { model.longStepInterval = longStepInterval; scheduleSync() }
  }
  @objc public var initialValue: Double = 75 {
    didSet { model.initialValue = initialValue; scheduleSync() }
  }
  @objc public var tickSpacingPx: Double = 12 {
    didSet { model.tickSpacingPx = tickSpacingPx; scheduleSync() }
  }
  @objc public var minorTickHeight: Double = 14 {
    didSet { model.minorTickHeight = minorTickHeight; scheduleSync() }
  }
  @objc public var midTickHeight: Double = 22 {
    didSet { model.midTickHeight = midTickHeight; scheduleSync() }
  }
  @objc public var majorTickHeight: Double = 32 {
    didSet { model.majorTickHeight = majorTickHeight; scheduleSync() }
  }
  @objc public var tickWidth: Double = 1.5 {
    didSet { model.tickWidth = tickWidth; scheduleSync() }
  }
  @objc public var arcCenterOffset: Double = 240 {
    didSet { model.arcCenterOffset = arcCenterOffset; scheduleSync() }
  }
  @objc public var fontFamily: NSString? {
    didSet { model.fontFamily = fontFamily as String?; scheduleSync() }
  }
  @objc public var colorTick: String = "#D1D5DB" {
    didSet { model.colorTick = colorTick; scheduleSync() }
  }
  @objc public var colorMidTick: String = "#6B7280" {
    didSet { model.colorMidTick = colorMidTick; scheduleSync() }
  }
  @objc public var colorMajorTick: String = "#111827" {
    didSet { model.colorMajorTick = colorMajorTick; scheduleSync() }
  }
  @objc public var colorActiveTick: String = "#FFD60A" {
    didSet { model.colorActiveTick = colorActiveTick; scheduleSync() }
  }
  @objc public var colorActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)" {
    didSet { model.colorActiveNeighborTick = colorActiveNeighborTick; scheduleSync() }
  }
  @objc public var colorGlassCenterLabel: String = "" {
    didSet { model.colorGlassCenterLabel = colorGlassCenterLabel; scheduleSync() }
  }
  @objc public var glassPillBackgroundColor: String = "" {
    didSet { model.glassPillBackgroundColor = glassPillBackgroundColor; scheduleSync() }
  }
  @objc public var glassPillBorderColor: String = "" {
    didSet { model.glassPillBorderColor = glassPillBorderColor; scheduleSync() }
  }
  @objc public var glassArcHalfAngle: Double = 0 {
    didSet { model.glassArcHalfAngle = glassArcHalfAngle; scheduleSync() }
  }
  @objc public var glassOuterPadding: Double = 14 {
    didSet { model.glassOuterPadding = glassOuterPadding; scheduleSync() }
  }
  @objc public var glassLabelArea: Double = 56 {
    didSet { model.glassLabelArea = glassLabelArea; scheduleSync() }
  }
  @objc public var glassLabelFontSize: Double = 18 {
    didSet { model.glassLabelFontSize = glassLabelFontSize; scheduleSync() }
  }
  @objc public var colorTrack: String = "" {
    didSet { model.colorTrack = colorTrack; scheduleSync() }
  }
}
