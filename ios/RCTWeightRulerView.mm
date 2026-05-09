#import "RCTWeightRulerView.h"

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTViewComponentView.h>

#import <react/renderer/components/RNBodyMetricsPickerSpec/ComponentDescriptors.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/EventEmitters.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/Props.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/ShadowNodes.h>

#if __has_include(<RNBodyMetricsPicker/RNBodyMetricsPicker-Swift.h>)
#import <RNBodyMetricsPicker/RNBodyMetricsPicker-Swift.h>
#else
#import "RNBodyMetricsPicker-Swift.h"
#endif

using namespace facebook::react;

static NSString *RNBMWNSString(const std::string &s)
{
  if (s.empty()) {
    return @"";
  }
  return [NSString stringWithUTF8String:s.c_str()];
}

@implementation RCTWeightRulerView {
  RNWeightRulerHostingView *_rulerHost;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<WeightRulerViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = WeightRulerViewShadowNode::defaultSharedProps();

    _rulerHost = [[RNWeightRulerHostingView alloc] initWithFrame:CGRectZero];
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
  static_cast<const WeightRulerViewEventEmitter &>(*_eventEmitter)
      .onValueChange(WeightRulerViewEventEmitter::OnValueChange{.value = std::string([value UTF8String] ?: "")});
}

- (void)emitOnScrollBegin
{
  if (!_eventEmitter) {
    return;
  }
  static_cast<const WeightRulerViewEventEmitter &>(*_eventEmitter)
      .onScrollBegin(WeightRulerViewEventEmitter::OnScrollBegin{});
}

- (void)emitOnScrollEnd
{
  if (!_eventEmitter) {
    return;
  }
  static_cast<const WeightRulerViewEventEmitter &>(*_eventEmitter)
      .onScrollEnd(WeightRulerViewEventEmitter::OnScrollEnd{});
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &newProps = static_cast<const WeightRulerViewProps &>(*props);

  _rulerHost.unit = RNBMWNSString(newProps.unit);
  _rulerHost.rangeMin = newProps.rangeMin;
  _rulerHost.rangeMax = newProps.rangeMax;
  _rulerHost.step = newProps.step;
  _rulerHost.fractionDigits = newProps.fractionDigits;
  _rulerHost.longStepInterval = newProps.longStepInterval;
  _rulerHost.initialValue = newProps.initialValue;
  _rulerHost.tickSpacingPx = newProps.tickSpacingPx;
  _rulerHost.minorTickHeight = newProps.minorTickHeight;
  _rulerHost.midTickHeight = newProps.midTickHeight;
  _rulerHost.majorTickHeight = newProps.majorTickHeight;
  _rulerHost.tickWidth = newProps.tickWidth;
  _rulerHost.arcCenterOffset = newProps.arcCenterOffset;
  _rulerHost.fontFamily = RNBMWNSString(newProps.fontFamily);
  _rulerHost.colorTick = RNBMWNSString(newProps.colorTick);
  _rulerHost.colorMidTick = RNBMWNSString(newProps.colorMidTick);
  _rulerHost.colorMajorTick = RNBMWNSString(newProps.colorMajorTick);
  _rulerHost.colorActiveTick = RNBMWNSString(newProps.colorActiveTick);
  _rulerHost.colorActiveNeighborTick = RNBMWNSString(newProps.colorActiveNeighborTick);
  _rulerHost.colorGlassCenterLabel = RNBMWNSString(newProps.colorGlassCenterLabel);
  _rulerHost.glassPillBackgroundColor = RNBMWNSString(newProps.glassPillBackgroundColor);
  _rulerHost.glassPillBorderColor = RNBMWNSString(newProps.glassPillBorderColor);
  _rulerHost.glassArcHalfAngle = newProps.glassArcHalfAngle;
  _rulerHost.glassOuterPadding = newProps.glassOuterPadding;
  _rulerHost.glassLabelArea = newProps.glassLabelArea;
  _rulerHost.glassLabelFontSize = newProps.glassLabelFontSize;
  _rulerHost.colorTrack = RNBMWNSString(newProps.colorTrack);

  [super updateProps:props oldProps:oldProps];
}

@end

Class<RCTComponentViewProtocol> WeightRulerViewCls(void)
{
  return RCTWeightRulerView.class;
}
