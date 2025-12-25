/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
module.exports = {
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
  },
};
