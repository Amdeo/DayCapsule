export default {
  getCurrentPosition: jest.fn((success, error, options) => {
    success({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn().mockResolvedValue('granted'),
};
