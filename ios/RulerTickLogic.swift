import Foundation

enum RulerTickKind {
  case major, large, medium, small

  static func imperial(_ totalInches: Int) -> RulerTickKind {
    if totalInches % 12 == 0 { return .major }
    if totalInches % 6 == 0 { return .large }
    if totalInches % 3 == 0 { return .medium }
    return .small
  }

  func barWidth(major: CGFloat, mid: CGFloat, minor: CGFloat) -> CGFloat {
    switch self {
    case .major: return major
    case .large: return (major + mid) / 2
    case .medium: return mid
    case .small: return minor
    }
  }
}

enum RulerTickLogic {
  static func totalSteps(rangeMin: Double, rangeMax: Double, step: Double) -> Int {
    max(0, Int(round((rangeMax - rangeMin) / step)))
  }
}
