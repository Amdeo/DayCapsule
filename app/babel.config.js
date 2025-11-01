module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
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
      },
    ],
  ],
};
