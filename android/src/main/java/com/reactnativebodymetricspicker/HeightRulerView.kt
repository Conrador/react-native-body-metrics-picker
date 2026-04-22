package com.reactnativebodymetricspicker

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.graphics.ColorUtils
import androidx.core.widget.NestedScrollView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.events.RCTEventEmitter
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

private enum class TickKind { MAJOR, LARGE, MEDIUM, SMALL }

private fun tickKindImperial(totalInches: Int): TickKind {
  return when {
    totalInches % 12 == 0 -> TickKind.MAJOR
    totalInches % 6 == 0 -> TickKind.LARGE
    totalInches % 3 == 0 -> TickKind.MEDIUM
    else -> TickKind.SMALL
  }
}

private fun barWidth(kind: TickKind, major: Float, mid: Float, minor: Float): Float {
  return when (kind) {
    TickKind.MAJOR -> major
    TickKind.LARGE -> (major + mid) / 2f
    TickKind.MEDIUM -> mid
    TickKind.SMALL -> minor
  }
}

private fun parseColor(s: String?): Int {
  if (s.isNullOrBlank()) return Color.GRAY
  val t = s.trim()
  if (t.startsWith("#")) {
    try {
      return Color.parseColor(t)
    } catch (_: IllegalArgumentException) {
      return Color.GRAY
    }
  }
  if (t.startsWith("rgba(") && t.endsWith(")")) {
    val inner = t.substring(5, t.length - 1)
    val parts = inner.split(",").map { it.trim().toFloatOrNull() ?: 0f }
    if (parts.size >= 4) {
      var r = parts[0]
      var g = parts[1]
      var b = parts[2]
      var a = parts[3]
      if (r > 1f) r /= 255f
      if (g > 1f) g /= 255f
      if (b > 1f) b /= 255f
      if (a > 1f) a /= 255f
      return Color.argb(
        (a * 255).toInt().coerceIn(0, 255),
        (r * 255).toInt().coerceIn(0, 255),
        (g * 255).toInt().coerceIn(0, 255),
        (b * 255).toInt().coerceIn(0, 255),
      )
    }
  }
  return Color.GRAY
}

class HeightRulerView(context: Context) : FrameLayout(context) {
  private val scrollView = NestedScrollView(context)
  private val inner = FrameLayout(context)
  private val chromeBg = View(context)
  private val contentColumn = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
  private val glass = FrameLayout(context)

  private val tickBars = mutableListOf<View>()
  private val tickLabels = mutableListOf<TextView>()

  var unit: String = "cm"
  var rangeMin = 50.0
  var rangeMax = 250.0
  var step = 1.0
  var fractionDigits = 0
  var initialValue = 175.0
  var verticalViewportHeight = 240.0
  var rulerTrackWidth = 120.0
  var tickSpacing = 15.0
  var minorTickHeight = 18.0
  var midTickHeight = 28.0
  var majorTickHeight = 40.0
  var tickWidth = 1.5
  var labelColumnWidth = 52.0
  var labelToTickGap = 4.0
  var tickCellPaddingRight = 6.0
  var tickLabelFontSize = 24.0
  var fontFamily: String? = null
  var longStepInterval = 10
  var imperialMinInches = 12

  var colorBackground = "#FFFFFF"
  var colorRulerChrome = "rgba(0, 0, 0, 0)"
  var colorTick = "#D1D5DB"
  var colorMidTick = "#6B7280"
  var colorMajorTick = "#374151"
  var colorSelectedTick = "#D1D5DB"
  var colorGlassSurface = "rgba(255, 255, 255, 0.22)"
  var colorGlassBorder = "rgba(60, 60, 67, 0.16)"
  var colorGlassSheen = "rgba(255, 255, 255, 0.32)"
  var colorGlassRim = "rgba(10, 20, 40, 0.07)"
  var colorGlassLiquidBorder = "rgba(255, 255, 255, 0.78)"
  var colorGlassActiveTick = "#0A84FF"
  var colorGlassActiveNeighborTick = "rgba(10, 132, 255, 0.72)"

  private var itemSizePx = 1
  private var endPaddingPx = 0
  private var totalSteps = 0
  private var centerIndex = -1
  private var centerPosition = 0f
  private var pendingInitialValueOverride: Double? = null
  private var lastThrottle = 0L
  private var needsReload = true
  private var glassInMotion = false
  private var glassPressActive = false

