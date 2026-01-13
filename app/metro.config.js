/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'base64', 'svg'],
    sourceExts: [...defaultConfig.resolver.sourceExts],
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
    extraNodeModules: {
      '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
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

module.exports = mergeConfig(defaultConfig, config);
