package com.reactnativebodymetricspicker

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Build
import android.util.TypedValue
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewConfiguration
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import androidx.core.graphics.ColorUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import java.util.Locale
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.round
import kotlin.math.sin

private const val WEIGHT_TICK_LABEL_FONT_SIZE_SP = 14.0

// Glass animation tuning constants (mirror the iOS values in WeightRulerUIKitView.swift).
private const val GLASS_UNIFIED_BONUS_DP = 4.0      // extra dp added to the longest snapped tick
private const val GLASS_LIFT_MAX_DP = 0.0           // ticks only grow/shrink — no radial lift animation
private const val GLASS_BOOST_SIGMA = 1.1           // Gaussian width of the snap boost (smaller = steeper falloff)
private const val GLASS_UNIFORM_SIGMA = 2.0         // wider Gaussian — strength of "treat as uniform" pull under the glass
private const val GLASS_LABEL_SPREAD = 2.0f         // visual angular multiplier for the 3 glass labels
private const val GLASS_CORNER_RADIUS_DP = 9.0      // rounded corner radius for the arc-band
private const val GLASS_STATIC_FADE_BAND = 0.55     // angular fade halo (in step-units) on each side of the band edge
// Extra radial padding (dp) that pushes the entire glass band outward — visually UP — so it sits
// a bit higher above the tick tips and the static labels below have more breathing room.
private const val GLASS_RADIAL_OFFSET_DP = 8.0

private class WeightRulerEvent(
  surfaceId: Int,
  viewTag: Int,
  private val name: String,
  private val payload: WritableMap?,
) : Event<WeightRulerEvent>(surfaceId, viewTag) {
  override fun getEventName() = name
  override fun getEventData() = payload ?: Arguments.createMap()
}

