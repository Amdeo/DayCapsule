export const PERMISSIONS = {
  IOS: {
    CAMERA: 'ios.permission.CAMERA',
    MICROPHONE: 'ios.permission.MICROPHONE',
    LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
  },
  ANDROID: {
    CAMERA: 'android.permission.CAMERA',
    RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
  },
};

export const RESULTS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
};

export const check = jest.fn().mockResolvedValue('granted');
export const request = jest.fn().mockResolvedValue('granted');
export const checkMultiple = jest.fn().mockResolvedValue({});
export const requestMultiple = jest.fn().mockResolvedValue({});
