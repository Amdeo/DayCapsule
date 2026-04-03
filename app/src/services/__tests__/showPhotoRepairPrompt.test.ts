const mockAlertAlert = jest.fn();
const mockShowConfirmDialog = jest.fn();
const mockRepair = jest.fn(async () => undefined);
const mockInjectRepairPending = jest.fn(async () => undefined);

jest.mock('react-native', () => ({
  Alert: {
    alert: (...args: unknown[]) => mockAlertAlert(...args),
  },
}));

jest.mock('../showConfirmDialog', () => ({
  showConfirmDialog: (...args: unknown[]) => mockShowConfirmDialog(...args),
}));

jest.mock('../photoRepairService', () => ({
  createPhotoRepairService: jest.fn(() => ({
    repair: mockRepair,
  })),
}));

jest.mock('../e2eSyncLabService', () => ({
  createE2ESyncLabService: jest.fn(() => ({
    injectRepairPending: (...args: unknown[]) => mockInjectRepairPending(...args),
  })),
}));

import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import {
  resetPhotoRepairPromptForTests,
  showPhotoRepairPrompt,
} from '../showPhotoRepairPrompt';

function getActions() {
  const [request] = mockShowConfirmDialog.mock.calls[0] ?? [];
  return request?.actions ?? [];
}

async function pressAction(label: string) {
  const actions = getActions();
  const action = actions.find((candidate: { label?: string }) => candidate.label === label);

  if (!action?.onPress) {
    throw new Error(`Action not found: ${label}`);
  }

  await action.onPress();
}

describe('showPhotoRepairPrompt', () => {
  const originalE2ESyncLab = process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  const issue = {
    entryId: 'entry-1',
    mediaIndex: 0,
    localMediaId: 'local-1',
    localUri: 'file:///documents/media/photos/original/photo-1.jpg',
    remoteUri: 'https://cdn.example.com/photo-1.jpg',
    persistedHash: 'local-good',
    remoteHash: 'remote-bad',
    downloadedHash: 'remote-bad',
    integrityStatus: 'repair_prompt_required' as const,
    integrityReason: 'cloud hash mismatch while local original is still healthy',
  };
  const e2eIssue = {
    ...issue,
    localMediaId: 'e2e-sync-local-media-1',
    localUri: 'file:///documents/e2e-sync-lab/e2e-sync-entry-1.png',
  };
  const issueWithoutLocalMediaId = {
    ...issue,
    localMediaId: undefined,
    mediaIndex: 1,
    localUri: 'file:///documents/media/photos/original/photo-2.jpg',
  };
  const siblingIssueWithoutLocalMediaId = {
    ...issue,
    localMediaId: undefined,
    mediaIndex: 2,
    localUri: 'file:///documents/media/photos/original/photo-3.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowConfirmDialog.mockReturnValue(true);
    useMediaRepairStore.setState({ issues: [] });
    resetPhotoRepairPromptForTests();
    delete process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
  });

  afterAll(() => {
    if (originalE2ESyncLab === undefined) {
      delete process.env.EXPO_PUBLIC_E2E_SYNC_LAB;
      return;
    }

    process.env.EXPO_PUBLIC_E2E_SYNC_LAB = originalE2ESyncLab;
  });

  it('must route the repair prompt through showConfirmDialog instead of Alert.alert', () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    expect(mockAlertAlert).not.toHaveBeenCalled();
    expect(mockShowConfirmDialog).toHaveBeenCalledTimes(1);
    const [request] = mockShowConfirmDialog.mock.calls[0] ?? [];
    expect(request).toEqual(expect.objectContaining({
      title: '发现云端媒体异常',
      message: expect.any(String),
      dismissible: false,
      actions: expect.arrayContaining([
        expect.objectContaining({ label: '稍后处理' }),
        expect.objectContaining({ label: '立即修复' }),
      ]),
    }));
  });

  it('keeps the issue pending when the user chooses 稍后处理', async () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    await pressAction('稍后处理');

    expect(mockRepair).not.toHaveBeenCalled();
    expect(useMediaRepairStore.getState().issues).toEqual([issue]);
  });

  it('allows the same repair issue to be prompted again after the user chooses 稍后处理', async () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    await pressAction('稍后处理');

    showPhotoRepairPrompt();

    expect(mockShowConfirmDialog).toHaveBeenCalledTimes(2);
  });

  it('repairs and dismisses the issue when the user chooses 立即修复', async () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    await pressAction('立即修复');

    expect(mockRepair).toHaveBeenCalledWith(issue);
    expect(useMediaRepairStore.getState().issues).toEqual([]);
  });

  it('keeps the issue pending and allows the same prompt again when repair fails', async () => {
    const repairError = new Error('repair failed');
    mockRepair.mockRejectedValueOnce(repairError);
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    await expect(pressAction('立即修复')).rejects.toThrow('repair failed');
    expect(useMediaRepairStore.getState().issues).toEqual([issue]);

    showPhotoRepairPrompt();

    expect(mockShowConfirmDialog).toHaveBeenCalledTimes(2);
  });

  it('uses the E2E sync lab repair-pending transition for lab fixtures instead of hitting the real repair service', async () => {
    process.env.EXPO_PUBLIC_E2E_SYNC_LAB = '1';
    useMediaRepairStore.getState().replaceIssues([e2eIssue]);

    showPhotoRepairPrompt();

    await pressAction('立即修复');

    expect(mockInjectRepairPending).toHaveBeenCalledTimes(1);
    expect(mockRepair).not.toHaveBeenCalled();
    expect(useMediaRepairStore.getState().issues).toEqual([]);
  });

  it('only removes the resolved issue when localMediaId is missing', async () => {
    useMediaRepairStore.getState().replaceIssues([
      issueWithoutLocalMediaId,
      siblingIssueWithoutLocalMediaId,
    ]);

    showPhotoRepairPrompt();

    await pressAction('立即修复');

    expect(mockRepair).toHaveBeenCalledWith(issueWithoutLocalMediaId);
    expect(useMediaRepairStore.getState().issues).toEqual([
      siblingIssueWithoutLocalMediaId,
    ]);
  });

  it('guards against showing the same prompt twice before the first one is handled', () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();
    showPhotoRepairPrompt();

    expect(mockShowConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('allows retrying the same prompt when showConfirmDialog returns false', () => {
    mockShowConfirmDialog.mockReturnValueOnce(false).mockReturnValueOnce(true);
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();
    showPhotoRepairPrompt();

    expect(mockShowConfirmDialog).toHaveBeenCalledTimes(2);
  });
});
