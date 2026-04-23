import UIKit

extension UIColor {
  /// Mirrors `RNBMColorParse` for tick interpolation.
  static func rulerParse(_ raw: String?) -> UIColor {
    guard let s = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else {
      return .gray
    }
    if s.hasPrefix("#") {
      let hex = String(s.dropFirst())
      if hex.count == 6, let v = UInt32(hex, radix: 16) {
        let r = CGFloat((v >> 16) & 0xff) / 255
        let g = CGFloat((v >> 8) & 0xff) / 255
        let b = CGFloat(v & 0xff) / 255
        return UIColor(red: r, green: g, blue: b, alpha: 1)
      }
      if hex.count == 8, let v = UInt32(hex, radix: 16) {
        let r = CGFloat((v >> 24) & 0xff) / 255
        let g = CGFloat((v >> 16) & 0xff) / 255
        let b = CGFloat((v >> 8) & 0xff) / 255
        let a = CGFloat(v & 0xff) / 255
        return UIColor(red: r, green: g, blue: b, alpha: a)
      }
    }
    if s.hasPrefix("rgba("), s.hasSuffix(")") {
      let inner = s.dropFirst(5).dropLast()
      let parts = inner.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
      if parts.count >= 4,
         let rf = Double(parts[0]),
         let gf = Double(parts[1]),
         let bf = Double(parts[2]),
         let af = Double(parts[3]) {
        var r = CGFloat(rf)
        var g = CGFloat(gf)
        var b = CGFloat(bf)
        var a = CGFloat(af)
        if r > 1 { r /= 255 }
        if g > 1 { g /= 255 }
        if b > 1 { b /= 255 }
        if a > 1 { a /= 255 }
        return UIColor(
          red: min(1, max(0, r)),
          green: min(1, max(0, g)),
          blue: min(1, max(0, b)),
          alpha: min(1, max(0, a)),
        )
      }
    }
    return .gray
  }

  func rulerLerp(to: UIColor, t: CGFloat) -> UIColor {
    let u = max(0, min(1, t))
    let c1 = Self.rgbaComponents(self)
    let c2 = Self.rgbaComponents(to)
    return UIColor(
      red: c1.r + (c2.r - c1.r) * u,
      green: c1.g + (c2.g - c1.g) * u,
      blue: c1.b + (c2.b - c1.b) * u,
      alpha: c1.a + (c2.a - c1.a) * u,
    )
  }

  private static func rgbaComponents(_ c: UIColor) -> (r: CGFloat, g: CGFloat, b: CGFloat, a: CGFloat) {
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    if c.getRed(&r, green: &g, blue: &b, alpha: &a) {
      return (r, g, b, a)
    }
    let n = c.cgColor.numberOfComponents
    let comps = c.cgColor.components ?? []
    if n == 2, comps.count >= 2 {
      let w = comps[0]
      let a = comps[1]
      return (w, w, w, a)
    }
    if n >= 3, comps.count >= 4 {
      return (comps[0], comps[1], comps[2], comps[3])
    }
    return (0.5, 0.5, 0.5, 1)
  }
}
