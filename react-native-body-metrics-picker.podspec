require "json"
require "pathname"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# React Native resolves from the app's node_modules — this package lives beside `react-native/`.
package_root = Pathname.new(__dir__).realpath
react_native_install = nil
[
  package_root.join("../react-native"),
  package_root.parent.join("react-native"),
].map(&:expand_path).uniq.each do |candidate|
  if candidate.join("scripts/react_native_pods.rb").file?
    react_native_install = candidate.to_s
    break
  end
end

unless react_native_install
  raise(
    "react-native-body-metrics-picker: Could not locate react-native next to #{package_root}. " \
      "Expected node_modules/react-native/scripts/react_native_pods.rb.",
  )
end

require File.join(react_native_install, "scripts/react_native_pods.rb")

Pod::Spec.new do |s|
  s.name         = "react-native-body-metrics-picker"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package.dig("repository", "url") || "https://github.com/user/react-native-body-metrics-picker"
  s.license      = package["license"]
  s.author       = package["author"]
  # Align with common Expo/RN Podfile defaults (often 15.1). Raise only if you adopt APIs that truly need newer iOS.
  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => package.dig("repository", "url") || "https://github.com/user/react-native-body-metrics-picker.git", :tag => "v#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  # C++ interop headers must not be part of the Swift umbrella — only .mm needs them.
  s.private_header_files = "ios/RCTHeightRulerView.h"
  s.swift_version = "5.0"
  s.module_name   = "RNBodyMetricsPicker"

  # Base Xcode settings; RN merges Folly, codegen, and New Architecture headers/deps via install_modules_dependencies.
  s.pod_target_xcconfig = {
    # Snapshotted codegen + Yoga + ReactCommon — helper below adds folly and the rest via add_rn_third_party_dependencies.
    "HEADER_SEARCH_PATHS" =>
      "$(inherited) \"$(PODS_TARGET_SRCROOT)/../react-native/ReactCommon\" " \
      "\"$(PODS_ROOT)/../build/generated/ios/ReactCodegen\" \"$(PODS_ROOT)/Headers/Private/Yoga\"",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "CLANG_CXX_LIBRARY" => "libc++",
    "OTHER_CPLUSPLUSFLAGS" => "$(inherited) -stdlib=libc++",
    # Mixed Swift + ObjC++; lets ObjC++ import the generated Swift header as <Module/Module-Swift.h>.
    "DEFINES_MODULE" => "YES",
    "CLANG_ENABLE_MODULES" => "YES",
    # Explicit name so ObjC++ imports match the emitted header (see RCTHeightRulerView.mm).
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "RNBodyMetricsPicker-Swift.h",
    # Ensures RNBodyMetricsPicker-Swift.h is emitted after all Swift is compiled (mixed Swift + ObjC++ target).
    "SWIFT_COMPILATION_MODE" => "wholemodule",
  }

  # RCT-Folly, codegen, and RN New Architecture toolchain when using RN prebuilds/source.
  install_modules_dependencies(s)
end
