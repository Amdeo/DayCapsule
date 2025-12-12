module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-paper|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-reanimated|@gorhom/bottom-sheet|react-native-gesture-handler|react-native-worklets)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    // Mock third-party libraries
    '^react-native-paper$': '<rootDir>/__mocks__/react-native-paper.js',
    '^react-native-vector-icons/MaterialCommunityIcons$':
      '<rootDir>/__mocks__/react-native-vector-icons.js',
    '^react-native-permissions$': '<rootDir>/__mocks__/react-native-permissions.js',
    '^react-native-audio-recorder-player$':
      '<rootDir>/__mocks__/react-native-audio-recorder-player.js',
    '^react-redux$': '<rootDir>/__mocks__/react-redux.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^react-native-image-picker$': '<rootDir>/__mocks__/react-native-image-picker.js',
    '^react-native-image-resizer$': '<rootDir>/__mocks__/react-native-image-resizer.js',
    '^@reduxjs/toolkit$': '<rootDir>/__mocks__/@reduxjs/toolkit.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-geolocation-service$': '<rootDir>/__mocks__/react-native-geolocation-service.js',
    '^react-native-sqlite-storage$': '<rootDir>/__mocks__/react-native-sqlite-storage.js',
    '^react-native-keychain$': '<rootDir>/__mocks__/react-native-keychain.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.js',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^@react-navigation/native$': '<rootDir>/__mocks__/@react-navigation/native.js',
    '^@react-navigation/bottom-tabs$': '<rootDir>/__mocks__/@react-navigation/bottom-tabs.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
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
