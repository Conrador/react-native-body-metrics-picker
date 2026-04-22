import SwiftUI
import UIKit

/// Selection pill: clear liquid-glass look (transparent fill + sheen + rim + hairlines).
struct RulerLiquidGlassOverlay: View {
  let width: CGFloat
  let height: CGFloat
  let surface: Color
  let border: Color
  let sheen: Color
  let rim: Color
  let liquidBorder: Color
  let reduceTransparency: Bool
  let isInMotion: Bool

  var body: some View {
    Group {
      if reduceTransparency {
        Capsule()
          .fill(surface.opacity(isInMotion ? 0.16 : 0.3))
          .overlay(Capsule().stroke(border, lineWidth: 1))
      } else {
        RulerLiquidGlassFallback(
          surface: surface,
          border: border,
          sheen: sheen,
          rim: rim,
          liquidBorder: liquidBorder,
          isInMotion: isInMotion
        )
      }
    }
    .frame(width: width, height: height)
    // Shape morph while moving: wider + flatter, then settle back.
    .scaleEffect(x: isInMotion ? 1.04 : 1.0, y: isInMotion ? 0.93 : 1.0)
    .offset(y: isInMotion ? -0.6 : 0)
    .animation(.linear(duration: 0.06), value: isInMotion)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// Layered transparent capsule with specular band, bottom rim, and bright outer stroke.
private struct RulerLiquidGlassFallback: View {
  let surface: Color
  let border: Color
  let sheen: Color
  let rim: Color
  let liquidBorder: Color
  let isInMotion: Bool

  /// Extra translucency so ticks/readout remain visible under the pill (theme `surface` is only a light tint).
  private var surfaceTint: Color {
    surface.opacity(isInMotion ? 0.08 : 0.2)
  }

  var body: some View {
    ZStack {
      Capsule()
        .fill(Color.clear)
      // Subtle native blur to make the glass read more clearly, while keeping content legible.
      Capsule()
        .fill(.ultraThinMaterial)
        .opacity(isInMotion ? 0.12 : 0.42)
      LinearGradient(
        colors: [sheen.opacity(isInMotion ? 0.18 : 0.34), Color.clear],
        startPoint: .top,
        endPoint: UnitPoint(x: 0.5, y: 0.62)
      )
      .clipShape(Capsule())
      Capsule()
        .fill(surfaceTint)
      VStack {
        Spacer(minLength: 0)
        Rectangle()
          .fill(rim.opacity(isInMotion ? 0.55 : 1))
          .frame(height: 0.5)
      }
      .clipShape(Capsule())
    }
    .overlay(
      Capsule()
        .strokeBorder(border, lineWidth: 1 / UIScreen.main.scale)
    )
    .overlay(
      Capsule()
        .strokeBorder(liquidBorder.opacity(isInMotion ? 0.55 : 0.9), lineWidth: 1 / UIScreen.main.scale)
        .padding(-0.5)
    )
  }
}
