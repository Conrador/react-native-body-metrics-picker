package com.reactnativebodymetricspicker

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.animation.PathInterpolator
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
import java.util.IdentityHashMap
import java.util.Locale

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

/** Glass chrome is fixed — only glass active tick colors are React props. */
private object HeightRulerFixedGlassChrome {
  const val SURFACE = "rgba(255, 255, 255, 0.22)"
  const val BORDER = "rgba(60, 60, 67, 0.16)"
  const val SHEEN = "rgba(255, 255, 255, 0.32)"
  const val RIM = "rgba(10, 20, 40, 0.07)"
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
  var rangeMin = 100.0
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
  var labelToTickGap = 5.0
  var tickCellPaddingRight = 6.0
  var tickLabelFontSize = 19.0
  var fontFamily: String? = null
  var longStepInterval = 10
  var imperialMinInches = 39

  var colorTick = "#D1D5DB"
  var colorMidTick = "#6B7280"
  var colorMajorTick = "#374151"
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
  private var lastMajorHapticScrollIndex: Int? = null
  private var suppressMajorTickHaptic = false
  private var lastEmittedValue: String? = null

  private val tickBarWidthAnimators = IdentityHashMap<View, ValueAnimator>()
  private val tickBarWidthTargetPx = IdentityHashMap<View, Int>()
  private val tickBarWidthEase =
    PathInterpolator(0.33f, 1f, 0.68f, 1f)

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
    if (value == lastEmittedValue) return
    lastEmittedValue = value
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
    val heightCm =
      if (centerIndex >= 0 && totalSteps >= 0) {
        val idx = centerIndex.coerceIn(0, totalSteps)
        if (unit == "ft") {
          // Inch ticks map to fractional cm; JS `initialValue` keeps cm-grid intent for ft→cm.
          initialValue
        } else {
          heightCmForIndex(idx)
        }
      } else {
        initialValue
      }
    pendingInitialValueOverride = heightCm
    scrollView.stopNestedScroll()
    setGlassInMotion(false)
    glassPressActive = false
    applyGlassVisualState()
    unit = newUnit
    HeightRulerNativeBounds.applyForUnit(this, newUnit)
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
      val hi = imperialMaxInches()
      val lo = imperialMinInchesRounded()
      var ti = round(v * 12.0).toInt()
      ti = ti.coerceIn(lo, hi)
      (hi - ti).coerceIn(0, totalSteps)
    } else {
      val idx = round((rangeMax - v) / step).toInt()
      idx.coerceIn(0, totalSteps)
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

  private fun heightCmForIndex(idx: Int): Double {
    return if (unit == "ft") {
      val inches = imperialMaxInches() - idx
      inches * 30.48 / 12.0
    } else {
      rangeMax - idx * step
    }
  }

  /** `initialValue` from JS is always cm. */
  private fun valueToIndexFromCm(cm: Double): Int {
    return if (unit == "ft") {
      val hi = imperialMaxInches()
      val lo = imperialMinInchesRounded()
      var ti = round(cm * 12.0 / 30.48).toInt()
      ti = ti.coerceIn(lo, hi)
      (hi - ti).coerceIn(0, totalSteps)
    } else {
      valueToIndex(round(cm))
    }
  }

  private fun emitStringForIndex(idx: Int): String {
    val cm = heightCmForIndex(idx)
    return String.format(Locale.US, "%.2f", cm)
  }

  private fun formatImperialLabel(totalInches: Int): String {
    val feet = totalInches / 12
    val inches = totalInches % 12
    return "$feet′$inches″"
  }

  /** Match [CM_MIN, CM_MAX] in cm — do not use `rangeMax*12` (float ft props can skew `totalSteps` and scroll). */
  private fun imperialMaxInches(): Int =
    round(HeightRulerNativeBounds.CM_MAX / HeightRulerNativeBounds.CM_PER_FOOT * 12.0).toInt()

  private fun imperialMinInchesRounded(): Int =
    round(HeightRulerNativeBounds.CM_MIN / HeightRulerNativeBounds.CM_PER_FOOT * 12.0).toInt()

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
    cancelAllTickBarWidthAnimations()
    lastEmittedValue = null
    tickBars.clear()
    tickLabels.clear()
    contentColumn.removeAllViews()
    val viewportPx = if (verticalViewportHeight > 0) dp(verticalViewportHeight) else height.toFloat()
    itemSizePx = dp(tickSpacing).toInt().coerceAtLeast(1)
    endPaddingPx = max(0, ((viewportPx - itemSizePx) / 2f).toInt())
    totalSteps =
      if (unit == "ft") {
        max(0, imperialMaxInches() - imperialMinInchesRounded())
      } else {
        round((rangeMax - rangeMin) / step).toInt().coerceAtLeast(0)
      }

    setBackgroundColor(Color.TRANSPARENT)
    chromeBg.setBackgroundColor(Color.TRANSPARENT)

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

    val preservedStartCm = pendingInitialValueOverride ?: initialValue
    pendingInitialValueOverride = null
    val startIdx = valueToIndexFromCm(preservedStartCm).coerceIn(0, totalSteps)
    centerIndex = startIdx
    centerPosition = startIdx.toFloat()
    val y = startIdx * itemSizePx
    scrollView.post {
      suppressMajorTickHaptic = true
      scrollView.scrollTo(0, y)
      updateTickColors(animateTickWidths = false)
      val emitCm =
        if (unit == "ft") {
          preservedStartCm
        } else {
          heightCmForIndex(startIdx)
        }
      emitValue(String.format(Locale.US, "%.2f", emitCm))
      if (unit == "ft") {
        initialValue = preservedStartCm
      }
      lastMajorHapticScrollIndex = indexForOffset(scrollView.scrollY)
      suppressMajorTickHaptic = false
    }
  }

  private fun layoutGlassChildren(widthPx: Int, glassH: Int) {
    glass.removeAllViews()
    if (widthPx <= 0 || glassH <= 0) return

    val fill = View(context).apply { setBackgroundColor(parseColor(HeightRulerFixedGlassChrome.SURFACE)) }
    glass.addView(fill, FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

    val sheen = View(context).apply { setBackgroundColor(parseColor(HeightRulerFixedGlassChrome.SHEEN)) }
    glass.addView(
      sheen,
      FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, (glassH * 0.54).toInt()),
    )

    val rim = View(context).apply { setBackgroundColor(parseColor(HeightRulerFixedGlassChrome.RIM)) }
    glass.addView(
      rim,
      FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, 1).apply { gravity = Gravity.BOTTOM },
    )

    val gd = GradientDrawable()
    gd.cornerRadius = glassH / 2f
    gd.setStroke(
      max(1, (1f / resources.displayMetrics.density).toInt()),
      parseColor(HeightRulerFixedGlassChrome.BORDER),
    )
    glass.background = gd
  }

  private fun indexForOffset(y: Int): Int {
    var idx = round(y.toDouble() / itemSizePx.toDouble()).toInt()
    idx = idx.coerceIn(0, totalSteps)
    return idx
  }

  private fun cancelAllTickBarWidthAnimations() {
    for (anim in tickBarWidthAnimators.values) {
      anim.cancel()
    }
    tickBarWidthAnimators.clear()
    tickBarWidthTargetPx.clear()
  }

  /**
   * Smoothly resizes tick bars when glass promote/demote changes major width; avoids restarting
   * anim every scroll frame when target is unchanged.
   */
  private fun setTickBarToWidthPx(bar: View, targetPx: Int, animated: Boolean): Boolean {
    val lp = bar.layoutParams as LinearLayout.LayoutParams
    if (!animated) {
      tickBarWidthAnimators.remove(bar)?.cancel()
      tickBarWidthTargetPx[bar] = targetPx
      if (lp.width == targetPx) return false
      lp.width = targetPx
      return true
    }

    val running = tickBarWidthAnimators[bar]
    if (running != null && tickBarWidthTargetPx[bar] == targetPx) {
      return false
    }

    if (lp.width == targetPx) {
      tickBarWidthAnimators.remove(bar)?.cancel()
      tickBarWidthTargetPx[bar] = targetPx
      return false
    }

    tickBarWidthAnimators.remove(bar)?.cancel()
    tickBarWidthTargetPx[bar] = targetPx
    val startPx = lp.width
    val anim =
      ValueAnimator.ofInt(startPx, targetPx).apply {
        duration = 600L
        interpolator = tickBarWidthEase
        addUpdateListener { va ->
          lp.width = va.animatedValue as Int
          bar.parent?.requestLayout()
        }
      }
    tickBarWidthAnimators[bar] = anim
    anim.addListener(
      object : AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: Animator) {
          if (tickBarWidthAnimators[bar] === anim) {
            tickBarWidthAnimators.remove(bar)
          }
          lp.width = targetPx
          bar.parent?.requestLayout()
        }

        override fun onAnimationCancel(animation: Animator) {
          if (tickBarWidthAnimators[bar] === anim) {
            tickBarWidthAnimators.remove(bar)
          }
        }
      }
    )
    anim.start()
    return false
  }

  private fun updateTickColors(animateTickWidths: Boolean = true) {
    val cTick = parseColor(colorTick)
    val cMid = parseColor(colorMidTick)
    val cMajor = parseColor(colorMajorTick)
    val cActive = parseColor(colorGlassActiveTick)
    val cActiveNeighbor = parseColor(colorGlassActiveNeighborTick)

    val majorH = dp(majorTickHeight)
    val midH = dp(midTickHeight)
    val minorH = dp(minorTickHeight)

    val selectedIdx = round(centerPosition.toDouble()).toInt().coerceIn(0, totalSteps)
    val centerIsGridMajor = isMajorTickIndex(selectedIdx)

    var needSyncLayout = false

    for (i in 0..totalSteps) {
      val bar = tickBars.getOrNull(i) ?: continue

      val promoteGlassMajor = !centerIsGridMajor && i == selectedIdx
      val demoteAdjacentGridMajor =
        !centerIsGridMajor && kotlin.math.abs(i - selectedIdx) == 1 && isMajorTickIndex(i)

      val baseColor: Int
      val gainX: Float
      val gainY: Float
      val always: Boolean
      val barW: Float

      if (unit == "ft") {
        val ti = imperialMaxInches() - i
        var effKind = tickKindImperial(ti)
        if (demoteAdjacentGridMajor) {
          effKind = TickKind.SMALL
        }
        if (promoteGlassMajor) {
          effKind = TickKind.MAJOR
        }
        barW = barWidth(effKind, majorH, midH, minorH)
        when (effKind) {
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
        var isLong = indexFromMin % longStepInterval == 0
        val half = max(1, longStepInterval / 2)
        var isMid = !isLong && indexFromMin % half == 0
        if (demoteAdjacentGridMajor) {
          isLong = false
          isMid = false
        }
        if (promoteGlassMajor) {
          isLong = true
          isMid = false
        }
        barW = when {
          isLong -> majorH
          isMid -> midH
          else -> minorH
        }
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

      val newBarW = barW.toInt()
      if (setTickBarToWidthPx(bar, newBarW, animateTickWidths)) {
        needSyncLayout = true
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
      val waveSigma = 0.82f
      val wave = kotlin.math.exp(-kotlin.math.pow((dist / waveSigma).toDouble(), 2.0)).toFloat()
      val waveStrength = 1.32f
      val centerGlow = kotlin.math.exp(-kotlin.math.pow((dist / 0.45f).toDouble(), 2.0)).toFloat()
      val neighborGlow = kotlin.math.exp(-kotlin.math.pow(((dist - 1f) / 0.55f).toDouble(), 2.0)).toFloat()
      val neighborBlend = min(1f, neighborGlow * 0.72f)
      val centerBlend = min(1f, centerGlow * 0.96f)
      val neighborTinted = ColorUtils.blendARGB(baseColor, cActiveNeighbor, neighborBlend)
      val highlighted = ColorUtils.blendARGB(neighborTinted, cActive, centerBlend)
      bar.setBackgroundColor(highlighted)
      bar.pivotX = 0f
      bar.scaleX = 1f + (gainX * wave * waveStrength)
      bar.scaleY = 1f + (gainY * wave * waveStrength)
      // Center nudges right most; neighbors under the glass nudge slightly right (lekko wysunięte).
      bar.translationX =
        dp(4.35).toFloat() * wave +
        dp(5.6).toFloat() * centerGlow +
        dp(2.75).toFloat() * neighborGlow

      val label = tickLabels.getOrNull(i)
      if (label != null) {
        if (unit == "ft") {
          val ti = imperialMaxInches() - i
          var ek = tickKindImperial(ti)
          if (demoteAdjacentGridMajor) {
            ek = TickKind.SMALL
          }
          if (promoteGlassMajor) {
            ek = TickKind.MAJOR
          }
          label.text = if (showGlassLabelText || ek == TickKind.MAJOR) formatImperialLabel(ti) else ""
        } else {
          val tickVal = rangeMax - i * step
          label.text = if (showGlassLabelText) glassMetricLabel(tickVal) else metricLabel(i, tickVal)
        }
        val labelCenterGlow = kotlin.math.exp(-kotlin.math.pow((dist / 0.5f).toDouble(), 2.0)).toFloat()
        val labelNeighborGlow =
          kotlin.math.exp(-kotlin.math.pow(((dist - 1f) / 0.5f).toDouble(), 2.0)).toFloat()
        val labelScaleRaw = max(0.96f, 1f + (0.14f * labelCenterGlow) - (0.035f * labelNeighborGlow))
        val neighborLabelBoost = 1f + (0.042f * labelNeighborGlow * glassLabelPresence)
        val labelScale = (1f + ((labelScaleRaw - 1f) * glassLabelPresence)) * neighborLabelBoost
        val labelAlphaRaw = max(0.72f, 1f - (0.28f * labelNeighborGlow))
        val labelAlpha = if (always) {
          1f + ((labelAlphaRaw - 1f) * glassLabelPresence)
        } else {
          labelAlphaRaw * glassLabelPresence
        }
        val labelColor = ColorUtils.blendARGB(cMajor, cMid, min(1f, labelNeighborGlow * 0.82f))
        label.setTextColor(labelColor)
        val pivotInset = dp(4.0)
        label.pivotX = max(1f, label.width - pivotInset)
        label.pivotY = label.height * 0.5f
        label.scaleX = labelScale
        label.scaleY = labelScale
        label.alpha = if (always) labelAlpha else if (showGlassLabelText) labelAlpha else 1f
      }
    }

    if (needSyncLayout) {
      contentColumn.requestLayout()
    }
  }

  private fun isMajorTickIndex(i: Int): Boolean {
    if (i < 0 || i > totalSteps) return false
    if (unit == "ft") {
      val ti = imperialMaxInches() - i
      return ti % 12 == 0
    }
    val indexFromMin = totalSteps - i
    return indexFromMin % longStepInterval == 0
  }

  /** Major + mid (“half”) grid — e.g. cm every 10 and every 5; ft every 6″ (half-foot), includes whole feet. */
  private fun isHalfGridTickIndex(i: Int): Boolean {
    if (i < 0 || i > totalSteps) return false
    if (unit == "ft") {
      val ti = imperialMaxInches() - i
      return ti % 6 == 0
    }
    val indexFromMin = totalSteps - i
    val half = max(1, longStepInterval / 2)
    return indexFromMin % half == 0
  }

  private fun maybeMajorTickHaptic(newIdx: Int) {
    if (newIdx == lastMajorHapticScrollIndex) return
    val hadPrior = lastMajorHapticScrollIndex != null
    lastMajorHapticScrollIndex = newIdx
    if (!hadPrior || suppressMajorTickHaptic || !isHalfGridTickIndex(newIdx)) return
    val isMajor = isMajorTickIndex(newIdx)
    val haptic =
      if (isMajor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        HapticFeedbackConstants.CLOCK_TICK
      } else {
        HapticFeedbackConstants.KEYBOARD_TAP
      }
    scrollView.performHapticFeedback(haptic)
  }

  private fun onScrollChanged(scrollY: Int) {
    setGlassInMotion(true)
    centerPosition = scrollY.toFloat() / itemSizePx.toFloat()
    val idx = indexForOffset(scrollY)
    if (idx != centerIndex) {
      maybeMajorTickHaptic(idx)
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
    suppressMajorTickHaptic = true
    if (abs(scrollView.scrollY - y) > 1) {
      scrollView.scrollTo(0, y)
    }
    centerPosition = y.toFloat() / itemSizePx.toFloat()
    centerIndex = indexForOffset(y)
    lastMajorHapticScrollIndex = centerIndex
    suppressMajorTickHaptic = false
    updateTickColors()
    emitValue(emitStringForIndex(centerIndex))
    emitEmpty("topScrollEnd")
    setGlassInMotion(false)
  }
}
