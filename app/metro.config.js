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
      lodash: 'lodash-es',
    },
    platforms: ['ios', 'android', 'native'],
    resolverMainFields: ['react-native', 'browser', 'main'],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
    resolveRequest: (context, moduleName, platform) => {
      // Redirect all lodash imports to lodash-es
      if (moduleName === 'lodash' || moduleName.startsWith('lodash/')) {
        const lodashEsModule = moduleName.replace(/^lodash\/?/, 'lodash-es/');
        try {
          return context.resolve(lodashEsModule, platform);
        } catch (error) {
          // Fallback to original request if lodash-es version doesn't exist
          return context.resolveRequest(context, moduleName, platform);
        }
      }
      return context.resolveRequest(context, moduleName, platform);
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

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
