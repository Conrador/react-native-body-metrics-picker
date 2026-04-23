package com.reactnativebodymetricspicker

/**
 * Single source of truth for ruler extent (100–250 cm and imperial counterpart).
 * JS must not control min/max/step — always applied from native when unit is set.
 */
internal object HeightRulerNativeBounds {
  const val CM_MIN = 100.0
  const val CM_MAX = 250.0
  const val CM_PER_FOOT = 30.48

  fun applyForUnit(view: HeightRulerView, unit: String) {
    when (unit) {
      "ft" -> {
        view.rangeMin = CM_MIN / CM_PER_FOOT
        view.rangeMax = CM_MAX / CM_PER_FOOT
        view.step = 1.0 / 12.0
        view.fractionDigits = 4
        view.imperialMinInches = kotlin.math.round(CM_MIN / CM_PER_FOOT * 12.0).toInt()
      }
      else -> {
        view.rangeMin = CM_MIN
        view.rangeMax = CM_MAX
        view.step = 1.0
        view.fractionDigits = 0
        view.imperialMinInches = kotlin.math.round(CM_MIN / CM_PER_FOOT * 12.0).toInt()
      }
    }
  }
}
