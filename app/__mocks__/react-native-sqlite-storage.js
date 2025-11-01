export default {
  openDatabase: jest.fn().mockResolvedValue({
    transaction: jest.fn(callback => {
      callback({
        executeSql: jest.fn((sql, params, success, error) => {
          success(null, {rows: {length: 0, item: () => ({})}});
        }),
      });
    }),
    executeSql: jest.fn().mockResolvedValue({rows: {length: 0, item: () => ({})}}),
    close: jest.fn().mockResolvedValue(null),
  }),
  deleteDatabase: jest.fn().mockResolvedValue(null),
  enablePromise: jest.fn(),
  DEBUG: jest.fn(),
};