  init {
    scrollView.isFillViewport = true
    scrollView.clipToPadding = false
    scrollView.overScrollMode = OVER_SCROLL_NEVER
    addView(scrollView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

    inner.addView(chromeBg, FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    inner.addView(
      contentColumn,
      FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT),
    )
    scrollView.addView(inner, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

    addView(glass, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT))
    glass.alpha = 1f
    glass.isClickable = false
    glass.isFocusable = false

    scrollView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
      onScrollChanged(scrollY)
    }

    scrollView.setOnTouchListener { _, ev ->
      when (ev.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          updateGlassPressState(ev.y)
          setGlassInMotion(true)
          emitEmpty("topScrollBegin")
        }
        MotionEvent.ACTION_MOVE -> {
          updateGlassPressState(ev.y)
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
          scrollView.post {
            glassPressActive = false
            applyGlassVisualState()
            snapAndFinalize()
          }
      }
      false
    }
  }

  private fun updateGlassPressState(touchY: Float) {
    val viewportPx =
      if (verticalViewportHeight > 0) dp(verticalViewportHeight) else height.toFloat()
    val glassHalf = dp(52.0) / 2f
    val centerY = viewportPx / 2f
    val insideGlassBand = kotlin.math.abs(touchY - centerY) <= glassHalf
    if (glassPressActive != insideGlassBand) {
      glassPressActive = insideGlassBand
      applyGlassVisualState()
    }
  }

  private fun applyGlassVisualState() {
    val active = glassInMotion || glassPressActive
    val targetAlpha = if (active) 0.62f else 1f
    val targetScaleX = if (active) 1.04f else 1f
    val targetScaleY = if (active) 0.93f else 1f
    val targetTranslationY = if (active) dp(-0.6) else 0f
    glass.animate()
      .alpha(targetAlpha)
      .scaleX(targetScaleX)
      .scaleY(targetScaleY)
      .translationY(targetTranslationY)
      .setDuration(60)
      .start()
  }

  private fun setGlassInMotion(inMotion: Boolean) {
    if (glassInMotion == inMotion) return
    glassInMotion = inMotion
    applyGlassVisualState()
  }

  private fun dp(v: Double): Float = PixelUtil.toPixelFromDIP(v.toFloat())

  private fun reactCtx(): ReactContext? = context as? ReactContext

  private fun emit(event: String, map: com.facebook.react.bridge.WritableMap?) {
    val rc = reactCtx() ?: return
    val vid = id
    if (vid == NO_ID) return
    rc.getJSModule(RCTEventEmitter::class.java).receiveEvent(vid, event, map)
  }

  private fun emitValue(value: String) {
    emit("topValueChange", Arguments.createMap().apply { putString("value", value) })
  }

  private fun emitEmpty(event: String) {
    emit(event, Arguments.createMap())
  }

  fun markNeedsReload() {
    needsReload = true
    requestLayout()
  }

  fun setUnitAndPreserveCenteredValue(newUnit: String) {
    if (unit == newUnit) return
    val oldUnit = unit
    val currentValue =
      if (centerIndex >= 0) {
        valueForIndex(centerIndex.coerceIn(0, totalSteps.coerceAtLeast(0)), oldUnit)
      } else {
        initialValue
      }
    pendingInitialValueOverride = convertUnitValue(currentValue, oldUnit, newUnit)
    scrollView.stopNestedScroll()
    setGlassInMotion(false)
    glassPressActive = false
    applyGlassVisualState()
    unit = newUnit
    animateRulerUnitChange()
    markNeedsReload()
  }

  private fun animateRulerUnitChange() {
    inner.animate().cancel()
    inner.animate()
      .alpha(0.42f)
      .setDuration(85)
      .withEndAction {
        inner.animate().alpha(1f).setDuration(130).start()
      }
      .start()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    if (needsReload) {
      needsReload = false
      rebuild()
    }
    val w = right - left
    val viewportPx = if (verticalViewportHeight > 0) dp(verticalViewportHeight) else (bottom - top).toFloat()
    val glassH = dp(52.0)
    val glassW = w + dp(38.0)
    val glassX = (w - glassW) / 2f
    val glassY = (viewportPx - glassH) / 2f
    glass.layout(glassX.toInt(), glassY.toInt(), (glassX + glassW).toInt(), (glassY + glassH).toInt())
    layoutGlassChildren(w, max(1, glassH.toInt()))
    bringChildToFront(glass)
  }

