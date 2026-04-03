const mockShow = jest.fn();
const mockHide = jest.fn();
const mockGetState = jest.fn(() => ({
  show: mockShow,
  hide: mockHide,
}));

jest.mock('@/src/store/cloudSyncMonitorStore', () => ({
  useCloudSyncMonitorStore: {
    getState: (...args: unknown[]) => mockGetState(...args),
  },
}));

import { hideCloudSyncMonitor, showCloudSyncMonitor } from '../showCloudSyncMonitor';

describe('showCloudSyncMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      show: mockShow,
      hide: mockHide,
    });
  });

  it('delegates showing to the cloud sync monitor store service contract', () => {
    showCloudSyncMonitor();

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockHide).not.toHaveBeenCalled();
  });

  it('delegates hiding to the cloud sync monitor store service contract', () => {
    hideCloudSyncMonitor();

    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(mockShow).not.toHaveBeenCalled();
  });
});
