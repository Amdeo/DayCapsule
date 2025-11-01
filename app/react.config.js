module.exports = {
  project: {
    ios: {},
    android: {},
  },
  dependency: {
    platforms: {
      ios: {
        project: 'node_modules/react-native-vector-icons/RNVectorIcons.xcodeproj',
        configurations: ['Debug', 'Release'],
      },
    },
  },
};

