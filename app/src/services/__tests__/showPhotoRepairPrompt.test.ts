const mockAlert = jest.fn();
const mockRepair = jest.fn();

jest.mock('react-native', () => ({
  Alert: {
    alert: (...args: unknown[]) => mockAlert(...args),
  },
}));

jest.mock('../photoRepairService', () => ({
  createPhotoRepairService: jest.fn(() => ({
    repair: mockRepair,
  })),
}));

import { useMediaRepairStore } from '@/src/store/mediaRepairStore';
import {
  resetPhotoRepairPromptForTests,
  showPhotoRepairPrompt,
} from '../showPhotoRepairPrompt';

describe('showPhotoRepairPrompt', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    useMediaRepairStore.setState({ issues: [] });
    resetPhotoRepairPromptForTests();
  });

  it('shows the repair confirmation prompt for the first repairable issue', () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = mockAlert.mock.calls[0] ?? [];
    expect(title).toBe('发现云端媒体异常');
    expect(message).toEqual(expect.any(String));
    expect(buttons).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: '稍后处理' }),
      expect.objectContaining({ text: '立即修复' }),
    ]));
  });

  it('dismisses the issue without repairing when the user chooses 稍后处理', async () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    const buttons = mockAlert.mock.calls[0]?.[2] ?? [];
    await buttons.find((button: { text?: string }) => button.text === '稍后处理')?.onPress?.();

    expect(mockRepair).not.toHaveBeenCalled();
    expect(useMediaRepairStore.getState().issues).toEqual([]);
  });

  it('repairs and dismisses the issue when the user chooses 立即修复', async () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();

    const buttons = mockAlert.mock.calls[0]?.[2] ?? [];
    await buttons.find((button: { text?: string }) => button.text === '立即修复')?.onPress?.();

    expect(mockRepair).toHaveBeenCalledWith(issue);
    expect(useMediaRepairStore.getState().issues).toEqual([]);
  });

  it('guards against showing the same prompt twice before the first one is handled', () => {
    useMediaRepairStore.getState().replaceIssues([issue]);

    showPhotoRepairPrompt();
    showPhotoRepairPrompt();

    expect(mockAlert).toHaveBeenCalledTimes(1);
  });
});
