import { createSyncBootstrapService } from '../syncBootstrapService';
import * as DB from '@/src/database/operations';

const mockApiGet = jest.fn();
const mockSetInitialSyncState = jest.fn(async () => undefined);

jest.mock('@/src/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/src/services/apiClient', () => ({
  getApiClient: jest.fn(() => ({
    get: mockApiGet,
  })),
}));

jest.mock('@/src/store/syncStore', () => ({
  useSyncStore: {
    getState: () => ({
      setInitialSyncState: mockSetInitialSyncState,
    }),
  },
}));

jest.mock('@/src/database/operations', () => ({
  getEntriesCount: jest.fn(async () => 0),
  getAllEntries: jest.fn(async () => []),
  updateEntry: jest.fn(async () => undefined),
  clearAllEntries: jest.fn(async () => undefined),
  restoreEntries: jest.fn(async () => []),
}));

describe('syncBootstrapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DB.getEntriesCount as jest.Mock).mockResolvedValue(0);
    mockApiGet.mockResolvedValue({ entryCount: 0 });
  });

  it('returns restore flow when local is empty and cloud has data', async () => {
    mockApiGet.mockResolvedValueOnce({ entryCount: 3 });

    const service = createSyncBootstrapService();
    const inspection = await service.inspectInitialState();
    const flow = service.buildInitialFlow(inspection);

    expect(flow).toMatchObject({
      type: 'restoring',
      localCount: 0,
      cloudCount: 3,
    });
  });

  it('returns backup flow when local has data and cloud is empty', async () => {
    (DB.getEntriesCount as jest.Mock).mockResolvedValueOnce(2);

    const service = createSyncBootstrapService();
    const inspection = await service.inspectInitialState();
    const flow = service.buildInitialFlow(inspection);

    expect(flow).toMatchObject({
      type: 'backing-up',
      localCount: 2,
      cloudCount: 0,
    });
  });

  it('returns needs-decision when both local and cloud have data', async () => {
    (DB.getEntriesCount as jest.Mock).mockResolvedValueOnce(2);
    mockApiGet.mockResolvedValueOnce({ entryCount: 4 });

    const service = createSyncBootstrapService();
    const inspection = await service.inspectInitialState();
    const flow = service.buildInitialFlow(inspection);

    expect(flow).toMatchObject({
      type: 'needs-decision',
      localCount: 2,
      cloudCount: 4,
    });
  });
});