  private fun valueToIndex(v: Double): Int {
    return if (unit == "ft") {
      imperialMaxInches() - round(v * 12.0).toInt()
    } else {
      round((rangeMax - v) / step).toInt()
    }
  }

  private fun valueForIndex(idx: Int, unitValue: String): Double {
    return if (unitValue == "ft") {
      val inches = imperialMaxInches() - idx
      inches / 12.0
    } else {
      rangeMax - idx * step
    }
  }

  private fun convertUnitValue(value: Double, fromUnit: String, toUnit: String): Double {
    if (fromUnit == toUnit) return value
    return if (fromUnit == "cm" && toUnit == "ft") {
      value / 30.48
    } else if (fromUnit == "ft" && toUnit == "cm") {
      value * 30.48
    } else {
      value
    }
  }

  private fun emitStringForIndex(idx: Int): String {
    return if (unit == "ft") {
      val inches = imperialMaxInches() - idx
      val ft = inches / 12.0
      String.format("%.4f", ft)
    } else {
      val value = rangeMax - idx * step
      String.format("%.${fractionDigits}f", value)
    }
  }

  private fun formatImperialLabel(totalInches: Int): String {
    val feet = totalInches / 12
    val inches = totalInches % 12
    return "$feet′$inches″"
  }

  private fun imperialMaxInches(): Int = round(rangeMax * 12.0).toInt()

  private fun metricLabel(idx: Int, tickVal: Double): String {
    if (idx % longStepInterval != 0) return ""
    return if (kotlin.math.abs(tickVal - round(tickVal)) < 1e-6) {
      "${round(tickVal).toInt()}"
    } else {
      String.format("%.${fractionDigits}f", tickVal)
    }
  }

  private fun glassMetricLabel(tickVal: Double): String {
    return if (kotlin.math.abs(tickVal - round(tickVal)) < 1e-6) {
      "${round(tickVal).toInt()}"
    } else {
      String.format("%.${fractionDigits}f", tickVal)
    }
  }

  private fun rebuild() {
    tickBars.clear()
    tickLabels.clear()
    contentColumn.removeAllViews()
    val viewportPx = if (verticalViewportHeight > 0) dp(verticalViewportHeight) else height.toFloat()
    itemSizePx = dp(tickSpacing).toInt().coerceAtLeast(1)
    endPaddingPx = max(0, ((viewportPx - itemSizePx) / 2f).toInt())
    totalSteps = round((rangeMax - rangeMin) / step).toInt().coerceAtLeast(0)

    setBackgroundColor(parseColor(colorBackground))
    chromeBg.setBackgroundColor(parseColor(colorRulerChrome))

    val rowW = if (width > 0) width else dp(rulerTrackWidth).toInt()
    val labelW = dp(labelColumnWidth).toInt()
    val gap = dp(labelToTickGap).toInt()
    val tw = dp(tickWidth).toInt().coerceAtLeast(1)
    val majorH = dp(majorTickHeight)
    val midH = dp(midTickHeight)
    val minorH = dp(minorTickHeight)

    val typeface = fontFamily?.takeIf { it.isNotBlank() }?.let { Typeface.create(it, Typeface.NORMAL) }
      ?: Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)

    val cTick = parseColor(colorTick)
    val cMid = parseColor(colorMidTick)
    val cMajor = parseColor(colorMajorTick)

    contentColumn.setPadding(0, endPaddingPx, 0, endPaddingPx)

    for (i in 0..totalSteps) {
      val row = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
      }
      val lp = LinearLayout.LayoutParams(rowW, itemSizePx)
      contentColumn.addView(row, lp)

      val label = TextView(context).apply {
        setTextColor(cMajor)
        setTextSize(TypedValue.COMPLEX_UNIT_DIP, tickLabelFontSize.toFloat())
        setTypeface(typeface, Typeface.BOLD)
        gravity = Gravity.END or Gravity.CENTER_VERTICAL
      }
      val tickVal = rangeMax - i * step

      val barW: Float
      val barBase: Int
      val labelText: String

      if (unit == "ft") {
        val ti = imperialMaxInches() - i
        val kind = tickKindImperial(ti)
        barW = barWidth(kind, majorH, midH, minorH)
        barBase = when (kind) {
          TickKind.MAJOR -> cMajor
          TickKind.LARGE, TickKind.MEDIUM -> cMid
          TickKind.SMALL -> cTick
        }
        labelText = if (kind == TickKind.MAJOR) formatImperialLabel(ti) else ""
      } else {
        val indexFromMin = totalSteps - i
        val isLong = indexFromMin % longStepInterval == 0
        val half = max(1, longStepInterval / 2)
        val isMid = !isLong && indexFromMin % half == 0
        barW = when {
          isLong -> majorH
          isMid -> midH
          else -> minorH
        }
        barBase = when {
          isLong -> cMajor
          isMid -> cMid
          else -> cTick
        }
        labelText = metricLabel(i, tickVal)
      }

