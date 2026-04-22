const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const escapePathForRegex = (filePath) =>
  filePath.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replaceAll('/', '[/\\\\]');

const config = getDefaultConfig(projectRoot);
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');
const linkedLibNodeModules = path.resolve(
  projectRoot,
  'node_modules/react-native-body-metrics-picker/node_modules'
);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.blockList = [
  new RegExp(`^${escapePathForRegex(path.join(rootNodeModules, 'react'))}\\/.*$`),
  new RegExp(
    `^${escapePathForRegex(path.join(rootNodeModules, 'react-native'))}\\/.*$`
  ),
  new RegExp(
    `^${escapePathForRegex(path.join(rootNodeModules, 'react-native-reanimated'))}\\/.*$`
  ),
  new RegExp(
    `^${escapePathForRegex(path.join(rootNodeModules, 'react-native-worklets'))}\\/.*$`
  ),
  new RegExp(
    `^${escapePathForRegex(path.join(linkedLibNodeModules, 'react'))}\\/.*$`
  ),
  new RegExp(
    `^${escapePathForRegex(path.join(linkedLibNodeModules, 'react-native'))}\\/.*$`
  ),
  new RegExp(
    `^${escapePathForRegex(path.join(linkedLibNodeModules, 'react-native-reanimated'))}\\/.*$`
  ),
  new RegExp(
    `^${escapePathForRegex(path.join(linkedLibNodeModules, 'react-native-worklets'))}\\/.*$`
  ),
];

// Host app must own React — local `file:..` lib otherwise resolves a second copy and hooks break
// ("Cannot read property 'useMemo' of null").
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(
    projectRoot,
    'node_modules/react/jsx-dev-runtime'
  ),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-reanimated': path.resolve(
    projectRoot,
    'node_modules/react-native-reanimated'
  ),
  'react-native-worklets': path.resolve(
    projectRoot,
    'node_modules/react-native-worklets'
  ),
};

module.exports = config;
