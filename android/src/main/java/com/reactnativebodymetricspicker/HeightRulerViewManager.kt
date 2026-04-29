package com.reactnativebodymetricspicker

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class HeightRulerViewManager : SimpleViewManager<HeightRulerView>() {
  override fun getName(): String = "HeightRulerView"

  override fun createViewInstance(reactContext: ThemedReactContext): HeightRulerView =
    HeightRulerView(reactContext)

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any>? =
    MapBuilder.builder<String, Any>()
      .put("topValueChange", MapBuilder.of("registrationName", "onValueChange"))
      .put("topScrollBegin", MapBuilder.of("registrationName", "onScrollBegin"))
      .put("topScrollEnd", MapBuilder.of("registrationName", "onScrollEnd"))
      .build()
      .toMutableMap()

  @ReactProp(name = "unit")
  fun setUnit(view: HeightRulerView, unit: String?) {
    val u = unit ?: "cm"
    if (view.unit == u) {
      HeightRulerNativeBounds.applyForUnit(view, u)
      view.markNeedsReload()
      return
    }
    view.setUnitAndPreserveCenteredValue(u)
  }

  @ReactProp(name = "rangeMin")
  fun setRangeMin(view: HeightRulerView, @Suppress("UNUSED_PARAMETER") v: Double) {
    HeightRulerNativeBounds.applyForUnit(view, view.unit)
    view.markNeedsReload()
  }

  @ReactProp(name = "rangeMax")
  fun setRangeMax(view: HeightRulerView, @Suppress("UNUSED_PARAMETER") v: Double) {
    HeightRulerNativeBounds.applyForUnit(view, view.unit)
    view.markNeedsReload()
  }

  @ReactProp(name = "step")
  fun setStep(view: HeightRulerView, @Suppress("UNUSED_PARAMETER") v: Double) {
    HeightRulerNativeBounds.applyForUnit(view, view.unit)
    view.markNeedsReload()
  }

  @ReactProp(name = "fractionDigits", defaultInt = 0)
  fun setFractionDigits(view: HeightRulerView, @Suppress("UNUSED_PARAMETER") v: Int) {
    HeightRulerNativeBounds.applyForUnit(view, view.unit)
    view.markNeedsReload()
  }

  @ReactProp(name = "initialValue")
  fun setInitialValue(view: HeightRulerView, v: Double) {
    view.setInitialValueFromJs(v)
  }

  @ReactProp(name = "rulerTrackWidth")
  fun setRulerTrackWidth(view: HeightRulerView, v: Double) {
    view.rulerTrackWidth = v
    view.markNeedsReload()
  }

  @ReactProp(name = "tickSpacing")
  fun setTickSpacing(view: HeightRulerView, v: Double) {
    view.tickSpacing = v
    view.markNeedsReload()
  }

  @ReactProp(name = "minorTickHeight")
  fun setMinorTickHeight(view: HeightRulerView, v: Double) {
    view.minorTickHeight = v
    view.markNeedsReload()
  }

  @ReactProp(name = "midTickHeight")
  fun setMidTickHeight(view: HeightRulerView, v: Double) {
    view.midTickHeight = v
    view.markNeedsReload()
  }

  @ReactProp(name = "majorTickHeight")
  fun setMajorTickHeight(view: HeightRulerView, v: Double) {
    view.majorTickHeight = v
    view.markNeedsReload()
  }

  @ReactProp(name = "tickWidth")
  fun setTickWidth(view: HeightRulerView, v: Double) {
    view.tickWidth = v
    view.markNeedsReload()
  }

  @ReactProp(name = "labelColumnWidth")
  fun setLabelColumnWidth(view: HeightRulerView, v: Double) {
    view.labelColumnWidth = v
    view.markNeedsReload()
  }

  @ReactProp(name = "labelToTickGap")
  fun setLabelToTickGap(view: HeightRulerView, v: Double) {
    view.labelToTickGap = v
    view.markNeedsReload()
  }

  @ReactProp(name = "tickCellPaddingRight")
  fun setTickCellPaddingRight(view: HeightRulerView, v: Double) {
    view.tickCellPaddingRight = v
    view.markNeedsReload()
  }

  @ReactProp(name = "fontFamily")
  fun setFontFamily(view: HeightRulerView, v: String?) {
    view.fontFamily = v
    view.markNeedsReload()
  }

  @ReactProp(name = "longStepInterval", defaultInt = 10)
  fun setLongStepInterval(view: HeightRulerView, v: Int) {
    view.longStepInterval = v
    view.markNeedsReload()
  }

  @ReactProp(name = "imperialMinInches", defaultInt = 39)
  fun setImperialMinInches(view: HeightRulerView, @Suppress("UNUSED_PARAMETER") v: Int) {
    HeightRulerNativeBounds.applyForUnit(view, view.unit)
    view.markNeedsReload()
  }

  @ReactProp(name = "colorTick")
  fun setColorTick(view: HeightRulerView, v: String?) {
    view.colorTick = v?.trim().orEmpty()
    view.markNeedsReload()
  }

  @ReactProp(name = "colorMidTick")
  fun setColorMidTick(view: HeightRulerView, v: String?) {
    view.colorMidTick = v?.trim().orEmpty()
    view.markNeedsReload()
  }

  @ReactProp(name = "colorMajorTick")
  fun setColorMajorTick(view: HeightRulerView, v: String?) {
    view.colorMajorTick = v?.trim().orEmpty()
    view.markNeedsReload()
  }

  @ReactProp(name = "colorGlassActiveTick")
  fun setColorGlassActiveTick(view: HeightRulerView, v: String?) {
    view.colorGlassActiveTick = v?.trim().orEmpty()
    view.markNeedsReload()
  }

  @ReactProp(name = "colorGlassActiveNeighborTick")
  fun setColorGlassActiveNeighborTick(view: HeightRulerView, v: String?) {
    view.colorGlassActiveNeighborTick = v?.trim().orEmpty()
    view.markNeedsReload()
  }

  @ReactProp(name = "glassPillBackgroundColor")
  fun setGlassPillBackgroundColor(view: HeightRulerView, v: String?) {
    view.glassPillBackgroundColor = v?.trim()?.takeIf { it.isNotEmpty() }
    view.recalculatePillDerivedState()
  }

  @ReactProp(name = "glassPillBorderRadius")
  fun setGlassPillBorderRadius(view: HeightRulerView, v: Double) {
    view.glassPillBorderRadius = v
    view.invalidatePillAndOverlay()
  }
}
