package com.reactnativebodymetricspicker

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Build
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import androidx.core.graphics.ColorUtils
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.LinearSnapHelper
import androidx.recyclerview.widget.RecyclerView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.round
import java.util.Locale

/**
 * Vertical scale for the drawn pill vs [computedPillHeightPx] (layout slack for labels/ticks).
 * Slightly below 1 tucks the capsule without changing row pitch or label math.
 */
private const val PILL_BACKGROUND_HEIGHT_SCALE = 0.90f

/** Minimum multiplier at capsule top/bottom seam — shared by tick ink and centered value labels (soft edge → full inside). */
private const val PILL_CAP_EDGE_MIN = 0.1f

/** Widens seam ease band toward the capsule (smoothstep ramp — same for ticks and labels). */
private const val PILL_CAP_EDGE_BAND_SCALE = 1.35f

/** Match [HeightRulerUIKitView] `waveStrength` for bar scale. */
private const val TICK_WAVE_STRENGTH = 1.32f

/** >1 eases grid→glass tick width/color blend more slowly vs scroll (no separate animator). */
private const val PILL_TICK_BLEND_SLOWDOWN_GAMMA: Double = 1.14

/** >1 slows lerp between glass samples at integer center boundaries. */
private const val PILL_GLASS_HANDOFF_SLOWDOWN_GAMMA: Double = 1.12

// --- Continuous tick-length animation under the pill (matches WeightRulerView). -----------------
// Replaces the discrete grid→glass sample blend with one Gaussian-driven formula so every tick
// inside the band smoothly suppresses to a uniform floor and the snapped position grows toward
// `unifiedTargetLen`. Same numbers as `WeightRulerView.kt` for cross-component visual parity.
/** Gaussian width of the snap boost — peak 1.0 at snap, ~0.44 at ±1 step, ~0.04 at ±2 steps. */
private const val HR_GLASS_BOOST_SIGMA = 1.1
/** Wider Gaussian — strength of the "treat as uniform" pull that suppresses majors near the snap. */
private const val HR_GLASS_UNIFORM_SIGMA = 2.0
/** Extra dp added to the longest snapped tick on top of `majorTickHeight`. */
private const val HR_GLASS_UNIFIED_BONUS_DP = 4.0
/** Stroke (vertical thickness) pulse multiplier at snap — same factor as WeightRuler. */
private const val HR_GLASS_STROKE_PULSE = 0.6f
/** Snap-driven label growth — peak `1 + this` at exact snap, smoother dominance vs neighbors. */
private const val HR_GLASS_LABEL_CENTER_BOOST = 0.32f
/** How much neighbor labels shrink relative to natural size — keeps the snapped value dominant. */
private const val HR_GLASS_LABEL_NEIGHBOR_SHRINK = 0.10f

/** Must match [ANDROID_RULER_EXTRA_TRACK_DP] in rulerConstants.ts — widens pill + track on the right. */
private const val ANDROID_RULER_EXTRA_TRACK_DP = 28.0

/** Fixed tick label size (sp); keep in sync with [TICK_LABEL_FONT_SIZE] in rulerConstants.ts. */
private const val TICK_LABEL_FONT_SIZE_SP = 19.0

/** Extends pill right edge so glass labels / long ticks aren’t clipped by the rounded rect. */
private const val PILL_INK_SLACK_RIGHT_DP = 9.0

/**
 * Pulls pill left edge toward [0]: center labels use RIGHT align + scale + [labelScrollLeftPx], so glyphs
 * grow leftward and were clipping (e.g. 5′10″) against the rounded rect.
 */
private const val PILL_INK_SLACK_LEFT_DP = 22.0

/**
 * For RIGHT-aligned glass labels: shifts the snapped row’s text right so the leading digit clears the pill’s left curve.
 */
private const val LABEL_PILL_LEADING_BREATHING_DP = 6.0

/**
 * Was used to tuck ticks under a wider pill; with a symmetric horizontal [PILL_HORIZONTAL_OUTSET_DP], a non-zero
 * value shifts the whole scale right and the glass looks off-center. Keep at 0; use [RULER_TRACK_SHIFT_LEFT_DP] to nudge.
 */
private const val ANDROID_RULER_NUDGE_RIGHT_DP = 0.0

/**
 * Shifts labels + ticks left; same amount is added to [trackExtraRightPx] so the major-tick right edge is unchanged.
 */
private const val RULER_TRACK_SHIFT_LEFT_DP = 6.0

/**
 * Glass pill extends past the ruler track on each side (capsule wider than the native view / tick column).
 * [PillBackgroundView] is laid out wider and shifted; host keeps [clipChildren] false so it can draw outside.
 */
private const val PILL_HORIZONTAL_OUTSET_DP = 18.0

private class HeightRulerEvent(
  surfaceId: Int,
  viewTag: Int,
  private val name: String,
  private val payload: WritableMap?,
) : Event<HeightRulerEvent>(surfaceId, viewTag) {
  override fun getEventName() = name
  override fun getEventData() = payload ?: Arguments.createMap()
}

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
    return try {
      Color.parseColor(t)
    } catch (_: IllegalArgumentException) {
      Color.GRAY
    }
  }
  if (t.startsWith("rgba(") && t.endsWith(")")) {
    val parts = t.substring(5, t.length - 1).split(",").map { it.trim().toFloatOrNull() ?: 0f }
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
  if (t.startsWith("rgb(") && t.endsWith(")")) {
    val parts = t.substring(4, t.length - 1).split(",").map { it.trim().toFloatOrNull() ?: 0f }
    if (parts.size >= 3) {
      var r = parts[0]
      var g = parts[1]
      var b = parts[2]
      if (r > 1f) r /= 255f
      if (g > 1f) g /= 255f
      if (b > 1f) b /= 255f
      return Color.argb(
        255,
        (r * 255).toInt().coerceIn(0, 255),
        (g * 255).toInt().coerceIn(0, 255),
        (b * 255).toInt().coerceIn(0, 255),
      )
    }
  }
  return Color.GRAY
}

class HeightRulerView(context: Context) : FrameLayout(context) {
  /**
   * Clips the scrolling list to the ruler’s laid-out rect. The root stays [clipChildren]=false so
   * [pillView] can extend horizontally; without this host, ticks/labels could still paint outside vertically.
   */
  private val recyclerClipHost =
    FrameLayout(context).apply {
      clipChildren = true
      clipToPadding = true
      setBackgroundColor(Color.TRANSPARENT)
    }
  private val recyclerView = RecyclerView(context)
  /** Replaced on unit switch so [RecyclerView] does not keep the old list’s internal scroll offset. */
  private var layoutManager = LinearLayoutManager(context, RecyclerView.VERTICAL, false)
  private val snapHelper =
    object : LinearSnapHelper() {
      override fun findTargetSnapPosition(
        layoutManager: RecyclerView.LayoutManager,
        velocityX: Int,
        velocityY: Int,
      ): Int {
        val target = super.findTargetSnapPosition(layoutManager, velocityX, velocityY)
        if (target == RecyclerView.NO_POSITION) return target
        return target.coerceIn(0, totalSteps)
      }
    }
  private val pillView = PillBackgroundView(context)

  var unit: String = "cm"
  var rangeMin = 100.0
  var rangeMax = 250.0
  var step = 1.0
  var fractionDigits = 0
  var initialValue = 175.0
  var rulerTrackWidth = 120.0
  var tickSpacing = 15.0
  var minorTickHeight = 18.0
  var midTickHeight = 28.0
  var majorTickHeight = 40.0
  var tickWidth = 1.5
  var labelColumnWidth = 60.0
  var labelToTickGap = 5.0
  var tickCellPaddingRight = 6.0
  var fontFamily: String? = null
  var longStepInterval = 10
  var imperialMinInches = 39

