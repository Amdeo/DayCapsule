const jestExpoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...jestExpoPreset,
  setupFiles: [
    ...(jestExpoPreset.setupFiles ?? []),
    'react-native-gesture-handler/jestSetup',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?((jest-)?react-native|@react-native(-community)?|react-native-gesture-handler|react-native-reanimated|react-native-worklets|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
  moduleNameMapper: {
    ...(jestExpoPreset.moduleNameMapper ?? {}),
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.js',
  },
  testMatch: [
    '**/__tests__/**/*.{spec,test}.{ts,tsx}',
    '**/*.{spec,test}.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
