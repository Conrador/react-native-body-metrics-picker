#import "RCTHeightRulerView.h"

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTViewComponentView.h>

#import <react/renderer/components/RNBodyMetricsPickerSpec/ComponentDescriptors.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/EventEmitters.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/Props.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/ShadowNodes.h>

#import "RNBodyMetricsPicker-Swift.h"

using namespace facebook::react;

static NSString *RNBMNSString(const std::string &s)
{
  if (s.empty()) {
    return @"";
  }
  return [NSString stringWithUTF8String:s.c_str()];
}

@implementation RCTHeightRulerView {
  RNHeightRulerHostingView *_rulerHost;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<HeightRulerViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = HeightRulerViewShadowNode::defaultSharedProps();

    _rulerHost = [[RNHeightRulerHostingView alloc] initWithFrame:CGRectZero];
    __weak __typeof(self) weakSelf = self;
    _rulerHost.onValueChange = ^(NSString *value) {
      [weakSelf emitOnValueChange:value];
    };
    _rulerHost.onScrollBegin = ^{
      [weakSelf emitOnScrollBegin];
    };
    _rulerHost.onScrollEnd = ^{
      [weakSelf emitOnScrollEnd];
    };

    [self addSubview:_rulerHost];
  }
  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _rulerHost.frame = self.bounds;
}

- (void)emitOnValueChange:(NSString *)value
{
  if (!_eventEmitter) {
    return;
  }
  static_cast<const HeightRulerViewEventEmitter &>(*_eventEmitter)
      .onValueChange(HeightRulerViewEventEmitter::OnValueChange{.value = std::string([value UTF8String] ?: "")});
}

- (void)emitOnScrollBegin
{
  if (!_eventEmitter) {
    return;
  }
  static_cast<const HeightRulerViewEventEmitter &>(*_eventEmitter)
      .onScrollBegin(HeightRulerViewEventEmitter::OnScrollBegin{});
}

- (void)emitOnScrollEnd
{
  if (!_eventEmitter) {
    return;
  }
  static_cast<const HeightRulerViewEventEmitter &>(*_eventEmitter)
      .onScrollEnd(HeightRulerViewEventEmitter::OnScrollEnd{});
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &newRulerProps = static_cast<const HeightRulerViewProps &>(*props);

  _rulerHost.unit = RNBMNSString(newRulerProps.unit);
  _rulerHost.rangeMin = newRulerProps.rangeMin;
  _rulerHost.rangeMax = newRulerProps.rangeMax;
  _rulerHost.step = newRulerProps.step;
  _rulerHost.fractionDigits = newRulerProps.fractionDigits;
  _rulerHost.initialValue = newRulerProps.initialValue;
  _rulerHost.verticalViewportHeight = newRulerProps.verticalViewportHeight;
  _rulerHost.rulerTrackWidth = newRulerProps.rulerTrackWidth;
  _rulerHost.tickSpacing = newRulerProps.tickSpacing;
  _rulerHost.minorTickHeight = newRulerProps.minorTickHeight;
  _rulerHost.midTickHeight = newRulerProps.midTickHeight;
  _rulerHost.majorTickHeight = newRulerProps.majorTickHeight;
  _rulerHost.tickWidth = newRulerProps.tickWidth;
  _rulerHost.labelColumnWidth = newRulerProps.labelColumnWidth;
  _rulerHost.labelToTickGap = newRulerProps.labelToTickGap;
  _rulerHost.tickCellPaddingRight = newRulerProps.tickCellPaddingRight;
  _rulerHost.tickLabelFontSize = newRulerProps.tickLabelFontSize;
  _rulerHost.fontFamily = RNBMNSString(newRulerProps.fontFamily);
  _rulerHost.longStepInterval = newRulerProps.longStepInterval;
  _rulerHost.imperialMinInches = newRulerProps.imperialMinInches;
  _rulerHost.colorBackground = RNBMNSString(newRulerProps.colorBackground);
  _rulerHost.colorRulerChrome = RNBMNSString(newRulerProps.colorRulerChrome);
  _rulerHost.colorTick = RNBMNSString(newRulerProps.colorTick);
  _rulerHost.colorMidTick = RNBMNSString(newRulerProps.colorMidTick);
  _rulerHost.colorMajorTick = RNBMNSString(newRulerProps.colorMajorTick);
  _rulerHost.colorSelectedTick = RNBMNSString(newRulerProps.colorSelectedTick);
  _rulerHost.colorGlassSurface = RNBMNSString(newRulerProps.colorGlassSurface);
  _rulerHost.colorGlassBorder = RNBMNSString(newRulerProps.colorGlassBorder);
  _rulerHost.colorGlassSheen = RNBMNSString(newRulerProps.colorGlassSheen);
  _rulerHost.colorGlassRim = RNBMNSString(newRulerProps.colorGlassRim);
  _rulerHost.colorGlassLiquidBorder = RNBMNSString(newRulerProps.colorGlassLiquidBorder);
  _rulerHost.colorGlassActiveTick = RNBMNSString(newRulerProps.colorGlassActiveTick);
  _rulerHost.colorGlassActiveNeighborTick = RNBMNSString(newRulerProps.colorGlassActiveNeighborTick);

  [super updateProps:props oldProps:oldProps];
}

@end

Class<RCTComponentViewProtocol> HeightRulerViewCls(void)
{
  return RCTHeightRulerView.class;
}