      label.text = labelText
      row.addView(label, LinearLayout.LayoutParams(labelW, LayoutParams.MATCH_PARENT))
      tickLabels.add(label)

      val bar = View(context).apply { setBackgroundColor(barBase) }
      val barLp = LinearLayout.LayoutParams(barW.toInt(), tw)
      barLp.leftMargin = gap
      barLp.gravity = Gravity.CENTER_VERTICAL
      row.addView(bar, barLp)
      tickBars.add(bar)
    }

    val contentH = (totalSteps + 1) * itemSizePx + contentColumn.paddingTop + contentColumn.paddingBottom
    contentColumn.layoutParams = FrameLayout.LayoutParams(rowW, contentH)

    val startValue = pendingInitialValueOverride ?: initialValue
    pendingInitialValueOverride = null
    val startIdx = valueToIndex(startValue).coerceIn(0, totalSteps)
    centerIndex = startIdx
    centerPosition = startIdx.toFloat()
    val y = startIdx * itemSizePx
    scrollView.post {
      scrollView.scrollTo(0, y)
      updateTickColors()
      emitValue(emitStringForIndex(startIdx))
    }
  }

  private fun layoutGlassChildren(widthPx: Int, glassH: Int) {
    glass.removeAllViews()
    if (widthPx <= 0 || glassH <= 0) return

    val fill = View(context).apply { setBackgroundColor(parseColor(colorGlassSurface)) }
    glass.addView(fill, FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

    val sheen = View(context).apply { setBackgroundColor(parseColor(colorGlassSheen)) }
    glass.addView(
      sheen,
      FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, (glassH * 0.54).toInt()),
    )

    val rim = View(context).apply { setBackgroundColor(parseColor(colorGlassRim)) }
    glass.addView(
      rim,
      FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, 1).apply { gravity = Gravity.BOTTOM },
    )

    val gd = GradientDrawable()
    gd.cornerRadius = glassH / 2f
    gd.setStroke(
      max(1, (1f / resources.displayMetrics.density).toInt()),
      parseColor(colorGlassBorder),
    )
    glass.background = gd
  }

  private fun indexForOffset(y: Int): Int {
    var idx = round(y.toDouble() / itemSizePx.toDouble()).toInt()
    idx = idx.coerceIn(0, totalSteps)
    return idx
  }

  private fun updateTickColors() {
    val cTick = parseColor(colorTick)
    val cMid = parseColor(colorMidTick)
    val cMajor = parseColor(colorMajorTick)
    val cActive = parseColor(colorGlassActiveTick)
    val cActiveNeighbor = parseColor(colorGlassActiveNeighborTick)

    for (i in 0..totalSteps) {
      val bar = tickBars.getOrNull(i) ?: continue
      val baseColor: Int
      val gainX: Float
      val gainY: Float
      val always: Boolean
      if (unit == "ft") {
        val ti = imperialMaxInches() - i
        when (tickKindImperial(ti)) {
          TickKind.MAJOR -> {
            baseColor = cMajor
            gainX = 0.24f
            gainY = 0.06f
            always = true
          }
          TickKind.LARGE, TickKind.MEDIUM -> {
            baseColor = cMid
            gainX = 0.38f
            gainY = 0.1f
            always = false
          }
          TickKind.SMALL -> {
            baseColor = cTick
            gainX = 0.5f
            gainY = 0.14f
            always = false
          }
        }
      } else {
        val indexFromMin = totalSteps - i
        val isLong = indexFromMin % longStepInterval == 0
        val half = max(1, longStepInterval / 2)
        val isMid = !isLong && indexFromMin % half == 0
        when {
          isLong -> {
            baseColor = cMajor
            gainX = 0.24f
            gainY = 0.06f
            always = true
          }
          isMid -> {
            baseColor = cMid
            gainX = 0.38f
            gainY = 0.1f
            always = false
          }
          else -> {
            baseColor = cTick
            gainX = 0.5f
            gainY = 0.14f
            always = false
          }
        }
      }
      val dist = abs(i.toFloat() - centerPosition)
      val glassLabelPresence = when {
        dist <= 1f -> 1f
        dist >= 1.45f -> 0f
        else -> 1f - ((dist - 1f) / 0.45f)
      }
      // Keep text in a wider window and fade with alpha to prevent threshold flicker.
      val showGlassLabelText = dist <= 1.8f
      // Glass is about 3 ticks tall, so keep scaling local to center + two neighbors.
      val wave = kotlin.math.exp(-kotlin.math.pow((dist / 0.9f).toDouble(), 2.0)).toFloat()
      val centerGlow = kotlin.math.exp(-kotlin.math.pow((dist / 0.45f).toDouble(), 2.0)).toFloat()
      val neighborGlow = kotlin.math.exp(-kotlin.math.pow(((dist - 1f) / 0.55f).toDouble(), 2.0)).toFloat()
      val neighborBlend = min(1f, neighborGlow * 0.72f)
      val centerBlend = min(1f, centerGlow * 0.96f)
      val neighborTinted = ColorUtils.blendARGB(baseColor, cActiveNeighbor, neighborBlend)
      val highlighted = ColorUtils.blendARGB(neighborTinted, cActive, centerBlend)
      bar.setBackgroundColor(highlighted)
      bar.pivotX = 0f
      bar.scaleX = 1f + (gainX * wave)
      bar.scaleY = 1f + (gainY * wave)
      bar.translationX = dp(3.2).toFloat() * wave

      val label = tickLabels.getOrNull(i)
      if (label != null) {
        if (unit == "ft") {
          val ti = imperialMaxInches() - i
          val kind = tickKindImperial(ti)
          label.text = if (showGlassLabelText || kind == TickKind.MAJOR) formatImperialLabel(ti) else ""
        } else {
          val tickVal = rangeMax - i * step
          label.text = if (showGlassLabelText) glassMetricLabel(tickVal) else metricLabel(i, tickVal)
        }
        val labelCenterGlow = kotlin.math.exp(-kotlin.math.pow((dist / 0.5f).toDouble(), 2.0)).toFloat()
        val labelNeighborGlow =
          kotlin.math.exp(-kotlin.math.pow(((dist - 1f) / 0.5f).toDouble(), 2.0)).toFloat()
        val labelScaleRaw = max(0.96f, 1f + (0.34f * labelCenterGlow) - (0.04f * labelNeighborGlow))
        val labelScale = 1f + ((labelScaleRaw - 1f) * glassLabelPresence)
        val labelAlphaRaw = max(0.72f, 1f - (0.28f * labelNeighborGlow))
        val labelAlpha = if (always) {
          1f + ((labelAlphaRaw - 1f) * glassLabelPresence)
        } else {
          labelAlphaRaw * glassLabelPresence
        }
        val labelColor = ColorUtils.blendARGB(cMajor, cMid, min(1f, labelNeighborGlow * 0.82f))
        label.setTextColor(labelColor)
        label.pivotX = label.width.toFloat()
        label.pivotY = label.height * 0.5f
        label.scaleX = labelScale
        label.scaleY = labelScale
        label.alpha = if (always) labelAlpha else if (showGlassLabelText) labelAlpha else 1f
      }
    }
  }

  private fun onScrollChanged(scrollY: Int) {
    setGlassInMotion(true)
    centerPosition = scrollY.toFloat() / itemSizePx.toFloat()
    val idx = indexForOffset(scrollY)
    if (idx != centerIndex) {
      centerIndex = idx
      updateTickColors()
    } else {
      // Keep wave fluid while index stays the same.
      updateTickColors()
    }
    val now = System.currentTimeMillis()
    if (now - lastThrottle < 40) return
    lastThrottle = now
    emitValue(emitStringForIndex(idx))
  }

  private fun snapAndFinalize() {
    var y = scrollView.scrollY
    val snap = round(y.toDouble() / itemSizePx).toInt() * itemSizePx
    val child = scrollView.getChildAt(0) ?: return
    val maxY = max(0, child.height - scrollView.height)
    y = snap.coerceIn(0, maxY)
    if (abs(scrollView.scrollY - y) > 1) {
      scrollView.scrollTo(0, y)
    }
    centerPosition = y.toFloat() / itemSizePx.toFloat()
    centerIndex = indexForOffset(y)
    updateTickColors()
    emitValue(emitStringForIndex(centerIndex))
    emitEmpty("topScrollEnd")
    setGlassInMotion(false)
  }
}
