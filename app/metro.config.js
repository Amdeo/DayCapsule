const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for MemoryCapsule
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': './src',
      '@features': './src/features',
      '@services': './src/services',
      '@store': './src/store',
      '@ui': './src/ui',
      '@hooks': './src/hooks',
      '@utils': './src/utils',
      '@app': './src/app',
    },
    platforms: ['ios', 'android', 'native'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