  /** Empty string = resolve from theme in [applyRulerInkColorsFromPropsOrTheme]. */
  var colorTick = ""
  var colorMidTick = ""
  var colorMajorTick = ""
  var colorGlassActiveTick = ""
  var colorGlassActiveNeighborTick = ""
  var colorGlassCenterLabel = ""
  var glassPillBackgroundColor: String? = null
  var glassPillBorderRadius: Double = 0.0

  private var pillHasCustomFill = false
  private var pillUseLightForeground = false
  /** Resolved from [android.R.attr.colorPrimary] when [glassPillBackgroundColor] is unset. */
  private var defaultPillThemeColor: Int = Color.BLACK

  private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.RIGHT }
  private val glassPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val glassStrokePaint =
    Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = max(1f, resources.displayMetrics.density)
    }

  private var totalSteps = 0
  private var itemSizePx = 1f
  private var endPaddingPx = 0
  private var centerPosition = 0f
  private var centerIndex = -1
  private var pendingInitialValueOverride: Double? = null
  private var pendingUnitSwitch = false
  private var needsReload = true
  private var touchActive = false
  /** True while correcting scroll so [RecyclerView.OnScrollListener] does not recurse. */
  private var inScrollExtentClamp = false
  private var lastThrottle = 0L
  private var lastMajorHapticScrollIndex: Int? = null
  private var suppressMajorTickHaptic = false
  private var lastEmittedValue: String? = null
  /** Last laid-out height — when it changes, [rebuild] recenters padding. */
  private var lastSyncedLayoutHeightPx = -1

  private var cTick = Color.GRAY
  private var cMid = Color.GRAY
  private var cMajor = Color.DKGRAY
  private var cActive = Color.BLUE
  private var cActiveNeighbor = Color.BLUE
  private var labelRightPx = 0f
  private var barStartPx = 0f
  private var tickThicknessPx = 1f
  private var majorHPx = 0f
  private var midHPx = 0f
  private var minorHPx = 0f
  private var baseTextSizePx = 0f
  private var tickNudgePx = 0f
  private var centerNudgePx = 0f
  private var neighborNudgePx = 0f
  private var glassBorderColor = Color.TRANSPARENT
  /** Horizontal extent after [majorHPx] so pill matches widened [rulerTrackWidth] from JS. */
  private var trackExtraRightPx = 0f
  /** Each-side px the pill extends beyond the ruler width; synced in [rebuild]. */
  private var pillHorizontalOutsetPx = 0f

  private val rowsAdapter =
    object : RecyclerView.Adapter<TickViewHolder>() {
      override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): TickViewHolder {
        val row = TickRowView(context)
        row.layoutParams = RecyclerView.LayoutParams(LayoutParams.MATCH_PARENT, itemSizePx.toInt().coerceAtLeast(1))
        return TickViewHolder(row)
      }

      override fun onBindViewHolder(holder: TickViewHolder, position: Int) {
        holder.row.index = position
        holder.row.layoutParams = RecyclerView.LayoutParams(LayoutParams.MATCH_PARENT, itemSizePx.toInt().coerceAtLeast(1))
        holder.row.invalidate()
      }

      override fun getItemCount(): Int = totalSteps + 1
    }

  init {
    setWillNotDraw(false)
    // Pill view is laid out wider than the ruler so the capsule can protrude; children may draw outside host width.
    clipChildren = false
    clipToPadding = false
    // Ruler chrome is only the pill + ink; track area stays transparent for host/card backgrounds.
    setBackgroundColor(Color.TRANSPARENT)

    recyclerView.setBackgroundColor(Color.TRANSPARENT)
    recyclerView.layoutManager = layoutManager
    recyclerView.adapter = rowsAdapter
    recyclerView.itemAnimator = null
    recyclerView.clipToPadding = false
    recyclerView.clipChildren = true
    recyclerView.overScrollMode = OVER_SCROLL_NEVER
    // Host screens often wrap the ruler in a vertical ScrollView; nested scrolling lets unconsumed
    // drag at list edges scroll the parent (whole screen “jumps”). The list handles its own wheel.
    recyclerView.isNestedScrollingEnabled = false
    recyclerView.setHasFixedSize(true)
    snapHelper.attachToRecyclerView(recyclerView)
    // RecyclerView often leaves haptics off; root + flag below make tick feedback reliable on OEM builds.
    isHapticFeedbackEnabled = true
    recyclerView.isHapticFeedbackEnabled = true

    // Bottom → top: pill, clipped tick list (z-order).
    addView(pillView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    recyclerClipHost.addView(
      recyclerView,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
    )
    addView(recyclerClipHost, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

    recyclerView.addOnScrollListener(
      object : RecyclerView.OnScrollListener() {
        override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
          when (newState) {
            RecyclerView.SCROLL_STATE_DRAGGING -> {
              touchActive = true
              emitEmpty("topScrollBegin")
              invalidatePillAndOverlay()
            }
            RecyclerView.SCROLL_STATE_IDLE -> {
              alignRecyclerToTickExtents()
              updateCenterFromRecycler(emit = true)
              emitValue(emitStringForIndex(centerIndex.coerceIn(0, totalSteps)))
              emitEmpty("topScrollEnd")
              touchActive = false
              invalidatePillAndOverlay()
            }
          }
        }

        override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
          alignRecyclerToTickExtents()
          updateCenterFromRecycler(emit = true)
        }
      },
    )

    recyclerView.setOnTouchListener { _, ev ->
      if (ev.actionMasked == MotionEvent.ACTION_DOWN) {
        touchActive = true
        invalidatePillAndOverlay()
      }
      false
    }

    pillHorizontalOutsetPx = dp(PILL_HORIZONTAL_OUTSET_DP)
    recalculatePillDerivedState()
  }

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> parent?.requestDisallowInterceptTouchEvent(true)
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> parent?.requestDisallowInterceptTouchEvent(false)
    }
    return super.dispatchTouchEvent(ev)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    applyRulerInkColorsFromPropsOrTheme()
    recalculatePillDerivedState()
  }

  override fun getSuggestedMinimumWidth(): Int =
    max(super.getSuggestedMinimumWidth(), computeHorizontalMinWidthPx())

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    // At least label + gap + major, plus horizontal headroom for tick wave/nudges and pill stroke/AA.
    // Yoga often passes EXACT width from JS — drawing is still clamped to [measuredWidth] when smaller.
    val minW = computeHorizontalMinWidthPx().coerceAtLeast(1)
    val intrinsicMinH = dp(240.0).toInt().coerceAtLeast(1)
    val w = resolveSize(minW, widthMeasureSpec)
    val h = resolveSize(intrinsicMinH, heightMeasureSpec)
    setMeasuredDimension(w, h)
    val childWidth = MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY)
    val childHeight = MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
    val oPx = max(0, round(pillHorizontalOutsetPx).toInt())
    val pillW = measuredWidth + 2 * oPx
    pillView.measure(MeasureSpec.makeMeasureSpec(pillW, MeasureSpec.EXACTLY), childHeight)
    recyclerClipHost.measure(childWidth, childHeight)
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    val layoutH = bottom - top
    if (needsReload) {
      rebuild()
    } else if (layoutH > 0 && abs(layoutH - lastSyncedLayoutHeightPx) > 2) {
      markNeedsReload()
      return
    }
    val oPx = max(0, round(pillHorizontalOutsetPx).toInt())
    pillView.layout(-oPx, 0, width + oPx, height)
    recyclerClipHost.layout(0, 0, width, height)
  }

  fun markNeedsReload() {
    needsReload = true
    requestLayout()
    invalidate()
  }

  fun setInitialValueFromJs(v: Double) {
    initialValue = v
    pendingInitialValueOverride = v
    markNeedsReload()
  }

  fun setUnitAndPreserveCenteredValue(newUnit: String) {
    if (unit == newUnit) return
    updateCenterFromRecycler(emit = false)
    pendingInitialValueOverride =
      if (centerIndex >= 0 && totalSteps >= 0) heightCmForIndex(centerIndex.coerceIn(0, totalSteps)) else initialValue
    recyclerView.stopScroll()
    touchActive = false
    unit = newUnit
    pendingUnitSwitch = true
    HeightRulerNativeBounds.applyForUnit(this, newUnit)
    // Prevent transient cm-sized adapter range after switching to ft.
    totalSteps = computeTotalStepsForCurrentUnit()
    centerIndex = centerIndex.coerceIn(0, max(0, totalSteps))
    centerPosition = centerIndex.toFloat()
    rowsAdapter.notifyDataSetChanged()
    recyclerView.stopScroll()
    markNeedsReload()
  }

  /**
   * Matches `<Text style={{ fontFamily: '…' }}>`: expo-font registers keys like `Fraunces_600SemiBold` on
   * [ReactFontManager]; [Typeface.create] with that string does not resolve custom fonts.
   */
  private fun resolveTickLabelTypeface(): Typeface {
    val ff = fontFamily?.takeIf { it.isNotBlank() }
      ?: return Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    return try {
      ReactFontManager.getInstance().getTypeface(ff, Typeface.NORMAL, context.assets)
    } catch (_: Throwable) {
      Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
  }

  private fun rebuild() {
    needsReload = false
    itemSizePx = dp(tickSpacing).coerceAtLeast(1f)
    endPaddingPx = max(0, ((height - itemSizePx) / 2f).toInt())
    totalSteps = computeTotalStepsForCurrentUnit()

    applyRulerInkColorsFromPropsOrTheme()
    pillHorizontalOutsetPx = dp(PILL_HORIZONTAL_OUTSET_DP)
    val nudgeRightPx = dp(ANDROID_RULER_NUDGE_RIGHT_DP)
    val shiftLeftPx = dp(RULER_TRACK_SHIFT_LEFT_DP)
    labelRightPx = (nudgeRightPx + dp(labelColumnWidth) - shiftLeftPx).coerceAtLeast(dp(4.0))
    barStartPx = labelRightPx + dp(labelToTickGap)
    tickThicknessPx = dp(tickWidth).coerceAtLeast(1f)
    majorHPx = dp(majorTickHeight)
    midHPx = dp(midTickHeight)
    minorHPx = dp(minorTickHeight)
    trackExtraRightPx =
      (dp(ANDROID_RULER_EXTRA_TRACK_DP) - nudgeRightPx + shiftLeftPx).coerceAtLeast(0f)
    baseTextSizePx = sp(TICK_LABEL_FONT_SIZE_SP)
    tickNudgePx = dp(4.35)
    centerNudgePx = dp(5.6)
    neighborNudgePx = dp(2.75)
    glassBorderColor = parseColor("rgba(60, 60, 67, 0.16)")
    textPaint.textSize = baseTextSizePx
    textPaint.typeface = resolveTickLabelTypeface()

    val fm = textPaint.fontMetrics
    val labelAscent = ceil(-fm.ascent.toDouble()).toInt().coerceAtLeast(0)
    val labelDescent = ceil(fm.descent.toDouble()).toInt().coerceAtLeast(0)
    val spreadMax = ceil((pillLabelSpreadPx() * 1.2f * 1.28f).toDouble()).toInt()
    val edgeVertPad =
      max(
        dp(6.0).toInt(),
        (labelAscent + labelDescent) / 4 + spreadMax / 2 + dp(2.0).toInt(),
      )
    recyclerView.setPadding(0, endPaddingPx + edgeVertPad, 0, endPaddingPx + edgeVertPad)
    val didUnitSwitch = pendingUnitSwitch
    if (pendingUnitSwitch) {
      pendingUnitSwitch = false
      // SnapHelper + LinearLayoutManager retain scroll state from the longer cm list; swapping the
      // layout manager is the reliable way to reset internal offset before anchoring to ft indices.
      snapHelper.attachToRecyclerView(null)
      recyclerView.stopScroll()
      recyclerView.recycledViewPool.clear()
      layoutManager = LinearLayoutManager(context, RecyclerView.VERTICAL, false)
      recyclerView.layoutManager = layoutManager
    }
    rowsAdapter.notifyDataSetChanged()
    recyclerView.requestLayout()
    recyclerView.invalidate()

    val startCm = pendingInitialValueOverride ?: if (centerIndex >= 0) heightCmForIndex(centerIndex) else initialValue
    pendingInitialValueOverride = null
    val startIdx = valueToIndexFromCm(startCm).coerceIn(0, max(0, totalSteps))
    centerIndex = startIdx
    centerPosition = startIdx.toFloat()
    lastMajorHapticScrollIndex = startIdx
    emitValue(emitStringForIndex(startIdx))
    recalculatePillDerivedState()
    post {
      if (didUnitSwitch) {
        snapHelper.attachToRecyclerView(recyclerView)
      }
      val idx = startIdx.coerceIn(0, max(0, totalSteps))
      fun applyAnchor() {
        if (recyclerView.height <= 0 || itemSizePx <= 0f) return
        layoutManager.scrollToPositionWithOffset(idx, recyclerCenteredItemTopOffset())
        alignRecyclerToTickExtents()
        // LM + padding: centering often settles after a posted frame + next animation (long cm list).
        recyclerView.post {
          fineTuneScrollToCenterAnchorIndex(idx)
          recyclerView.postOnAnimation {
            fineTuneScrollToCenterAnchorIndex(idx)
            recyclerView.post {
              fineTuneScrollToCenterAnchorIndex(idx)
              updateCenterFromRecycler(emit = false)
              invalidateVisibleRows()
            }
          }
        }
      }
      applyAnchor()
      // After unit switch (especially last index = 3'3"), first layout pass can still have 0 children;
      // re-apply once views exist so ticks are visible without a manual nudge.
      if (recyclerView.childCount == 0) {
        recyclerView.post {
          applyAnchor()
          recyclerView.postOnAnimation { applyAnchor() }
        }
      } else if (didUnitSwitch) {
        recyclerView.postOnAnimation { applyAnchor() }
      }
    }
    if (height > 0) {
      lastSyncedLayoutHeightPx = height
    }
  }

  /**
   * Scroll offset so the snapped row’s vertical center lies on the RecyclerView midline.
   * Using [RecyclerView.paddingTop] here would push the selection down by [edgeVertPad] (extra top
   * padding is only for drawing headroom, not for changing the optical center).
   */
  private fun recyclerCenteredItemTopOffset(): Int {
    val h = recyclerView.height
    if (h <= 0 || itemSizePx <= 0f) return recyclerView.paddingTop.coerceAtLeast(0)
    val itemH = itemSizePx.toInt().coerceAtLeast(1)
    return max(0, (h - itemH) / 2)
  }

  /**
   * Pixel-nudge after [scrollToPositionWithOffset] so the row midpoint matches the viewport center.
   * Several passes: LM + clipToPadding=false often settles over 2–3 layout iterations (cm long list).
   */
  private fun fineTuneScrollToCenterAnchorIndex(anchorIdx: Int) {
    if (recyclerView.height <= 0 || itemSizePx <= 0f) return
    val idx = anchorIdx.coerceIn(0, max(0, totalSteps))
    val targetMid = recyclerView.height / 2f
    repeat(6) {
      val v = layoutManager.findViewByPosition(idx) ?: return
      val mid = (v.top + v.bottom) / 2f
      val dy = round(targetMid - mid).toInt()
      if (dy == 0) return
      recyclerView.scrollBy(0, dy)
    }
  }

  /**
   * With symmetric padding and [RecyclerView.clipToPadding]=false, extra scroll can appear past the
   * last tick (min height). We only correct **that** edge: last row top should align with
   * [RecyclerView.paddingTop], same as [LinearLayoutManager.scrollToPositionWithOffset](…, pad).
   *
   * Do **not** clamp the top edge with `v0.top > pad`: when [paddingTop] is small, that condition
   * becomes true during normal scrolling and kills all movement.
   */
  private fun alignRecyclerToTickExtents(): Boolean {
    if (inScrollExtentClamp || recyclerView.height <= 0 || itemSizePx <= 0f) return false
    if (recyclerView.childCount == 0) return false

    val pad = recyclerView.paddingTop
    val vN = layoutManager.findViewByPosition(totalSteps) ?: return false
    if (vN.top >= pad - 2) return false

    inScrollExtentClamp = true
    try {
      layoutManager.scrollToPositionWithOffset(totalSteps, pad)
    } finally {
      inScrollExtentClamp = false
    }
    return true
  }

  private fun computeTotalStepsForCurrentUnit(): Int {
    return if (unit == "ft") max(0, imperialMaxInches() - imperialMinInchesRounded())
    else round((rangeMax - rangeMin) / step).toInt().coerceAtLeast(0)
  }

  private fun updateCenterFromRecycler(emit: Boolean) {
    if (recyclerView.childCount == 0) return
    val viewportCenter = recyclerView.height / 2f
    var bestPos = RecyclerView.NO_POSITION
    var bestCenter = 0f
    var bestDist = Float.MAX_VALUE
    for (i in 0 until recyclerView.childCount) {
      val child = recyclerView.getChildAt(i) ?: continue
      val pos = recyclerView.getChildAdapterPosition(child)
      if (pos == RecyclerView.NO_POSITION) continue
      val childCenter = (child.top + child.bottom) / 2f
      val dist = abs(childCenter - viewportCenter)
      if (dist < bestDist) {
        bestDist = dist
        bestPos = pos
        bestCenter = childCenter
      }
    }
    if (bestPos == RecyclerView.NO_POSITION) return
    centerPosition = (bestPos + ((viewportCenter - bestCenter) / itemSizePx)).coerceIn(0f, totalSteps.toFloat())
    val idx = round(centerPosition).toInt().coerceIn(0, totalSteps)
    if (idx != centerIndex) {
      maybeMajorTickHaptic(idx)
      centerIndex = idx
    }
    invalidateVisibleRows()
    if (emit) {
      val now = System.currentTimeMillis()
      if (now - lastThrottle >= 40) {
        lastThrottle = now
        emitValue(emitStringForIndex(idx))
      }
    }
  }

  internal fun invalidatePillAndOverlay() {
    pillView.invalidate()
  }

  internal fun recalculatePillDerivedState() {
    pillHasCustomFill = !glassPillBackgroundColor.isNullOrBlank()
    defaultPillThemeColor = resolveThemeColorPrimary()
    pillUseLightForeground =
      if (pillHasCustomFill) {
        ColorUtils.calculateLuminance(parseColor(glassPillBackgroundColor)) < 0.55
      } else {
        ColorUtils.calculateLuminance(defaultPillThemeColor) < 0.55
      }
    invalidateVisibleRows()
  }

  private fun resolveThemeColorPrimary(): Int {
    val attrs = intArrayOf(android.R.attr.colorPrimary)
    val ta = context.obtainStyledAttributes(attrs)
    return try {
      ta.getColor(0, Color.BLACK)
    } finally {
      ta.recycle()
    }
  }

  private fun colorFromThemeAttr(attr: Int, fallback: Int): Int {
    val ta = context.obtainStyledAttributes(intArrayOf(attr))
    return try {
      ta.getColor(0, fallback)
    } finally {
      ta.recycle()
    }
  }

  /**
   * Non-blank props use [parseColor]; blank uses system theme (Material / AppCompat) so the ruler matches
   * `textColorPrimary` / `Secondary` / `Tertiary` and [android.R.attr.colorPrimary] for glass emphasis.
   */
  private fun applyRulerInkColorsFromPropsOrTheme() {
    val textPrimary = colorFromThemeAttr(android.R.attr.textColorPrimary, Color.BLACK)
    val textSecondary = colorFromThemeAttr(android.R.attr.textColorSecondary, Color.GRAY)
    val textTertiary =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        colorFromThemeAttr(android.R.attr.textColorTertiary, textSecondary)
      } else {
        ColorUtils.blendARGB(textSecondary, textPrimary, 0.22f)
      }
    val primary = resolveThemeColorPrimary()

    cMajor = if (colorMajorTick.isNotBlank()) parseColor(colorMajorTick) else textPrimary
    cMid = if (colorMidTick.isNotBlank()) parseColor(colorMidTick) else textSecondary
    cTick = if (colorTick.isNotBlank()) parseColor(colorTick) else textTertiary
    cActive = if (colorGlassActiveTick.isNotBlank()) parseColor(colorGlassActiveTick) else primary
    cActiveNeighbor =
      if (colorGlassActiveNeighborTick.isNotBlank()) {
        parseColor(colorGlassActiveNeighborTick)
      } else {
        ColorUtils.setAlphaComponent(primary, (255 * 0.72f).toInt().coerceIn(0, 255))
      }
  }

  private fun invalidateVisibleRows() {
    for (i in 0 until recyclerView.childCount) {
      recyclerView.getChildAt(i)?.invalidate()
    }
    pillView.invalidate()
  }

  private data class PillTickDrawSample(
    val barWidthPx: Float,
    val baseColor: Int,
    val gainX: Float,
    val gainY: Float,
    val alwaysLabel: Boolean,
    val baseLabel: String,
  )

  /**
   * Softer Gaussians than [centerGlow]/[neighborGlow] so tick **width** eases between grid and glass
   * states while scrolling (promote/demote no longer snaps in one frame).
   */
  private fun pillTickWidthBlend(dist: Float): Float {
    val a = exp(-((dist / 0.86f).toDouble().pow(2.0))).toFloat()
    val b = exp(-(((dist - 1f) / 1.08f).toDouble().pow(2.0))).toFloat()
    val raw = min(1f, max(a, b * 0.98f))
    val t = raw.coerceIn(0f, 1f)
    val smooth = t * t * (3f - 2f * t)
    return smooth.toDouble().pow(PILL_TICK_BLEND_SLOWDOWN_GAMMA).toFloat().coerceIn(0f, 1f)
  }

  /**
   * Scroll-driven ease for pill band **visuals** (ink, tick tint, label nudge). Replaces a hard
   * [glassLabelPresence] threshold so majors (230, 240…) fade cleanly in/out with the tick width blend.
   */
  private fun pillBandVisualEase(glassLabelPresence: Float): Float {
    val lo = 0.055f
    val hi = 0.28f
    if (glassLabelPresence <= lo) return 0f
    if (glassLabelPresence >= hi) return 1f
    val t = ((glassLabelPresence - lo) / (hi - lo)).coerceIn(0f, 1f)
    return t * t * (3f - 2f * t)
  }

  /**
   * Ensures full grid→glass blend when the snapped center is off a “strong” grid line but |i − center|
   * is > ~1 (e.g. 124.99 → snap 125), for rows demoted in glass (adjacent major **or mid** / ft step).
   */
  private fun pillAdjacentDemotedGridWidthBoost(i: Int): Float {
    val snap = round(centerPosition).toInt().coerceIn(0, totalSteps)
    val dSnap = abs(centerPosition - snap.toFloat()).coerceIn(0f, 1f)
    val floorBlend = 0.86f + 0.14f * (1f - dSnap)
    if (unit == "ft") {
      val tiRow = imperialMaxInches() - i
      if (tiRow < imperialMinInchesRounded() || tiRow > imperialMaxInches()) return 0f
      val selectedTi = imperialMaxInches() - snap
      if (selectedTi % 12 == 0) return 0f
      if (abs(i - snap) != 1) return 0f
      val kg = tickKindImperial(tiRow)
      if (kg == TickKind.MAJOR || kg == TickKind.LARGE || kg == TickKind.MEDIUM) {
        return floorBlend.coerceIn(0f, 1f)
      }
      return 0f
    }
    val indexFromMin = totalSteps - i
    val isLongG = indexFromMin % longStepInterval == 0
    val half = max(1, longStepInterval / 2)
    val isMidG = !isLongG && indexFromMin % half == 0
    if ((totalSteps - snap) % longStepInterval == 0) return 0f
    if (abs(i - snap) != 1) return 0f
    if (isLongG || isMidG) return floorBlend.coerceIn(0f, 1f)
    return 0f
  }

  private fun ftTickDrawSample(ti: Int, kind: TickKind): PillTickDrawSample {
    val barWidthPx = barWidth(kind, majorHPx, midHPx, minorHPx)
    val baseLabel = if (kind == TickKind.MAJOR) formatImperialLabel(ti) else ""
    return when (kind) {
      TickKind.MAJOR ->
        PillTickDrawSample(barWidthPx, cMajor, 0.24f, 0.06f, true, baseLabel)
      TickKind.LARGE, TickKind.MEDIUM ->
        PillTickDrawSample(barWidthPx, cMid, 0.38f, 0.1f, false, baseLabel)
      TickKind.SMALL ->
        PillTickDrawSample(barWidthPx, cTick, 0.5f, 0.14f, false, baseLabel)
    }
  }

  private fun cmTickDrawSample(indexFromMin: Int, i: Int, isLong: Boolean, isMid: Boolean): PillTickDrawSample {
    val barWidthPx =
      when {
        isLong -> majorHPx
        isMid -> midHPx
        else -> minorHPx
      }
    val baseLabel = metricLabel(indexFromMin, rangeMax - i * step)
    return when {
      isLong ->
        PillTickDrawSample(barWidthPx, cMajor, 0.24f, 0.06f, true, baseLabel)
      isMid ->
        PillTickDrawSample(barWidthPx, cMid, 0.38f, 0.1f, false, baseLabel)
      else ->
        PillTickDrawSample(barWidthPx, cTick, 0.5f, 0.14f, false, baseLabel)
    }
  }

  private fun lerpPillTickDrawSample(a: PillTickDrawSample, b: PillTickDrawSample, t: Float): PillTickDrawSample {
    val u = t.coerceIn(0f, 1f)
    return PillTickDrawSample(
      barWidthPx = a.barWidthPx + (b.barWidthPx - a.barWidthPx) * u,
      baseColor = ColorUtils.blendARGB(a.baseColor, b.baseColor, u),
      gainX = a.gainX + (b.gainX - a.gainX) * u,
      gainY = a.gainY + (b.gainY - a.gainY) * u,
      alwaysLabel = a.alwaysLabel,
      baseLabel = a.baseLabel,
    )
  }

  /** Glass promote/demote for a discrete “center snap” index (integer row under the reticle). */
  private fun glassTickDrawSampleForSnap(i: Int, selectedIdx: Int): PillTickDrawSample? {
    if (unit == "ft") {
      val ti = imperialMaxInches() - i
      if (ti < imperialMinInchesRounded() || ti > imperialMaxInches()) return null
      val kindGrid = tickKindImperial(ti)
      var kindGlass = kindGrid
      val selectedTi = imperialMaxInches() - selectedIdx
      val centerIsGridMajor = selectedTi % 12 == 0
      val promoteGlassMajor = !centerIsGridMajor && i == selectedIdx
      val demoteAdjacentGridMajor =
        !centerIsGridMajor &&
          abs(i - selectedIdx) == 1 &&
          (imperialMaxInches() - i) % 12 == 0
      val demoteAdjacentFtStep =
        !centerIsGridMajor &&
          abs(i - selectedIdx) == 1 &&
          (kindGrid == TickKind.LARGE || kindGrid == TickKind.MEDIUM)
      if (demoteAdjacentGridMajor) {
        kindGlass = TickKind.SMALL
      } else if (demoteAdjacentFtStep) {
        kindGlass = TickKind.SMALL
      }
      if (promoteGlassMajor) {
        kindGlass = TickKind.MAJOR
      }
      return ftTickDrawSample(ti, kindGlass)
    }
    val indexFromMin = totalSteps - i
    val isLongG = indexFromMin % longStepInterval == 0
    val half = max(1, longStepInterval / 2)
    val isMidG = !isLongG && indexFromMin % half == 0
    var isLongL = isLongG
    var isMidL = isMidG
    val centerIsGridMajor = (totalSteps - selectedIdx) % longStepInterval == 0
    val promoteGlassMajor = !centerIsGridMajor && i == selectedIdx
    val demoteAdjacentGridMajor =
      !centerIsGridMajor &&
        abs(i - selectedIdx) == 1 &&
        (totalSteps - i) % longStepInterval == 0
    val demoteAdjacentGridMid =
      !centerIsGridMajor &&
        abs(i - selectedIdx) == 1 &&
        isMidG
    if (demoteAdjacentGridMajor) {
      isLongL = false
      isMidL = false
    } else if (demoteAdjacentGridMid) {
      isLongL = false
      isMidL = false
    }
    if (promoteGlassMajor) {
      isLongL = true
      isMidL = false
    }
    return cmTickDrawSample(indexFromMin, i, isLongL, isMidL)
  }

  /**
   * Soft crossfade at the pill’s top/bottom caps (scroll-linked, no extra animators): ink **fades out**
   * when crossing into the glass band, then **fades in** to full strength inside the capsule; symmetric
   * when leaving toward the grid.
   *
   * @param minAtEdge lowest multiplier at the cap seam (deeper = stronger fade).
   * @param bandScale multiplies the outer blend band width (longer ease into the capsule).
   */
  private fun pillCapCrossfadeMultiplier(
    row: View,
    minAtEdge: Float,
    bandScale: Float = 1f,
  ): Float {
    val h = recyclerView.height
    if (h <= 0 || itemSizePx <= 0f) return 1f
    val y = row.top + row.height / 2f
    val pillH = computedPillHeightPx() * PILL_BACKGROUND_HEIGHT_SCALE
    val pillTop = (h - pillH) / 2f
    val pillBottom = pillTop + pillH
    val band = max(dp(9.0), itemSizePx * 0.52f) * bandScale
    val inner = max(dp(4.0), itemSizePx * 0.22f)
    fun lerpSmooth(y0: Float, y1: Float, t: Float): Float {
      val u = t.coerceIn(0f, 1f)
      val w = u * u * (3f - 2f * u)
      return y0 + (y1 - y0) * w
    }
    val m = minAtEdge.coerceIn(0.02f, 1f)
    return when {
      y < pillTop - band -> 1f
      y < pillTop -> {
        val t = (y - (pillTop - band)) / band
        lerpSmooth(1f, m, t)
      }
      y < pillTop + inner -> {
        val t = (y - pillTop) / inner
        lerpSmooth(m, 1f, t)
      }
      y <= pillBottom - inner -> 1f
      y <= pillBottom -> {
        val t = (y - (pillBottom - inner)) / inner
        lerpSmooth(1f, m, t)
      }
      y <= pillBottom + band -> {
        val t = (y - pillBottom) / band
        lerpSmooth(m, 1f, t)
      }
      else -> 1f
    }
  }

  /**
   * In the pill’s vertical band, show only the three ticks around the snapped center ([centerIndex] ± 1).
   * Rows outside that triplet still draw normally above/below the pill.
   */
  private fun skipTickRowDrawingInPillBand(i: Int, row: View): Boolean {
    if (recyclerView.height <= 0) return false
    val tickYInRv = row.top + row.height / 2f
    val pillH = computedPillHeightPx() * PILL_BACKGROUND_HEIGHT_SCALE
    val pillTop = (recyclerView.height - pillH) / 2f
    val pillBottom = pillTop + pillH
    if (tickYInRv < pillTop || tickYInRv > pillBottom) return false
    val centerIdx = round(centerPosition).toInt().coerceIn(0, totalSteps)
    return abs(i - centerIdx) > 1
  }

  private fun drawTickRow(canvas: Canvas, i: Int, centerY: Float, row: View) {
    if (i < 0 || i > totalSteps) return
    if (skipTickRowDrawingInPillBand(i, row)) return
    val pillCapsuleEdgeFade =
      pillCapCrossfadeMultiplier(
        row,
        PILL_CAP_EDGE_MIN,
        bandScale = PILL_CAP_EDGE_BAND_SCALE,
      )

    val dist = abs(i.toFloat() - centerPosition)
    val widthBlend =
      max(pillTickWidthBlend(dist), pillAdjacentDemotedGridWidthBoost(i)).coerceIn(0f, 1f)
    val glassLabelPresence = exp(-((dist / 1.35f).toDouble().pow(2.0))).toFloat()

    val gridSample: PillTickDrawSample =
      if (unit == "ft") {
        val ti = imperialMaxInches() - i
        if (ti < imperialMinInchesRounded() || ti > imperialMaxInches()) return
        ftTickDrawSample(ti, tickKindImperial(ti))
      } else {
        val indexFromMin = totalSteps - i
        val isLongG = indexFromMin % longStepInterval == 0
        val half = max(1, longStepInterval / 2)
        val isMidG = !isLongG && indexFromMin % half == 0
        cmTickDrawSample(indexFromMin, i, isLongG, isMidG)
      }

    val c = centerPosition.coerceIn(0f, totalSteps.toFloat())
    val c0 = floor(c.toDouble()).toInt().coerceIn(0, totalSteps)
    val c1 = ceil(c.toDouble()).toInt().coerceIn(0, totalSteps)
    val glass0 = glassTickDrawSampleForSnap(i, c0) ?: return
    val glass1 = glassTickDrawSampleForSnap(i, c1) ?: return
    val fracHandoff =
      if (c1 == c0) {
        0f
      } else {
        ((c - c0) / (c1 - c0).toFloat()).coerceIn(0f, 1f)
      }
    val smoothHandoffBase = fracHandoff * fracHandoff * (3f - 2f * fracHandoff)
    val smoothHandoff =
      smoothHandoffBase.toDouble().pow(PILL_GLASS_HANDOFF_SLOWDOWN_GAMMA).toFloat().coerceIn(0f, 1f)
    val glassLerp =
      if (c0 == c1) {
        glass0
      } else {
        lerpPillTickDrawSample(glass0, glass1, smoothHandoff)
      }
    val snapLabel = round(centerPosition).toInt().coerceIn(0, totalSteps)
    val glassLabelSnap = glassTickDrawSampleForSnap(i, snapLabel) ?: return
    val glassSample =
      glassLerp.copy(alwaysLabel = glassLabelSnap.alwaysLabel, baseLabel = glassLabelSnap.baseLabel)

    // WeightRuler-style continuous Gaussian length modulation. `boost` is sharp (peak at snap)
    // and `uniform` is wider (pulls every tick inside the band down toward the minor floor so
    // a major neighbor doesn't tower over its peers). Replaces the prior gridSample→glassSample
    // discrete lerp so every fractional center position animates smoothly across all ticks.
    val hrBoost = exp(-((dist / HR_GLASS_BOOST_SIGMA).toDouble()).pow(2.0))
      .toFloat()
      .coerceIn(0f, 1f)
    val hrUniform = exp(-((dist / HR_GLASS_UNIFORM_SIGMA).toDouble()).pow(2.0))
      .toFloat()
      .coerceIn(0f, 1f)
    val unifiedTargetLen = majorHPx + dp(HR_GLASS_UNIFIED_BONUS_DP)
    val suppressedBase = gridSample.barWidthPx + (minorHPx - gridSample.barWidthPx) * hrUniform
    val barWidthPx = suppressedBase + (unifiedTargetLen - suppressedBase) * hrBoost

    val baseColor =
      ColorUtils.blendARGB(gridSample.baseColor, glassSample.baseColor, widthBlend)
    // `gainX`/`gainY` are intentionally no longer read here — width is fully driven by the
    // smooth `barWidthPx` formula above and thickness by `thicknessPulse`. The lerped sample
    // values still flow through `lerpPillTickDrawSample` for any future consumer; we just don't
    // wire them into this row's geometry anymore.
    val alwaysLabel = glassSample.alwaysLabel
    val baseLabel = glassSample.baseLabel

    // Dark pill uses light ink only near the snapped row; ease vs scroll so majors don’t pop in/out.
    val pillBandEase = pillBandVisualEase(glassLabelPresence)
    val pillTintedBase: Int =
      if (pillUseLightForeground) {
        ColorUtils.blendARGB(baseColor, Color.WHITE, 0.52f)
      } else {
        ColorUtils.blendARGB(baseColor, Color.DKGRAY, 0.1f)
      }
    val baseForWave = ColorUtils.blendARGB(baseColor, pillTintedBase, pillBandEase)

    // Gaussians and wave cutoff match iOS (HeightRulerTickRowView) so horizontal nudge matches platform.
    val wave =
      if (dist <= 1.8f) {
        exp(-((dist / 0.90f).toDouble().pow(2.0))).toFloat()
      } else {
        0f
      }
    val centerGlow = exp(-((dist / 0.45f).toDouble().pow(2.0))).toFloat()
    val neighborGlow = exp(-(((dist - 1f) / 0.55f).toDouble().pow(2.0))).toFloat()
    // In the pill band, [cActive] defaults to colorPrimary — same as the pill fill, so the center tick
    // vanishes. Use the same ink as labels ([pillUseLightForeground]) for glass emphasis instead.
    val pillGlassCenterInk =
      if (pillUseLightForeground) Color.parseColor("#FAFAFA") else Color.parseColor("#111827")
    val pillGlassNeighborInk =
      ColorUtils.setAlphaComponent(pillGlassCenterInk, (255 * 0.72f).toInt().coerceIn(0, 255))
    val pillGlassInkBlend =
      if (colorGlassActiveTick.isBlank() && colorGlassActiveNeighborTick.isBlank()) {
        pillBandEase
      } else {
        0f
      }
    val centerHighlightInk =
      ColorUtils.blendARGB(cActive, pillGlassCenterInk, pillGlassInkBlend.coerceIn(0f, 1f))
    val neighborHighlightInk =
      ColorUtils.blendARGB(cActiveNeighbor, pillGlassNeighborInk, pillGlassInkBlend.coerceIn(0f, 1f))
    val highlighted =
      ColorUtils.blendARGB(
        ColorUtils.blendARGB(baseForWave, neighborHighlightInk, min(1f, neighborGlow * 0.72f)),
        centerHighlightInk,
        min(1f, centerGlow * 0.96f),
      )
    // Width is fully driven by the smooth `barWidthPx` formula above; thickness pulses with the
    // same boost as WeightRuler (`tickWidth * (1 + 0.6 * boost)`) so the snapped tick reads
    // crisply without the prior wave-driven horizontal shimmer fighting the length animation.
    val thicknessPulse = 1f + HR_GLASS_STROKE_PULSE * hrBoost
    val translationX =
      tickNudgePx * wave + centerNudgePx * centerGlow + neighborNudgePx * neighborGlow
    // Grow width around the bar midpoint so pulse animation does not shove the tick toward +X.
    val barCenterX = barStartPx + translationX + barWidthPx / 2f
    val rect =
      RectF(
        barCenterX - barWidthPx / 2f,
        centerY - (tickThicknessPx * thicknessPulse / 2f),
        barCenterX + barWidthPx / 2f,
        centerY + (tickThicknessPx * thicknessPulse / 2f),
      )
    clampTickBarRectToRow(rect, row.width.toFloat())
    val tickAlpha = ((highlighted ushr 24) and 0xFF) * pillCapsuleEdgeFade
    barPaint.color = ColorUtils.setAlphaComponent(highlighted, tickAlpha.toInt().coerceIn(0, 255))
    canvas.drawRoundRect(rect, rect.height() / 2f, rect.height() / 2f, barPaint)

    val glassLabel =
      if (unit == "ft") formatImperialLabel(imperialMaxInches() - i) else glassMetricLabel(rangeMax - i * step)
    var label = if (baseLabel.isNotEmpty()) baseLabel else if (glassLabelPresence > 0.08f) glassLabel else ""
    if (label.isEmpty() && alwaysLabel) {
      label = glassLabel
    }
    if (label.isNotEmpty() || alwaysLabel) {
      // Major grid labels on the rows adjacent to the snapped center (e.g. 230 vs 228 around 229) must
      // use the same alpha/ink/geometry as static glass neighbors — not the higher floor used for the center major.
      val isPillSideNeighbor = abs(i - snapLabel) == 1
      val unifySideNeighborMajorAsGlass = isPillSideNeighbor && baseLabel.isNotEmpty()
      // Tighter center peak + larger max scale so the snapped value reads clearly vs neighbors in the pill.
      val labelCenterGlow = exp(-((dist / 0.52f).toDouble().pow(2.0))).toFloat()
      val labelNeighborGlow = exp(-(((dist - 1f) / 0.72f).toDouble().pow(2.0))).toFloat()
      // WeightRuler-style stronger differential — center label clearly dominates, ±1 neighbors
      // visibly shrink so the snapped value reads as the focal point inside the pill band.
      val labelScale =
        1f + (HR_GLASS_LABEL_CENTER_BOOST * labelCenterGlow) -
          (HR_GLASS_LABEL_NEIGHBOR_SHRINK * labelNeighborGlow)
      val labelAlpha =
        when {
          unifySideNeighborMajorAsGlass -> glassLabelPresence
          baseLabel.isNotEmpty() || alwaysLabel -> max(0.78f, 1f - (0.18f * labelNeighborGlow))
          else -> glassLabelPresence
        }
      val inkOutside = ColorUtils.blendARGB(cMajor, cMid, min(1f, labelNeighborGlow * 0.82f))
      val inkPill =
        if (pillUseLightForeground) Color.parseColor("#FAFAFA") else Color.parseColor("#111827")
      var inkBase = ColorUtils.blendARGB(inkOutside, inkPill, pillBandEase)
      if (colorGlassCenterLabel.isNotBlank()) {
        val accent = parseColor(colorGlassCenterLabel)
        inkBase = ColorUtils.blendARGB(inkBase, accent, labelCenterGlow.coerceIn(0f, 1f))
      }
      textPaint.color =
        ColorUtils.setAlphaComponent(
          inkBase,
          (255f * labelAlpha * pillCapsuleEdgeFade).toInt().coerceIn(0, 255),
        )
      textPaint.textSize = baseTextSizePx * labelScale
      val fm = textPaint.fontMetrics
      val labelBaseline = centerY - ((fm.ascent + fm.descent) / 2f)
      // Vertical nudge in the pill only. Strong pull toward center was pushing neighbors outside the
      // row bounds (View clip cannot expand past the row rect — setClipBounds is intersected with size).
      val labelSpreadPx = pillLabelSpreadPx()
      val neighborVerticalEase = (1f - 0.5f * labelNeighborGlow).coerceIn(0.38f, 1f)
      val labelDy =
        (i - centerPosition) *
          labelSpreadPx *
          min(1f, glassLabelPresence * 1.2f) *
          pillBandEase *
          neighborVerticalEase
      // Dominant center value stays shifted left; neighbors (low labelCenterGlow) barely move.
      val labelScrollLeftPx = dp(7.0)
      val labelDx = -labelScrollLeftPx * labelCenterGlow
      val labelLeadingBreathingPx = dp(LABEL_PILL_LEADING_BREATHING_DP) * labelCenterGlow
      canvas.drawText(
        label,
        labelRightPx + labelDx + labelLeadingBreathingPx,
        labelBaseline + labelDy,
        textPaint,
      )
      textPaint.textSize = baseTextSizePx
    }
  }

  private fun pillCornerRadiusPx(glassH: Float): Float {
    val cap = glassH / 2f
    val r = if (glassPillBorderRadius > 0) dp(glassPillBorderRadius) else dp(16.0)
    return min(r, cap)
  }

  /** DP → px; shared with [computedPillHeightPx] so pill height matches max [labelDy]. */
  private fun pillLabelSpreadPx(): Float = dp(2.0)

  /**
   * Fits the three label baselines (±1 row from center) plus max scale and [labelDy] spread, with padding
   * so glyphs are not clipped by the rounded rect.
   */
  // NOTE: the pill height computation (next function) intentionally still uses the prior
  // `TICK_WAVE_STRENGTH`-based scaleY upper bound. The new `thicknessPulse` peaks at
  // `1 + HR_GLASS_STROKE_PULSE = 1.6`, which is well within the wave-derived pill height
  // headroom (gainY * 1.32 + 1 reaches ≈1.13 for majors), so capsule layout stays unchanged.
  private fun computedPillHeightPx(): Float {
    if (baseTextSizePx <= 0f || itemSizePx <= 0f) {
      return dp(56.0)
    }
    val pitch = itemSizePx
    // Match drawTickRow max |labelDy|: ~ |i−center| × spread × 1.2; allow fractional index while scrolling.
    val spreadMax = pillLabelSpreadPx() * 1.2f * 1.28f
    val save = textPaint.textSize
    textPaint.textSize = baseTextSizePx * 1.15f
    val fm = textPaint.fontMetrics
    val lineBox = fm.descent - fm.ascent
    textPaint.textSize = save
    val padV = dp(11.0)
    val glyphSlack = dp(2.5)
    return (2f * pitch + lineBox + 2f * spreadMax + padV + glyphSlack).coerceAtLeast(dp(48.0))
  }

  /** Keeps animated tick bars inside the row when wave/nudge would exceed the laid-out width. */
  private fun clampTickBarRectToRow(rect: RectF, rowW: Float) {
    if (rowW <= 1f) return
    val slop = dp(1.25)
    val maxR = rowW - slop
    if (rect.right <= maxR) return
    val wBar = (rect.right - rect.left).coerceAtLeast(tickThicknessPx)
    rect.right = maxR
    rect.left = (rect.right - wBar).coerceAtLeast(slop)
    if (rect.left >= rect.right) {
      rect.left = slop
      rect.right = maxR.coerceAtLeast(rect.left + tickThicknessPx)
    }
  }

  /** Minimum width that fits the nominal track plus worst-case horizontal tick pulse and pill ink. */
  private fun computeHorizontalMinWidthPx(): Int {
    val majorPx = dp(majorTickHeight)
    val base = dp(labelColumnWidth) + dp(labelToTickGap) + majorPx
    val maxGain = 0.5f
    val maxScaleX = 1f + maxGain * TICK_WAVE_STRENGTH
    val waveExtra = majorPx * (maxScaleX - 1f) * 0.5f
    val nudgeApprox = dp(4.35) + dp(5.6) + dp(2.75)
    val strokeAndAa = glassStrokePaint.strokeWidth + dp(4.0)
    val extraTrack = dp(ANDROID_RULER_EXTRA_TRACK_DP)
    return (base + waveExtra + nudgeApprox + strokeAndAa + extraTrack).toInt()
  }

  private fun drawPillOnCanvas(canvas: Canvas) {
    if (width <= 0 || height <= 0) return
    val glassH = computedPillHeightPx() * PILL_BACKGROUND_HEIGHT_SCALE
    val rulerW = width.toFloat()
    val o = pillHorizontalOutsetPx.coerceAtLeast(0f)
    val w = rulerW + 2f * o
    val sh = glassStrokePaint.strokeWidth / 2f
    val trimOuterPad = dp(1.0)
    val innerRight = (w - trimOuterPad - sh).coerceAtLeast(sh + trimOuterPad + 2f)
    val tickColumnRightRuler =
      if (majorHPx > 0f && barStartPx > 0f) {
        barStartPx + majorHPx + trackExtraRightPx
      } else {
        rulerW - trimOuterPad - sh
      }
    val tickColumnRight = tickColumnRightRuler + o
    /** Minimum right edge so ink clears ticks; slack avoids clipping the last major. */
    val pillRightMin =
      tickColumnRight + dp(PILL_INK_SLACK_RIGHT_DP) - trimOuterPad - sh
    var fillLeft =
      (sh + trimOuterPad - dp(PILL_INK_SLACK_LEFT_DP))
        .coerceAtMost(w / 2f - 1f)
        .coerceAtLeast(0f)
    // Use the full extended canvas on the right so horizontal outsets match the left (was min(..., innerRight),
    // which stopped the fill short of the right protrusion and made the pill look heavier on the left).
    var fillRight = innerRight
    fillRight = fillRight.coerceAtLeast(pillRightMin.coerceAtLeast(fillLeft + 2f * sh + 1f))
    fillRight = min(fillRight, innerRight)
    fillLeft = min(fillLeft, fillRight - 2f * sh - 1f).coerceAtLeast(0f)
    val fillRect =
      RectF(fillLeft, (height - glassH) / 2f, fillRight, (height + glassH) / 2f)
    val cornerR = pillCornerRadiusPx(glassH)
    if (pillHasCustomFill) {
      glassPaint.color = parseColor(glassPillBackgroundColor)
      glassStrokePaint.color = glassBorderColor
    } else {
      // Theme primary when JS does not set [glassPillBackgroundColor].
      glassPaint.color =
        if (touchActive) {
          ColorUtils.blendARGB(defaultPillThemeColor, Color.WHITE, 0.06f)
        } else {
          defaultPillThemeColor
        }
      glassStrokePaint.color =
        if (ColorUtils.calculateLuminance(defaultPillThemeColor) < 0.55) {
          Color.argb(0x40, 0xFF, 0xFF, 0xFF)
        } else {
          Color.argb(0x36, 0x1F, 0x29, 0x37)
        }
    }
    canvas.drawRoundRect(fillRect, cornerR, cornerR, glassPaint)
    val strokeCorner = max(0f, cornerR - sh).coerceAtMost((fillRect.height() / 2f - sh).coerceAtLeast(0f))
    val strokeRect =
      RectF(
        fillRect.left + sh,
        fillRect.top + sh,
        fillRect.right - sh,
        fillRect.bottom - sh,
      )
    canvas.drawRoundRect(strokeRect, strokeCorner, strokeCorner, glassStrokePaint)
  }

  /** Half-grid ticks while dragging — majors use a stronger preset where the OS supports it (cf. iOS rigid/light). */
  private fun maybeMajorTickHaptic(newIdx: Int) {
    if (newIdx == lastMajorHapticScrollIndex) return
    val hadPrior = lastMajorHapticScrollIndex != null
    lastMajorHapticScrollIndex = newIdx
    if (!hadPrior || suppressMajorTickHaptic || !isHalfGridTickIndex(newIdx)) return
    val isMajor = isMajorTickIndex(newIdx)
    val haptic =
      when {
        isMajor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ->
          HapticFeedbackConstants.CLOCK_TICK
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
          HapticFeedbackConstants.SEGMENT_FREQUENT_TICK
        else ->
          HapticFeedbackConstants.KEYBOARD_TAP
      }
    performHapticFeedback(haptic, HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING)
  }

  private fun dp(v: Double): Float = PixelUtil.toPixelFromDIP(v.toFloat())
  private fun sp(v: Double): Float =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, v.toFloat(), resources.displayMetrics)

  private fun emit(event: String, map: WritableMap?) {
    (context as? ReactContext) ?: return
    val vid = id
    if (vid == NO_ID) return
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(UIManagerHelper.getReactContext(this), vid) ?: return
    dispatcher.dispatchEvent(HeightRulerEvent(UIManagerHelper.getSurfaceId(this), vid, event, map))
  }

  private fun emitValue(value: String) {
    if (value == lastEmittedValue) return
    lastEmittedValue = value
    emit("topValueChange", Arguments.createMap().apply { putString("value", value) })
  }

  private fun emitEmpty(event: String) {
    emit(event, Arguments.createMap())
  }

  private fun valueToIndex(v: Double): Int {
    return if (unit == "ft") {
      val hi = imperialMaxInches()
      val lo = imperialMinInchesRounded()
      val ti = round(v * 12.0).toInt().coerceIn(lo, hi)
      (hi - ti).coerceIn(0, totalSteps)
    } else {
      round((rangeMax - v) / step).toInt().coerceIn(0, totalSteps)
    }
  }

  private fun heightCmForIndex(idx: Int): Double {
    return if (unit == "ft") {
      (imperialMaxInches() - idx) * HeightRulerNativeBounds.CM_PER_FOOT / 12.0
    } else {
      rangeMax - idx * step
    }
  }

  private fun valueToIndexFromCm(cm: Double): Int {
    return if (unit == "ft") {
      val hi = imperialMaxInches()
      val lo = imperialMinInchesRounded()
      val ti = round(cm * 12.0 / HeightRulerNativeBounds.CM_PER_FOOT).toInt().coerceIn(lo, hi)
      (hi - ti).coerceIn(0, totalSteps)
    } else {
      valueToIndex(round(cm))
    }
  }

  private fun emitStringForIndex(idx: Int): String = String.format(Locale.US, "%.2f", heightCmForIndex(idx))

  private fun formatImperialLabel(totalInches: Int): String {
    if (totalInches < imperialMinInchesRounded() || totalInches > imperialMaxInches()) return ""
    val feet = totalInches / 12
    val inches = totalInches % 12
    return "$feet′$inches″"
  }

  private fun imperialMaxInches(): Int =
    round(HeightRulerNativeBounds.CM_MAX / HeightRulerNativeBounds.CM_PER_FOOT * 12.0).toInt()

  private fun imperialMinInchesRounded(): Int =
    round(HeightRulerNativeBounds.CM_MIN / HeightRulerNativeBounds.CM_PER_FOOT * 12.0).toInt()

  /** @param indexFromMin Steps from range min: `totalSteps - rowIndex` (matches long-step majors). */
  private fun metricLabel(indexFromMin: Int, tickVal: Double): String {
    if (indexFromMin % longStepInterval != 0) return ""
    return if (abs(tickVal - round(tickVal)) < 1e-6) "${round(tickVal).toInt()}" else String.format("%.${fractionDigits}f", tickVal)
  }

  private fun glassMetricLabel(tickVal: Double): String {
    return if (abs(tickVal - round(tickVal)) < 1e-6) "${round(tickVal).toInt()}" else String.format("%.${fractionDigits}f", tickVal)
  }

  private fun isMajorTickIndex(i: Int): Boolean {
    if (i < 0 || i > totalSteps) return false
    if (unit == "ft") {
      val inches = imperialMaxInches() - i
      if (inches < imperialMinInchesRounded() || inches > imperialMaxInches()) return false
      return inches % 12 == 0
    }
    return (totalSteps - i) % longStepInterval == 0
  }

  private fun isHalfGridTickIndex(i: Int): Boolean {
    if (i < 0 || i > totalSteps) return false
    if (unit == "ft") {
      val inches = imperialMaxInches() - i
      if (inches < imperialMinInchesRounded() || inches > imperialMaxInches()) return false
      return inches % 6 == 0
    }
    return (totalSteps - i) % max(1, longStepInterval / 2) == 0
  }

  private inner class TickViewHolder(val row: TickRowView) : RecyclerView.ViewHolder(row)

  private inner class TickRowView(context: Context) : View(context) {
    var index: Int = 0

    init {
      clipToOutline = false
    }

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      drawTickRow(canvas, index, height / 2f, this)
    }
  }

  private inner class PillBackgroundView(context: Context) : View(context) {
    init {
      setWillNotDraw(false)
      setBackgroundColor(Color.TRANSPARENT)
      isClickable = false
      importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      drawPillOnCanvas(canvas)
    }
  }

}
