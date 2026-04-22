require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-body-metrics-picker"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package.dig("repository", "url") || "https://github.com/user/react-native-body-metrics-picker"
  s.license      = package["license"]
  s.author       = package["author"]
  s.platforms    = { :ios => "17.0" }
  s.source       = { :git => package.dig("repository", "url") || "https://github.com/user/react-native-body-metrics-picker.git", :tag => "v#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  # Fabric headers (C++ / <atomic>) must not be part of the Swift umbrella — only .mm needs them.
  s.private_header_files = "ios/RCTHeightRulerView.h"
  s.swift_version = "5.0"
  s.module_name   = "RNBodyMetricsPicker"
  s.dependency "React-Core"
  s.dependency "React-RCTFabric"
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(inherited) \"$(PODS_ROOT)/../build/generated/ios/ReactCodegen\" \"$(PODS_ROOT)/Headers/Private/Yoga\"",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "CLANG_CXX_LIBRARY" => "libc++",
    "OTHER_CPLUSPLUSFLAGS" => "$(inherited) -stdlib=libc++",
    # Ensures RNBodyMetricsPicker-Swift.h is emitted after all Swift is compiled (mixed Swift + ObjC++ target).
    "SWIFT_COMPILATION_MODE" => "wholemodule"
  }
end
