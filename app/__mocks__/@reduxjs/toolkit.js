export const configureStore = jest.fn(config => ({
  getState: jest.fn(),
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
  [Symbol.observable]: jest.fn(),
}));

export const createSlice = jest.fn(config => ({
  name: config.name,
  reducer: jest.fn(),
  actions: config.reducers || {},
  caseReducers: config.reducers || {},
  getInitialState: jest.fn(),
}));

export const createAsyncThunk = jest.fn((typePrefix, payloadCreator) => {
  const thunk = jest.fn();
  thunk.pending = {type: `${typePrefix}/pending`};
  thunk.fulfilled = {type: `${typePrefix}/fulfilled`};
  thunk.rejected = {type: `${typePrefix}/rejected`};
  return thunk;
});

export const createEntityAdapter = jest.fn(() => ({
  getInitialState: jest.fn(() => ({})),
  addOne: jest.fn(),
  addMany: jest.fn(),
  setAll: jest.fn(),
  removeOne: jest.fn(),
  removeMany: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  upsertOne: jest.fn(),
  upsertMany: jest.fn(),
  selectIds: jest.fn(),
  selectEntities: jest.fn(),
  selectAll: jest.fn(),
  selectTotal: jest.fn(),
  selectById: jest.fn(),
}));
