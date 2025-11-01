export default {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(null),
  multiRemove: jest.fn().mockResolvedValue(null),
  getAllKeys: jest.fn().mockResolvedValue([]),
  clear: jest.fn().mockResolvedValue(null),
  flushGetRequests: jest.fn(),
};
