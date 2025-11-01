export default {
  setGenericPassword: jest.fn().mockResolvedValue({username: 'user', password: 'pass'}),
  getGenericPassword: jest.fn().mockResolvedValue({username: 'user', password: 'pass'}),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue({username: 'user', password: 'pass'}),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  setSharedWebCredentials: jest.fn().mockResolvedValue(true),
  getSharedWebCredentials: jest.fn().mockResolvedValue({username: 'user', password: 'pass'}),
  resetSharedWebCredentials: jest.fn().mockResolvedValue(true),
  canImplySecurityLevel: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue('FaceID'),
};
