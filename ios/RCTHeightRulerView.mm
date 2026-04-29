#import "RCTHeightRulerView.h"

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTViewComponentView.h>

#import <react/renderer/components/RNBodyMetricsPickerSpec/ComponentDescriptors.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/EventEmitters.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/Props.h>
#import <react/renderer/components/RNBodyMetricsPickerSpec/ShadowNodes.h>

#import "RNBodyMetricsPicker-Swift.h"

#import <math.h>

using namespace facebook::react;

static NSString *RNBMNSString(const std::string &s)
{
  if (s.empty()) {
    return @"";
  }
  return [NSString stringWithUTF8String:s.c_str()];
}

/// Fixed 100–250 cm and imperial counterpart; JS range props are ignored.
static void RNBMHeightRulerApplyNativeBounds(RNHeightRulerHostingView *host, NSString *unit)
{
  const double kCmMin = 100.0;
  const double kCmMax = 250.0;
  const double kCmPerFoot = 30.48;

  if ([unit isEqualToString:@"ft"]) {
    host.rangeMin = kCmMin / kCmPerFoot;
    host.rangeMax = kCmMax / kCmPerFoot;
    host.step = 1.0 / 12.0;
    host.fractionDigits = 4;
    host.imperialMinInches = (NSInteger)llround(kCmMin / kCmPerFoot * 12.0);
  } else {
    host.rangeMin = kCmMin;
    host.rangeMax = kCmMax;
    host.step = 1.0;
    host.fractionDigits = 0;
    host.imperialMinInches = (NSInteger)llround(kCmMin / kCmPerFoot * 12.0);
  }
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

  NSString *unit = RNBMNSString(newRulerProps.unit);
  _rulerHost.unit = unit;
  RNBMHeightRulerApplyNativeBounds(_rulerHost, unit);
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
  _rulerHost.fontFamily = RNBMNSString(newRulerProps.fontFamily);
  _rulerHost.longStepInterval = newRulerProps.longStepInterval;
  _rulerHost.colorTick = RNBMNSString(newRulerProps.colorTick);
  _rulerHost.colorMidTick = RNBMNSString(newRulerProps.colorMidTick);
  _rulerHost.colorMajorTick = RNBMNSString(newRulerProps.colorMajorTick);
  _rulerHost.colorGlassActiveTick = RNBMNSString(newRulerProps.colorGlassActiveTick);
  _rulerHost.colorGlassActiveNeighborTick = RNBMNSString(newRulerProps.colorGlassActiveNeighborTick);

  [super updateProps:props oldProps:oldProps];
}

@end

Class<RCTComponentViewProtocol> HeightRulerViewCls(void)
{
  return RCTHeightRulerView.class;
}
