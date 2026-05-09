package com.reactnativebodymetricspicker

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class WeightRulerViewManager : SimpleViewManager<WeightRulerView>() {
  override fun getName(): String = "WeightRulerView"

  override fun createViewInstance(reactContext: ThemedReactContext): WeightRulerView =
    WeightRulerView(reactContext)

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any>? =
    MapBuilder.builder<String, Any>()
      .put("topValueChange", MapBuilder.of("registrationName", "onValueChange"))
      .put("topScrollBegin", MapBuilder.of("registrationName", "onScrollBegin"))
      .put("topScrollEnd", MapBuilder.of("registrationName", "onScrollEnd"))
      .build()
      .toMutableMap()

  @ReactProp(name = "unit")
  fun setUnit(view: WeightRulerView, unit: String?) {
    view.unit = unit ?: "kg"
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "rangeMin")
  fun setRangeMin(view: WeightRulerView, v: Double) {
    view.rangeMin = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "rangeMax")
  fun setRangeMax(view: WeightRulerView, v: Double) {
    view.rangeMax = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "step")
  fun setStep(view: WeightRulerView, v: Double) {
    view.step = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "fractionDigits", defaultInt = 0)
  fun setFractionDigits(view: WeightRulerView, v: Int) {
    view.fractionDigits = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "longStepInterval", defaultInt = 10)
  fun setLongStepInterval(view: WeightRulerView, v: Int) {
    view.longStepInterval = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "initialValue")
  fun setInitialValue(view: WeightRulerView, v: Double) {
    view.initialValue = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "tickSpacingPx")
  fun setTickSpacingPx(view: WeightRulerView, v: Double) {
    view.tickSpacingPx = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "minorTickHeight")
  fun setMinorTickHeight(view: WeightRulerView, v: Double) {
    view.minorTickHeight = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "midTickHeight")
  fun setMidTickHeight(view: WeightRulerView, v: Double) {
    view.midTickHeight = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "majorTickHeight")
  fun setMajorTickHeight(view: WeightRulerView, v: Double) {
    view.majorTickHeight = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "tickWidth")
  fun setTickWidth(view: WeightRulerView, v: Double) {
    view.tickWidth = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "arcCenterOffset")
  fun setArcCenterOffset(view: WeightRulerView, v: Double) {
    view.arcCenterOffset = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "fontFamily")
  fun setFontFamily(view: WeightRulerView, v: String?) {
    view.fontFamily = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorTick")
  fun setColorTick(view: WeightRulerView, v: String?) {
    view.colorTick = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorMidTick")
  fun setColorMidTick(view: WeightRulerView, v: String?) {
    view.colorMidTick = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorMajorTick")
  fun setColorMajorTick(view: WeightRulerView, v: String?) {
    view.colorMajorTick = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorActiveTick")
  fun setColorActiveTick(view: WeightRulerView, v: String?) {
    view.colorActiveTick = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorActiveNeighborTick")
  fun setColorActiveNeighborTick(view: WeightRulerView, v: String?) {
    view.colorActiveNeighborTick = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorGlassCenterLabel")
  fun setColorGlassCenterLabel(view: WeightRulerView, v: String?) {
    view.colorGlassCenterLabel = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "glassPillBackgroundColor")
  fun setGlassPillBackgroundColor(view: WeightRulerView, v: String?) {
    view.glassPillBackgroundColor = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "glassPillBorderColor")
  fun setGlassPillBorderColor(view: WeightRulerView, v: String?) {
    view.glassPillBorderColor = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "glassArcHalfAngle")
  fun setGlassArcHalfAngle(view: WeightRulerView, v: Double) {
    view.glassArcHalfAngle = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "glassOuterPadding")
  fun setGlassOuterPadding(view: WeightRulerView, v: Double) {
    view.glassOuterPadding = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "glassLabelArea")
  fun setGlassLabelArea(view: WeightRulerView, v: Double) {
    view.glassLabelArea = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "glassLabelFontSize")
  fun setGlassLabelFontSize(view: WeightRulerView, v: Double) {
    view.glassLabelFontSize = v
    view.applyPropsAndInvalidate()
  }

  @ReactProp(name = "colorTrack")
  fun setColorTrack(view: WeightRulerView, v: String?) {
    view.colorTrack = v?.trim().orEmpty()
    view.applyPropsAndInvalidate()
  }
}
