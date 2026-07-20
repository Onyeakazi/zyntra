const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
  };
  config.resolver = {
    ...resolver,
    assetExts: [...new Set([...resolver.assetExts.filter((ext) => ext !== 'svg'), 'ttf', 'otf', 'png', 'jpg', 'jpeg'])],
    sourceExts: [...new Set([...resolver.sourceExts, 'svg'])],
  };

  return config;
})();