private fun parseColor(s: String?): Int {
  if (s.isNullOrBlank()) return Color.GRAY
  val t = s.trim()
  if (t == "transparent") return Color.TRANSPARENT
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

class WeightRulerView(context: Context) : FrameLayout(context) {
  var unit: String = "kg"
  var rangeMin: Double = 50.0
  var rangeMax: Double = 250.0
  var step: Double = 1.0
  var fractionDigits: Int = 0
  var longStepInterval: Int = 10

  var initialValue: Double = 75.0
  var tickSpacingPx: Double = 12.0
  var minorTickHeight: Double = 14.0
  var midTickHeight: Double = 22.0
  var majorTickHeight: Double = 32.0
  var tickWidth: Double = 1.5
  var arcCenterOffset: Double = 240.0
  var fontFamily: String? = null

  var colorTick: String = "#D1D5DB"
  var colorMidTick: String = "#6B7280"
  var colorMajorTick: String = "#111827"
  var colorActiveTick: String = "#FFD60A"
  var colorActiveNeighborTick: String = "rgba(255, 214, 10, 0.72)"
  var colorGlassCenterLabel: String = ""
  var glassPillBackgroundColor: String = ""
  var glassPillBorderColor: String = ""
  /** `0` = derive a clearly horizontal angular span from `tickSpacingPx` (~3 labels + side overhang). */
  var glassArcHalfAngle: Double = 0.0
  /** Extra dp above the labels where the outer edge of the glass band sits. */
  var glassOuterPadding: Double = 10.0
  /** Vertical room (dp) for the labels rendered **above** the tick tips, under the glass. */
  var glassLabelArea: Double = 22.0
  var glassLabelFontSize: Double = 18.0
  var colorTrack: String = ""

  /** Continuous (un-snapped) value driven by gesture / inertia / snap. */
  private var liveValue: Double = 75.0
  private var lastSyncedInitialValue: Double = Double.NaN
  private var hasAppeared = false

  private var lastEmittedValue: String? = null
  private var lastTickHapticIndex: Int? = null
  private var lastEmitMs: Long = 0

  private val arcView = ArcView(context)
  private var velocityTracker: VelocityTracker? = null
  private var inertialAnimator: ValueAnimator? = null
  private var snapAnimator: ValueAnimator? = null
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private var lastTouchX: Float = 0f
  private var hasDragStarted = false

  private val tickPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeCap = Paint.Cap.ROUND
  }
  private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    textAlign = Paint.Align.CENTER
  }
  private val glassFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
  }
  private val glassStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
  }
  private val glassLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    textAlign = Paint.Align.CENTER
  }

  init {
    setWillNotDraw(false)
    clipChildren = false
    isClickable = true
    isFocusable = false
    isHapticFeedbackEnabled = true
    addView(arcView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun applyPropsAndInvalidate() {
    val track = colorTrack.trim()
    val bg = if (track.isNotEmpty() && track != "transparent") parseColor(track) else Color.TRANSPARENT
    setBackgroundColor(bg)
    if (!hasAppeared || lastSyncedInitialValue != initialValue) {
      lastSyncedInitialValue = initialValue
      liveValue = snappedValue(initialValue)
      hasAppeared = true
      cancelAllAnimations()
      emitValue(emitStringForValue(liveValue))
    }
    arcView.invalidate()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    cancelAllAnimations()
    velocityTracker?.recycle()
    velocityTracker = null
  }

  // ---- Geometry / value math ----

  private fun snappedValue(v: Double): Double {
    val clamped = min(max(v, rangeMin), rangeMax)
    val q = round((clamped - rangeMin) / step)
    return min(max(rangeMin + q * step, rangeMin), rangeMax)
  }

  private fun valueToIndex(v: Double): Int {
    val s = snappedValue(v)
    return round((s - rangeMin) / step).toInt()
  }

  private fun valueForIndex(idx: Int): Double {
    val span = max(0, round((rangeMax - rangeMin) / step).toInt())
    return rangeMin + min(max(idx, 0), span) * step
  }

  private fun emitStringForValue(v: Double): String =
    String.format(Locale.US, "%.2f", snappedValue(v))

  private fun isMajor(v: Double): Boolean {
    val stepsFromMin = round((v - rangeMin) / step).toInt()
    return longStepInterval > 0 && stepsFromMin % longStepInterval == 0
  }

  private fun isMid(v: Double): Boolean {
    if (isMajor(v)) return false
    val half = max(1, longStepInterval / 2)
    val stepsFromMin = round((v - rangeMin) / step).toInt()
    return stepsFromMin % half == 0
  }

  private fun valuePxAtArc(): Float {
    val spacing = max(0.1f, dp(tickSpacingPx))
    val stepsPerUnit = (1.0 / max(0.0001, step)).toFloat()
    return spacing * stepsPerUnit
  }

  private fun rubberBand(value: Double): Double {
    val band = max(2.0, step * 4.0)
    if (value < rangeMin) {
      val over = rangeMin - value
      return rangeMin - band * (1.0 - 1.0 / (1.0 + over / band))
    }
    if (value > rangeMax) {
      val over = value - rangeMax
      return rangeMax + band * (1.0 - 1.0 / (1.0 + over / band))
    }
    return value
  }

  // ---- Pan / motion ----

  override fun onTouchEvent(ev: MotionEvent): Boolean {
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        cancelAllAnimations()
        velocityTracker?.recycle()
        velocityTracker = VelocityTracker.obtain()
        velocityTracker?.addMovement(ev)
        lastTouchX = ev.x
        hasDragStarted = false
        parent?.requestDisallowInterceptTouchEvent(true)
        return true
      }
      MotionEvent.ACTION_MOVE -> {
        velocityTracker?.addMovement(ev)
        val dx = ev.x - lastTouchX
        if (!hasDragStarted) {
          if (abs(dx) < touchSlop) return true
          hasDragStarted = true
          emitEmpty("topScrollBegin")
        }
        lastTouchX = ev.x
        // Drag right (dx > 0) → liveValue decreases (lower values rotate under the pointer).
        val dValue = -dx / valuePxAtArc()
        liveValue = rubberBand(liveValue + dValue)
        handleHapticsForLive()
        emitThrottled()
        arcView.invalidate()
        return true
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        velocityTracker?.addMovement(ev)
        velocityTracker?.computeCurrentVelocity(1000)
        val vx = velocityTracker?.xVelocity ?: 0f
        velocityTracker?.recycle()
        velocityTracker = null
        parent?.requestDisallowInterceptTouchEvent(false)
        if (!hasDragStarted) {
          // Tap with no drag — finalize current snap.
          startSnapToNearest()
          return true
        }
        // Convert px/sec → value-units/sec.
        val valueVelocity = -vx / valuePxAtArc()
        if (abs(valueVelocity) > 60f) {
          startInertia(valueVelocity.toDouble())
        } else {
          startSnapToNearest()
        }
        return true
      }
    }
    return super.onTouchEvent(ev)
  }

  private fun cancelAllAnimations() {
    inertialAnimator?.cancel()
    inertialAnimator = null
    snapAnimator?.cancel()
    snapAnimator = null
  }

  private fun startInertia(initialVelocity: Double) {
    cancelAllAnimations()
    var velocity = initialVelocity
    val friction = 3.6
    val anim = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 1200
      interpolator = DecelerateInterpolator()
    }
    var lastTime = System.nanoTime()
    anim.addUpdateListener {
      val now = System.nanoTime()
      val dt = max(0.0001, (now - lastTime) / 1_000_000_000.0)
      lastTime = now
      velocity *= exp(-friction * dt)
      liveValue += velocity * dt
      val lo = rangeMin
      val hi = rangeMax
      if (liveValue <= lo - 0.5 || liveValue >= hi + 0.5 || abs(velocity) < 1.0) {
        liveValue = min(max(liveValue, lo), hi)
        anim.cancel()
        startSnapToNearest()
        return@addUpdateListener
      }
      handleHapticsForLive()
      emitThrottled()
      arcView.invalidate()
    }
    anim.addListener(object : android.animation.AnimatorListenerAdapter() {
      override fun onAnimationEnd(animation: android.animation.Animator) {
        if (inertialAnimator === anim && snapAnimator == null) {
          startSnapToNearest()
        }
      }
    })
    inertialAnimator = anim
    anim.start()
  }

  private fun startSnapToNearest() {
    cancelAllAnimations()
    val target = snappedValue(liveValue)
    if (abs(target - liveValue) < 0.001) {
      finalizeSnap(target)
      return
    }
    val start = liveValue
    val anim = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 220
      interpolator = DecelerateInterpolator()
    }
    anim.addUpdateListener {
      val t = it.animatedFraction.toDouble()
      val eased = 1.0 - Math.pow(1.0 - t, 3.0)
      liveValue = start + (target - start) * eased
      handleHapticsForLive()
      emitThrottled()
      arcView.invalidate()
    }
    anim.addListener(object : android.animation.AnimatorListenerAdapter() {
      override fun onAnimationEnd(animation: android.animation.Animator) {
        if (snapAnimator === anim) finalizeSnap(target)
      }
    })
    snapAnimator = anim
    anim.start()
  }

  private fun finalizeSnap(target: Double) {
    liveValue = target
    cancelAllAnimations()
    emitValue(emitStringForValue(target))
    emitEmpty("topScrollEnd")
    arcView.invalidate()
  }

  private fun handleHapticsForLive() {
    val idx = valueToIndex(liveValue)
    if (idx == lastTickHapticIndex) return
    val hadPrior = lastTickHapticIndex != null
    lastTickHapticIndex = idx
    if (!hadPrior) return
    val v = valueForIndex(idx)
    val haptic = when {
      isMajor(v) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ->
        HapticFeedbackConstants.CLOCK_TICK
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
        HapticFeedbackConstants.SEGMENT_FREQUENT_TICK
      else ->
        HapticFeedbackConstants.KEYBOARD_TAP
    }
    performHapticFeedback(haptic, HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING)
  }

  private fun emitThrottled() {
    val now = System.currentTimeMillis()
    if (now - lastEmitMs < 40) return
    lastEmitMs = now
    emitValue(emitStringForValue(liveValue))
  }

  private fun emit(event: String, map: WritableMap?) {
    (context as? ReactContext) ?: return
    val vid = id
    if (vid == NO_ID) return
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(
      UIManagerHelper.getReactContext(this),
      vid,
    ) ?: return
    dispatcher.dispatchEvent(WeightRulerEvent(UIManagerHelper.getSurfaceId(this), vid, event, map))
  }

  private fun emitValue(value: String) {
    if (value == lastEmittedValue) return
    lastEmittedValue = value
    emit("topValueChange", Arguments.createMap().apply { putString("value", value) })
  }

  private fun emitEmpty(event: String) {
    emit(event, Arguments.createMap())
  }

  private fun resolveTickLabelTypeface(): Typeface {
    val ff = fontFamily?.takeIf { it.isNotBlank() }
      ?: return Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    return try {
      ReactFontManager.getInstance().getTypeface(ff, Typeface.NORMAL, context.assets)
    } catch (_: Throwable) {
      Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
  }

  private fun dp(v: Double): Float = PixelUtil.toPixelFromDIP(v.toFloat())
  private fun sp(v: Double): Float =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, v.toFloat(), resources.displayMetrics)

  /**
   * Inner view that performs the arc drawing — separated from the FrameLayout host so the background
   * `colorTrack` paints in the host while the canvas overlays the arc + glass.
   */
  private inner class ArcView(context: Context) : View(context) {
    private val glassPath = Path()
    private val arcRect = RectF()

    init {
      setBackgroundColor(Color.TRANSPARENT)
      isClickable = false
      isFocusable = false
      importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    private fun arcCenter(): PointF {
      val cx = width / 2f
      val cy = height.toFloat() + max(40f, dp(arcCenterOffset))
      return PointF(cx, cy)
    }

    /**
     * Vertical reserve (dp) above the arc edge that fits ticks pointing outward,
     * the snap-driven lift + unified bonus and the glass top padding. Labels live INSIDE the arc
     * face (deeper toward the arc center) so they do not consume space above the tick tips.
     */
    private fun topRadialReservePx(): Float {
      return dp(majorTickHeight) +
        dp(GLASS_UNIFIED_BONUS_DP) +
        dp(GLASS_LIFT_MAX_DP) +
        max(0f, dp(glassOuterPadding)) +
        dp(GLASS_RADIAL_OFFSET_DP) +
        dp(4.0)
    }

    private fun arcRadius(): Float {
      val center = arcCenter()
      val r = center.y - 0f - topRadialReservePx()
      return max(40f, r)
    }

    /**
     * Visual reference value used by all rendering math — clamped to the configured `[rangeMin,
     * rangeMax]` window so the snapped boundary tick stays visually centered while the user
     * rubber-bands past the edge. The underlying `liveValue` keeps overshooting so the gesture
     * still feels springy, but ticks/labels never animate past the boundary.
     */
    private fun displayLiveValue(): Double = min(max(liveValue, rangeMin), rangeMax)

    private fun angleFor(v: Double, radius: Float): Float {
      val angleStep = (dp(tickSpacingPx) / radius / max(0.0001f, step.toFloat())).toFloat()
      return (-Math.PI.toFloat() / 2f) + ((v - displayLiveValue()).toFloat() * angleStep)
    }

    /** Half angular span of the glass arc band — derives from `tickSpacingPx` when JS passes 0. */
    private fun glassHalfAngle(radius: Float): Float {
      if (glassArcHalfAngle > 0) return glassArcHalfAngle.toFloat()
      val perStep = (dp(tickSpacingPx) / radius / max(0.0001f, step.toFloat())).toFloat()
      // 3.0 step-spans on each side so the band stays clearly wider than tall.
      return perStep * (3.0f * step.toFloat())
    }

    /**
     * Snap-centered boost (in [0, 1]) used uniformly for tick growth, stroke bump and lift.
     * Gaussian falloff so the snapped tick is clearly the tallest and neighbors taper down sharply
     * (peak 1.0 at snap, ~0.44 at ±1 step, ~0.04 at ±2 steps, ~0 at ±3 steps).
     */
    private fun glassSnapBoost(distSteps: Double): Double {
      val d = abs(distSteps)
      if (d > 3.0) return 0.0
      return exp(-(d / GLASS_BOOST_SIGMA).pow(2.0))
    }

    /**
     * Wider Gaussian weight used to treat ticks UNIFORMLY under the glass — a major neighbor
     * gets visually pulled down toward the minor base length so it doesn't tower over its peers.
     */
    private fun glassUniformWeight(distSteps: Double): Double {
      val d = abs(distSteps)
      if (d > 4.0) return 0.0
      return exp(-(d / GLASS_UNIFORM_SIGMA).pow(2.0))
    }

    /**
     * `1` when a value is fully under the glass band (so the static label is hidden), `0` outside,
     * smooth crossfade across the band edge so static labels fade in/out as the band slides.
     */
    private fun glassCoverage(distSteps: Double, radius: Float): Double {
      val halfA = glassHalfAngle(radius).toDouble()
      val angleStep = (dp(tickSpacingPx) / radius / max(0.0001f, step.toFloat())).toDouble()
      val halfSteps = halfA / max(0.0001, angleStep) / max(0.0001, step)
      val d = abs(distSteps)
      val band = GLASS_STATIC_FADE_BAND
      val lo = max(0.0, halfSteps - band)
      val hi = halfSteps + band
      if (d <= lo) return 1.0
      if (d >= hi) return 0.0
      val t = (d - lo) / (hi - lo)
      val smooth = t * t * (3 - 2 * t)
      return 1.0 - smooth
    }

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      if (width <= 0 || height <= 0) return
      val center = arcCenter()
      val radius = arcRadius()

      val baseColor = parseColor(colorTick)
      val midColor = parseColor(colorMidTick)
      val majorColor = parseColor(colorMajorTick)
      val activeColor = parseColor(colorActiveTick)
      val neighborColor = parseColor(colorActiveNeighborTick)

      labelPaint.typeface = resolveTickLabelTypeface()
      labelPaint.textSize = sp(WEIGHT_TICK_LABEL_FONT_SIZE_SP)

      val halfWidth = width / 2f
      val visibleHalfAngle = atan2(halfWidth + 60f, max(1f, radius - 8f))

      // Use the clamped (in-range) reference value so the boundary tick stays the snapped one and
      // its label/length doesn't visually animate while the user overdrags past the edge.
      val visualLive = displayLiveValue()
      val snapIdx = valueToIndex(visualLive)
      // Static major labels live INSIDE the arc face (deeper toward arc center) — `glassLabelArea`
      // controls how far below the arc edge the label center sits.
      val staticLabelRadius = max(40f, radius - dp(glassLabelArea) * 0.5f - dp(4.0))
      val unifiedTargetLen = dp(majorTickHeight) + dp(GLASS_UNIFIED_BONUS_DP)

      // Android renders a SOLID glass band (no frosted translucency like iOS), so we paint it in
      // two phases around the tick loop: FILL goes first (so ticks animate visibly on top of the
      // solid surface) and STROKE goes last (so the border always crowns the ticks instead of
      // being overdrawn at the band edge — keeps the pill outline crisp).
      drawGlassBandFill(canvas, center, radius)

      val lo = round(rangeMin).toInt()
      val hi = round(rangeMax).toInt()
      val stepInt = max(1, round(step).toInt())
      var v = lo
      while (v <= hi) {
        val angle = angleFor(v.toDouble(), radius)
        val deltaAngle = abs(angle - (-Math.PI.toFloat() / 2f))
        if (deltaAngle > visibleHalfAngle) {
          v += stepInt
          continue
        }

        val cosA = cos(angle.toDouble()).toFloat()
        val sinA = sin(angle.toDouble()).toFloat()
        val isMajorT = isMajor(v.toDouble())
        val isMidT = isMid(v.toDouble())

        val baseLen = when {
          isMajorT -> dp(majorTickHeight)
          isMidT -> dp(midTickHeight)
          else -> dp(minorTickHeight)
        }
        val dValue = v.toDouble() - visualLive
        val dStep = dValue / max(0.0001, step)
        // Snap boost — drives length, stroke bump and lift uniformly.
        val boost = glassSnapBoost(dStep).toFloat()
        // Wider weight that pulls every tick under the glass toward the minor baseline so a MAJOR
        // landing on a neighbor slot doesn't keep its full natural height (it should look like its peers).
        val uniform = glassUniformWeight(dStep).toFloat()
        val glassFloor = dp(minorTickHeight)
        val suppressedBase = baseLen + (glassFloor - baseLen) * uniform
        val mixedLen = suppressedBase + (unifiedTargetLen - suppressedBase) * boost
        // Lift the entire tick OUTWARD from the arc center — snapped highest, neighbors slightly lower.
        val lift = dp(GLASS_LIFT_MAX_DP) * boost
        val inner = radius + lift
        val outer = inner + mixedLen
        val pBaseX = center.x + cosA * inner
        val pBaseY = center.y + sinA * inner
        val pTipX = center.x + cosA * outer
        val pTipY = center.y + sinA * outer

        val baseInk = when {
          isMajorT -> majorColor
          isMidT -> midColor
          else -> baseColor
        }
        val valueIndex = valueToIndex(v.toDouble())
        val distSnap = abs(valueIndex - snapIdx)
        val ink = when (distSnap) {
          0 -> {
            val frac = max(0f, 1f - abs(dValue / max(0.5, step)).toFloat())
            ColorUtils.blendARGB(baseInk, activeColor, frac.coerceIn(0f, 1f))
          }
          1 -> ColorUtils.blendARGB(baseInk, neighborColor, 0.45f)
          else -> baseInk
        }

        tickPaint.color = ink
        tickPaint.strokeWidth = (dp(tickWidth) * (1f + 0.6f * boost)).coerceAtLeast(1f)
        canvas.drawLine(pBaseX, pBaseY, pTipX, pTipY, tickPaint)

        // Static major labels — drawn INSIDE the arc face (between arc edge and arc center). Alpha
        // smoothly fades to 0 while the glass band slides over them and back to ~0.85 once they
        // leave the band.
        if (isMajorT) {
          val coverage = glassCoverage(dStep, radius).toFloat()
          val alpha = max(0f, 1f - coverage) * 0.85f
          if (alpha > 0.01f) {
            val ink255 = (alpha * 255f).toInt().coerceIn(0, 255)
            drawRadialLabel(
              canvas = canvas,
              text = labelFor(v.toDouble()),
              cx = center.x,
              cy = center.y,
              radius = staticLabelRadius,
              angle = angle,
              color = ColorUtils.setAlphaComponent(majorColor, ink255),
              paint = labelPaint,
            )
          }
        }
        v += stepInt
      }

      drawGlassBandStroke(canvas)
      drawGlassLabels(canvas, center, radius, snapIdx, visualLive, activeColor, majorColor)
    }

    /**
     * Builds the arc-band path and paints the **fill** only. Called BEFORE the tick loop so ticks
     * render on top of the solid surface (otherwise the fill would hide the tick animation).
     * The stroke (border) is intentionally deferred to [drawGlassBandStroke] which runs AFTER the
     * tick loop, so the border always crowns the ticks instead of being clipped by them.
     */
    private fun drawGlassBandFill(canvas: Canvas, center: PointF, radius: Float) {
      val halfA = glassHalfAngle(radius)
      // Outer edge sits ABOVE the maximum lifted tick tip with a small padding.
      val maxLiftedTipR = radius + dp(GLASS_LIFT_MAX_DP) + dp(majorTickHeight) + dp(GLASS_UNIFIED_BONUS_DP)
      val outerR = maxLiftedTipR + max(2f, dp(glassOuterPadding)) + dp(GLASS_RADIAL_OFFSET_DP)
      // Inner edge sits BELOW the inside-the-arc labels, with room for the centered (largest) label.
      // Same `GLASS_RADIAL_OFFSET_DP` is added so the band shifts as a whole instead of stretching.
      val labelHalfHeight = sp(glassLabelFontSize) * 0.65f
      val innerR = max(
        40f,
        radius - dp(glassLabelArea) - labelHalfHeight -
          max(2f, dp(glassOuterPadding)) + dp(GLASS_RADIAL_OFFSET_DP),
      )

      val topAngleRad = -PI.toFloat() / 2f
      val leftAngle = topAngleRad - halfA
      val rightAngle = topAngleRad + halfA

      buildRoundedGlassPath(center, leftAngle, rightAngle, outerR, innerR, dp(GLASS_CORNER_RADIUS_DP))

      val customFill = glassPillBackgroundColor.takeIf { it.isNotBlank() }?.let { parseColor(it) }
      // Android intentionally drops the iOS "frosted glass" look — translucency reads as a render
      // bug on most Android cards. Default to a solid Material-ish neutral pill so it sits cleanly
      // on white surfaces. Consumers can fully override via `glassPillBackgroundColor`.
      val fillColor = customFill ?: Color.parseColor("#F1F5F9")
      glassFillPaint.color = fillColor
      canvas.drawPath(glassPath, glassFillPaint)
    }

    /**
     * Paints the band **border** on top of the path built by [drawGlassBandFill]. Called AFTER the
     * tick loop so the stroke always crowns the ticks (instead of being overdrawn by tick lines
     * crossing the band edge). Assumes `glassPath` is still populated from the fill pass.
     */
    private fun drawGlassBandStroke(canvas: Canvas) {
      val customStroke = glassPillBorderColor.takeIf { it.isNotBlank() }?.let { parseColor(it) }
      val strokeColor = customStroke ?: Color.parseColor("#CBD5E1")
      glassStrokePaint.color = strokeColor
      glassStrokePaint.strokeWidth = max(1f, dp(0.7))
      glassStrokePaint.strokeJoin = Paint.Join.ROUND
      glassStrokePaint.strokeCap = Paint.Cap.ROUND
      canvas.drawPath(glassPath, glassStrokePaint)
    }

    /**
     * Builds the arc-band path with quadratic-bezier rounded corners at the four sharp joints
     * (outer-left, outer-right, inner-right, inner-left). For very tiny bands (cornerR <= 0.5px)
     * falls back to the original sharp path.
     */
    private fun buildRoundedGlassPath(
      center: PointF,
      leftAngle: Float,
      rightAngle: Float,
      outerR: Float,
      innerR: Float,
      cornerInput: Float,
    ) {
      val halfAngle = (rightAngle - leftAngle) * 0.5f
      val radialThickness = max(0f, outerR - innerR)
      val arcLengthInner = max(0f, 2f * halfAngle * innerR)
      val cr = max(0f, min(cornerInput, min(radialThickness * 0.5f, arcLengthInner * 0.5f)))

      glassPath.reset()
      if (cr <= 0.5f) {
        // Original sharp path fallback.
        val sweepDeg = Math.toDegrees((rightAngle - leftAngle).toDouble()).toFloat()
        val leftDeg = Math.toDegrees(leftAngle.toDouble()).toFloat()
        arcRect.set(center.x - outerR, center.y - outerR, center.x + outerR, center.y + outerR)
        glassPath.arcTo(arcRect, leftDeg, sweepDeg, true)
        arcRect.set(center.x - innerR, center.y - innerR, center.x + innerR, center.y + innerR)
        glassPath.arcTo(arcRect, leftDeg + sweepDeg, -sweepDeg, false)
        glassPath.close()
        return
      }

      val outerInsetA = cr / max(outerR, 1f)
      val innerInsetA = cr / max(innerR, 1f)
      val arcLeftStart = leftAngle + outerInsetA
      val arcRightEnd = rightAngle - outerInsetA
      val arcRightStartInner = rightAngle - innerInsetA
      val arcLeftEndInner = leftAngle + innerInsetA

      fun pt(a: Float, r: Float): PointF =
        PointF(center.x + cos(a.toDouble()).toFloat() * r, center.y + sin(a.toDouble()).toFloat() * r)

      val outerStart = pt(arcLeftStart, outerR)
      val outerEndInsetOnRight = pt(rightAngle, outerR - cr)
      val innerEndInsetOnRight = pt(rightAngle, innerR + cr)
      val innerStart = pt(arcRightStartInner, innerR)
      val innerStartInsetOnLeft = pt(leftAngle, innerR + cr)
      val outerStartInsetOnLeft = pt(leftAngle, outerR - cr)

      val cornerB = pt(rightAngle, outerR)
      val cornerC = pt(rightAngle, innerR)
      val cornerD = pt(leftAngle, innerR)
      val cornerA = pt(leftAngle, outerR)

      glassPath.moveTo(outerStart.x, outerStart.y)
      // Outer arc (left → right) using arcTo with sweep.
      val outerSweepDeg = Math.toDegrees((arcRightEnd - arcLeftStart).toDouble()).toFloat()
      val outerStartDeg = Math.toDegrees(arcLeftStart.toDouble()).toFloat()
      arcRect.set(center.x - outerR, center.y - outerR, center.x + outerR, center.y + outerR)
      glassPath.arcTo(arcRect, outerStartDeg, outerSweepDeg, false)
      // Top-right corner.
      glassPath.quadTo(cornerB.x, cornerB.y, outerEndInsetOnRight.x, outerEndInsetOnRight.y)
      // Right radial side.
      glassPath.lineTo(innerEndInsetOnRight.x, innerEndInsetOnRight.y)
      // Bottom-right corner.
      glassPath.quadTo(cornerC.x, cornerC.y, innerStart.x, innerStart.y)
      // Inner arc (right → left), reversed sweep.
      val innerSweepDeg = -Math.toDegrees((arcRightStartInner - arcLeftEndInner).toDouble()).toFloat()
      val innerStartDeg = Math.toDegrees(arcRightStartInner.toDouble()).toFloat()
      arcRect.set(center.x - innerR, center.y - innerR, center.x + innerR, center.y + innerR)
      glassPath.arcTo(arcRect, innerStartDeg, innerSweepDeg, false)
      // Bottom-left corner.
      glassPath.quadTo(cornerD.x, cornerD.y, innerStartInsetOnLeft.x, innerStartInsetOnLeft.y)
      // Left radial side.
      glassPath.lineTo(outerStartInsetOnLeft.x, outerStartInsetOnLeft.y)
      // Top-left corner.
      glassPath.quadTo(cornerA.x, cornerA.y, outerStart.x, outerStart.y)
      glassPath.close()
    }

    /** Draws the snapped center value + 2 neighbors under the glass band, animated by distance. */
    private fun drawGlassLabels(
      canvas: Canvas,
      center: PointF,
      radius: Float,
      snapIdx: Int,
      visualLive: Double,
      activeColor: Int,
      majorColor: Int,
    ) {
      val centerAccent =
        if (colorGlassCenterLabel.isNotBlank()) parseColor(colorGlassCenterLabel) else activeColor
      val neighborInk = ColorUtils.blendARGB(majorColor, activeColor, 0.35f)

      val baseFontPx = sp(glassLabelFontSize)

      // Labels live INSIDE the arc face (between arc edge and arc center, lower in view space).
      val labelRadius = max(40f, radius - dp(glassLabelArea) * 0.5f - dp(4.0))
      val centerAngleRad = -PI.toFloat() / 2f

      val totalSpan = max(0, round((rangeMax - rangeMin) / step).toInt())
      val candidates = listOf(-1, 0, 1).map { snapIdx + it }.filter { it in 0..totalSpan }

      for (idx in candidates) {
        val v = valueForIndex(idx)
        val dValue = v - visualLive
        val dSteps = dValue / max(0.0001, step)
        val dist = abs(dSteps)
        if (dist > 1.6) continue

        val baseAngle = angleFor(v, radius)
        // Push the ±1 neighbors visually further left/right than their real angular position so the
        // 3 labels don't crowd the centered value.
        val angle = centerAngleRad + (baseAngle - centerAngleRad) * GLASS_LABEL_SPREAD
        val centerGlow = exp(-(dist / 0.55).pow(2.0))
        val neighborGlow = exp(-((dist - 1.0) / 0.55).pow(2.0))
        // Stronger size differential — snap goes up to ~1.30, neighbors shrink to ~0.75 — so the
        // selected value clearly dominates and the ±1 neighbors read as quiet hints.
        val baseScale = 0.65f
        val scale = baseScale + 0.65f * centerGlow.toFloat() + 0.10f * neighborGlow.toFloat()
        val presence = if (dist < 0.5) 1.0 else max(0.0, 1.0 - (dist - 0.5) / 1.1)
        if (presence <= 0.001) continue

        val baseInk = ColorUtils.blendARGB(neighborInk, centerAccent, centerGlow.toFloat().coerceIn(0f, 1f))
        // Snap stays fully opaque; neighbors drop sharply so they don't compete visually with the snap.
        val alpha = (max(0.40, 1.0 - 0.7 * dist) * presence * 255.0).toInt().coerceIn(0, 255)
        val ink = ColorUtils.setAlphaComponent(baseInk, alpha)

        glassLabelPaint.color = ink
        glassLabelPaint.textSize = baseFontPx * scale
        // Heavier weight on the snap label, lighter on neighbors — extra typographic separation.
        val baseTypeface = resolveTickLabelTypeface()
        glassLabelPaint.typeface = if (dist < 0.5) {
          Typeface.create(baseTypeface, Typeface.BOLD)
        } else {
          Typeface.create(baseTypeface, Typeface.NORMAL)
        }

        drawRadialLabel(
          canvas = canvas,
          text = labelFor(v),
          cx = center.x,
          cy = center.y,
          radius = labelRadius,
          angle = angle,
          color = ink,
          paint = glassLabelPaint,
        )
      }
    }

    private fun labelFor(v: Double): String {
      return if (abs(v - round(v)) < 1e-6) "${round(v).toInt()}"
      else String.format(Locale.US, "%.${fractionDigits}f", v)
    }

    private fun drawRadialLabel(
      canvas: Canvas,
      text: String,
      cx: Float,
      cy: Float,
      radius: Float,
      angle: Float,
      color: Int,
      paint: Paint,
    ) {
      val cosA = cos(angle.toDouble()).toFloat()
      val sinA = sin(angle.toDouble()).toFloat()
      val x = cx + cosA * radius
      val y = cy + sinA * radius
      paint.color = color
      val save = canvas.save()
      canvas.translate(x, y)
      val degrees = Math.toDegrees(angle.toDouble()).toFloat() + 90f
      canvas.rotate(degrees)
      val fm = paint.fontMetrics
      val baselineY = -((fm.ascent + fm.descent) / 2f)
      canvas.drawText(text, 0f, baselineY, paint)
      canvas.restoreToCount(save)
    }
  }
}
