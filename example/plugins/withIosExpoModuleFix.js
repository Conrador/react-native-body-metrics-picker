/**
 * Keeps Expo-generated Swift files aligned on the same import access level.
 * - Normalizes `import Expo` to `internal import Expo` in AppDelegate to match
 *   the generated `ExpoModulesProvider.swift` from CocoaPods / Expo autolinking.
 * - Sets ENABLE_PREVIEWS = NO and SWIFT_ENABLE_EXPLICIT_MODULES = NO on the iOS app target.
 *
 * Do NOT wrap in createRunOncePlugin — the first evaluation can happen before `ios/` exists.
 *
 * After changing plugins: `npx expo prebuild --platform ios` (use `--clean` if needed), then build.
 */
const { withAppDelegate, withXcodeProject, IOSConfig } = require('@expo/config-plugins');

function tweakAppHostBuildSettings(project) {
  const { Target, XcodeUtils } = IOSConfig;
  const targetBuildConfigListIds = Target.getNativeTargets(project)
    .filter(([_, target]) => Target.isTargetOfType(target, Target.TargetType.APPLICATION))
    .map(([_, target]) => target.buildConfigurationList);

  for (const buildConfigListId of targetBuildConfigListIds) {
    for (const [, configurations] of XcodeUtils.getBuildConfigurationsForListId(project, buildConfigListId)) {
      const { buildSettings } = configurations;
      if (buildSettings) {
        buildSettings.ENABLE_PREVIEWS = 'NO';
        buildSettings.SWIFT_ENABLE_EXPLICIT_MODULES = 'NO';
      }
    }
  }
  return project;
}

module.exports = function withIosExpoModuleFix(config) {
  config = withAppDelegate(config, (cfg) => {
    cfg.modResults.contents = cfg.modResults.contents.replace(/^(\s*)import Expo$/m, '$1internal import Expo');
    return cfg;
  });

  return withXcodeProject(config, (cfg) => {
    cfg.modResults = tweakAppHostBuildSettings(cfg.modResults);
    return cfg;
  });
};
