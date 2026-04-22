/**
 * Ensures all CocoaPods targets use libc++ + C++20 for Fabric / ObjC++.
 * Do not add libc++ to HEADER_SEARCH_PATHS — breaks the `std` module on Xcode 26.
 *
 * Uses balanced-paren insertion after react_native_post_install(...) so it works
 * even if Expo changes whitespace or Podfile formatting.
 */
const { withPodfile } = require('@expo/config-plugins');

const MARKER_COMMENT = '# withIosPodsCpp20';
const LOGBOX_ENV_LINE = "ENV['EXPO_UNSTABLE_LOG_BOX'] ||= '0'";

const CPP_BLOCK = `  ${MARKER_COMMENT}
  installer.pods_project.build_configurations.each do |bc|
    bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'
    bc.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
    bc.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -stdlib=libc++'
  end

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |bc|
      bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'
      bc.build_settings['CLANG_CXX_LIBRARY'] = 'libc++'
      bc.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -stdlib=libc++'
    end
  end
`;

function injectAfterReactNativePostInstall(contents) {
  if (contents.includes(MARKER_COMMENT)) {
    return contents;
  }

  const marker = 'react_native_post_install(';
  const start = contents.indexOf(marker);
  if (start === -1) {
    return contents;
  }

  const openParenIdx = start + marker.length - 1;
  if (contents[openParenIdx] !== '(') {
    return contents;
  }

  let depth = 0;
  for (let i = openParenIdx; i < contents.length; i++) {
    const ch = contents[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        const afterClose = i + 1;
        const tail = contents.slice(afterClose);
        const nl = tail.match(/^\s*\n/);
        if (!nl) {
          return contents;
        }
        const insertPos = afterClose + nl[0].length;
        return contents.slice(0, insertPos) + CPP_BLOCK + '\n' + contents.slice(insertPos);
      }
    }
  }

  return contents;
}

function injectLogBoxEnv(contents) {
  if (contents.includes(LOGBOX_ENV_LINE)) {
    return contents;
  }

  const envLineRegex = /^ENV\['EX_DEV_CLIENT_NETWORK_INSPECTOR'\].*$/m;
  const match = contents.match(envLineRegex);
  if (match && typeof match.index === 'number') {
    const insertPos = match.index + match[0].length;
    return contents.slice(0, insertPos) + `\n${LOGBOX_ENV_LINE}` + contents.slice(insertPos);
  }

  return `${LOGBOX_ENV_LINE}\n${contents}`;
}

module.exports = function withIosPodsCpp20(config) {
  return withPodfile(config, (cfg) => {
    const before = cfg.modResults.contents;
    let next = injectLogBoxEnv(before);
    next = injectAfterReactNativePostInstall(next);
    if (next === before && !before.includes(MARKER_COMMENT)) {
      console.warn(
        'withIosPodsCpp20: could not find react_native_post_install( in Podfile. Run `npx expo prebuild --clean`.',
      );
    }
    cfg.modResults.contents = next;
    return cfg;
  });
};
