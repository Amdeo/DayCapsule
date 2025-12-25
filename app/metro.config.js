/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const { getDefaultConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
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
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
  },
};

module.exports = config;
