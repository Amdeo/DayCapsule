import { act, renderHook } from '@testing-library/react-native';
import { showAppDialog } from '@/src/services/showAppDialog';
import { useTagManagementController } from '../tag-management-page/useTagManagementController';

const mockLoadCommonTags = jest.fn();
const mockAddCommonTag = jest.fn();
const mockRemoveCommonTag = jest.fn();
const mockResetToDefaults = jest.fn();
const mockReorderCommonTags = jest.fn();

let mockTags = ['工作', '学习', '旅行'];

jest.mock('@/src/store/commonTagsStore', () => ({
  DEFAULT_PRESET_TAGS: ['工作', '学习', '旅行'],
  useCommonTagsStore: () => ({
    tags: mockTags,
    isLoaded: true,
    loadCommonTags: mockLoadCommonTags,
    addCommonTag: mockAddCommonTag,
    removeCommonTag: mockRemoveCommonTag,
    resetToDefaults: mockResetToDefaults,
    reorderCommonTags: mockReorderCommonTags,
  }),
}));

jest.mock('@/src/services/showAppDialog', () => ({
  showAppDialog: jest.fn(),
}));

describe('useTagManagementController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTags = ['工作', '学习', '旅行'];
  });

  it('shows blocking dialog when adding beyond the max preset tag limit', async () => {
    mockTags = Array.from({ length: 20 }, (_, index) => `标签${index + 1}`);
    const { result } = renderHook(() => useTagManagementController({ visible: true }));

    act(() => {
      result.current.setInputValue('灵感');
    });

    await act(async () => {
      await result.current.handleAdd();
    });

    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '已达上限',
        message: '最多 20 个预制标签',
        blocking: true,
      })
    );
    expect(mockAddCommonTag).not.toHaveBeenCalled();
  });

  it('shows blocking delete confirmation dialog and removes tag after confirm', async () => {
    const { result } = renderHook(() => useTagManagementController({ visible: true }));

    act(() => {
      result.current.handleDelete('工作');
    });

    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '删除标签',
        message: '确认删除「工作」吗？',
        blocking: true,
        actions: expect.arrayContaining([
          expect.objectContaining({ label: '取消', role: 'secondary' }),
          expect.objectContaining({ label: '删除', role: 'destructive' }),
        ]),
      })
    );

    const request = (showAppDialog as jest.Mock).mock.calls[0][0];
    const deleteAction = request.actions.find((action: { label: string }) => action.label === '删除');

    await act(async () => {
      await deleteAction.onPress?.();
    });

    expect(mockRemoveCommonTag).toHaveBeenCalledWith('工作');
  });

  it('shows blocking reset confirmation dialog and restores defaults after confirm', async () => {
    const { result } = renderHook(() => useTagManagementController({ visible: true }));

    act(() => {
      result.current.handleReset();
    });

    expect(showAppDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '恢复初始预制标签',
        message: '将恢复为 3 个初始预制标签，当前修改将丢失。',
        blocking: true,
        actions: expect.arrayContaining([
          expect.objectContaining({ label: '取消', role: 'secondary' }),
          expect.objectContaining({ label: '恢复', role: 'destructive' }),
        ]),
      })
    );

    const request = (showAppDialog as jest.Mock).mock.calls[0][0];
    const resetAction = request.actions.find((action: { label: string }) => action.label === '恢复');

    await act(async () => {
      await resetAction.onPress?.();
    });

    expect(mockResetToDefaults).toHaveBeenCalledTimes(1);
  });
});
