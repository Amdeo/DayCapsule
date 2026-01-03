/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const { getDefaultConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    assetExts: ['base64', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'webp', 'svg'],
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
    alias: {
      '@app': './src',
      '@features': './src/features',
      '@services': './src/services',
      '@store': './src/store',
      '@ui': './src/ui',
      '@utils': './src/utils',
      '@config': './src/config',
      '@types': './src/types',
    },
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

module.exports = config;
