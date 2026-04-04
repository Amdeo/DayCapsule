import { act, renderHook } from '@testing-library/react-native';
import { useTimelineController } from '../../timeline-v2/useTimelineController';

describe('useTimelineController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('toggles the view switcher and transitions into calendar mode after the delay', () => {
    const { result } = renderHook(() =>
      useTimelineController({
        updateEntry: jest.fn(),
      })
    );

    expect(result.current.showViewToggle).toBe(false);
    expect(result.current.viewMode).toBe('list');
    expect(result.current.displayMode).toBe('list');

    act(() => {
      result.current.handleToggleViewMode();
    });

    expect(result.current.showViewToggle).toBe(true);

    act(() => {
      result.current.setViewMode('calendar');
    });

    expect(result.current.viewMode).toBe('calendar');
    expect(result.current.displayMode).toBe('list');
    expect(result.current.isTransitioning).toBe(true);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(result.current.displayMode).toBe('calendar');
    expect(result.current.isTransitioning).toBe(false);
  });

  it('resets back to list mode immediately when closing the view switcher from calendar mode', () => {
    const { result } = renderHook(() =>
      useTimelineController({
        updateEntry: jest.fn(),
      })
    );

    act(() => {
      result.current.handleToggleViewMode();
    });

    act(() => {
      result.current.setViewMode('calendar');
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(result.current.showViewToggle).toBe(true);
    expect(result.current.viewMode).toBe('calendar');
    expect(result.current.displayMode).toBe('calendar');

    act(() => {
      result.current.handleToggleViewMode();
    });

    expect(result.current.showViewToggle).toBe(false);
    expect(result.current.viewMode).toBe('list');
    expect(result.current.displayMode).toBe('list');
  });

  it('toggles the FAB hide state and scroll-top visibility from scroll direction', () => {
    const { result } = renderHook(() =>
      useTimelineController({
        updateEntry: jest.fn(),
      })
    );

    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 260 } },
      } as any);
    });

    expect(result.current.fabShouldHide).toBe(true);
    expect(result.current.showScrollTop).toBe(true);

    act(() => {
      result.current.handleScroll({
        nativeEvent: { contentOffset: { y: 120 } },
      } as any);
    });

    expect(result.current.fabShouldHide).toBe(false);
  });

  it('saves edits through updateEntry and closes the editor state', async () => {
    const updateEntry = jest.fn();
    const entry = {
      id: 'entry-1',
      type: 'text',
      content: '旧内容',
      timestamp: Date.now(),
      syncStatus: 'synced',
    } as any;

    const { result } = renderHook(() =>
      useTimelineController({
        updateEntry,
      })
    );

    act(() => {
      result.current.handleEditEntry(entry);
    });

    expect(result.current.editingEntry).toBe(entry);

    await act(async () => {
      await result.current.handleSaveEdit('entry-1', '新内容', ['已更新']);
    });

    expect(updateEntry).toHaveBeenCalledWith('entry-1', {
      content: '新内容',
      tags: ['已更新'],
    });
    expect(result.current.editingEntry).toBeNull();
  });

  it('rethrows when saving from the timeline rejects so the editor flow can keep handling the failure', async () => {
    const updateEntry = jest.fn().mockRejectedValueOnce(new Error('db failed'));
    const entry = {
      id: 'entry-1',
      type: 'text',
      content: '旧内容',
      timestamp: Date.now(),
      syncStatus: 'synced',
    } as any;

    const { result } = renderHook(() =>
      useTimelineController({
        updateEntry,
      })
    );

    act(() => {
      result.current.handleEditEntry(entry);
    });

    await expect(
      act(async () => {
        await result.current.handleSaveEdit('entry-1', '新内容', ['已更新']);
      })
    ).rejects.toThrow('db failed');

    expect(updateEntry).toHaveBeenCalledWith('entry-1', {
      content: '新内容',
      tags: ['已更新'],
    });
    expect(result.current.editingEntry).toBe(entry);
  });

  it('saves text entry edits from the detail page through handleSaveEdit', async () => {
    const updateEntry = jest.fn();
    const entry = {
      id: 'entry-1',
      type: 'text',
      content: '旧内容',
      timestamp: Date.now(),
      syncStatus: 'synced',
    } as any;

    const { result } = renderHook(() =>
      useTimelineController({
        updateEntry,
      })
    );

    act(() => {
      result.current.handleViewEntry(entry);
    });

    expect(result.current.viewingEntry).toBe(entry);

    await act(async () => {
      await result.current.handleSaveEdit('entry-1', '新内容', ['已更新']);
    });

    expect(updateEntry).toHaveBeenCalledWith('entry-1', {
      content: '新内容',
      tags: ['已更新'],
    });
  });

});
