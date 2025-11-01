/* eslint-env jest */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
