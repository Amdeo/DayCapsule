import type { Entry } from '@/src/types/entry';
import { act, fireEvent } from '@testing-library/react-native';
import { waitFor } from '@testing-library/react-native';
import { renderHomeScreen } from '../helpers/renderHomeScreen';

const textEntry = {
  id: 'entry-text-1',
  type: 'text',
  content: '新出现的首页记录',
  tags: ['工作'],
  timestamp: new Date('2026-03-27T10:00:00+08:00').getTime(),
  syncStatus: 'synced',
} as Entry;

const photoEntry = {
  id: 'entry-photo-1',
  type: 'photo',
  content: '旅行海边照片',
  tags: ['旅行'],
  timestamp: new Date('2026-03-27T11:00:00+08:00').getTime(),
  syncStatus: 'synced',
  media: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', size: 123 }],
} as Entry;

const recordingVoiceEntry = {
  id: 'entry-voice-recording-1',
  type: 'voice',
  content: '',
  tags: ['录音'],
  timestamp: new Date('2026-03-27T12:00:00+08:00').getTime(),
  syncStatus: 'pending',
  recordingStatus: 'recording',
  recordingDuration: 0,
  media: [{ uri: '', mimeType: 'audio/m4a', size: 0, duration: 0 }],
} as Entry;

describe('HomeScreen timeline interactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('switches from the empty state to timeline entries when the home store receives data', () => {
    const { screen, controls } = renderHomeScreen();

    expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();

    controls.setEntries([textEntry]);

    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
    expect(screen.queryByTestId('timeline-empty-state')).toBeNull();
  });

  it('calls loadMore once from the home timeline when more entries are available', () => {
    const { screen, spies, controls } = renderHomeScreen({
      entries: [textEntry],
    });

    controls.setPagination({ hasMore: true, isLoadingMore: false });

    fireEvent.press(screen.getByTestId('timeline-load-more-trigger'));

    expect(spies.loadMore).toHaveBeenCalledTimes(1);
  });

  it('shows branded feedback when loading more entries fails from the home timeline', async () => {
    const { screen, spies, controls, stores } = renderHomeScreen({
      entries: [textEntry],
    });

    controls.setPagination({ hasMore: true, isLoadingMore: false });
    stores.entryStore.state.loadMore.mockImplementationOnce(() => {
      throw new Error('pagination failed');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-load-more-trigger'));
    });

    expect(spies.showErrorFeedback).toHaveBeenCalledWith({
      title: '加载失败',
      message: '更多记录加载失败，请稍后重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('does not expose the load-more trigger while loading-more is already in progress', () => {
    const { screen, controls } = renderHomeScreen({
      entries: [textEntry],
    });

    controls.setPagination({ hasMore: true, isLoadingMore: true });

    expect(screen.queryByTestId('timeline-load-more-trigger')).toBeNull();
    expect(screen.getByTestId('timeline-loading-more-indicator')).toBeTruthy();
  });

  it('updates the home timeline results when search filters are applied through the shared store state', async () => {
    const renderHome = renderHomeScreen({
      entries: [textEntry, photoEntry],
      allTags: ['旅行', '工作'],
    });
    const { screen, spies } = renderHome;

    await act(async () => {
      await spies.applySearchFilters({
        query: '旅行',
        type: 'photo',
        dateRange: 'all',
        tags: ['旅行'],
      });
    });

    expect(renderHome.stores.filterUiStore.state.searchQuery).toBe('旅行');
    expect(renderHome.stores.filterUiStore.state.filterType).toBe('photo');
    expect(renderHome.stores.filterUiStore.state.filterDateRange).toBe('all');
    expect(renderHome.stores.filterUiStore.state.selectedTags).toEqual(['旅行']);

    expect(screen.getByTestId('timeline-entry-entry-photo-1')).toBeTruthy();
    expect(screen.queryByTestId('timeline-entry-entry-text-1')).toBeNull();
  });

  it('returns the home timeline to a stable list state after closing detail', async () => {
    const { screen } = renderHomeScreen({
      entries: [textEntry],
    });

    fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
    expect(screen.getByTestId('timeline-text-detail')).toBeTruthy();

    // 保存不关闭详情页（只是更新数据，详情页内部切回只读模式）
    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-text-detail-edit'));
    });
    expect(screen.getByTestId('timeline-text-detail')).toBeTruthy();

    // 关闭详情页后回到列表
    fireEvent.press(screen.getByTestId('timeline-text-detail-close'));
    expect(screen.queryByTestId('timeline-text-detail')).toBeNull();
    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
  });

  it('shows branded feedback when deleting from the home timeline fails', async () => {
    const renderHome = renderHomeScreen({
      entries: [textEntry],
    });
    const { screen, spies, stores } = renderHome;

    stores.entryStore.state.deleteEntry.mockRejectedValueOnce(new Error('delete failed'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-entry-delete-entry-text-1'));
    });

    expect(spies.showErrorFeedback).toHaveBeenCalledWith({
      title: '删除失败',
      message: '删除这条记录失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('shows branded feedback when the home timeline fails to load initial entries', async () => {
    const { spies } = renderHomeScreen({
      loadEntriesImplementation: async () => {
        throw new Error('db offline');
      },
    });

    await waitFor(() => {
      expect(spies.showErrorFeedback).toHaveBeenCalledWith({
        title: '加载失败',
        message: '首页记录加载失败，请稍后重试',
        actions: [{ label: '知道了', role: 'primary' }],
      });
    });
  });

  it('shows branded feedback when starting a local recording fails from home quick add', async () => {
    const { spies } = renderHomeScreen({ authenticated: false, accountScopeActive: false });

    spies.addEntry.mockRejectedValueOnce(new Error('mic busy'));

    await act(async () => {
      await spies.triggerQuickAddVoice();
    });

    expect(spies.showErrorFeedback).toHaveBeenCalledWith({
      title: '录音失败',
      message: '开始录音失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('shows branded feedback when saving a text entry fails from home quick add', async () => {
    const { screen, spies } = renderHomeScreen({ authenticated: false, accountScopeActive: false });

    spies.addEntry.mockRejectedValueOnce(new Error('db write failed'));

    await act(async () => {
      await spies.triggerQuickAddText();
    });

    fireEvent.changeText(screen.getByTestId('text-editor-content-input'), '新的文本内容');
    fireEvent.changeText(screen.getByTestId('text-editor-tags-input'), '测试');

    await act(async () => {
      fireEvent.press(screen.getByTestId('text-editor-save-button'));
    });

    expect(spies.showErrorFeedback).toHaveBeenCalledWith({
      title: '保存失败',
      message: '文本保存失败，请重试',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

  it('shows branded feedback when stopping a local recording fails from the home timeline', async () => {
    const renderHome = renderHomeScreen({
      entries: [recordingVoiceEntry],
      authenticated: false,
      accountScopeActive: false,
    });
    const { screen, spies } = renderHome;

    spies.completeRecording.mockRejectedValueOnce(new Error('disk full'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-entry-stop-recording-entry-voice-recording-1'));
    });

    expect(spies.showErrorFeedback).toHaveBeenCalledWith({
      title: '录音保存失败',
      message: '录音文件保存失败，请重试。',
      actions: [{ label: '知道了', role: 'primary' }],
    });
  });

});
