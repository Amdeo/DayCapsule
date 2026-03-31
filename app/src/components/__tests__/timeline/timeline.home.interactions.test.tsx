import type { Entry } from '@/src/types/entry';
import { act, fireEvent } from '@testing-library/react-native';
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

  it('returns the home timeline to a stable list state after closing detail and editor flows', () => {
    const { screen } = renderHomeScreen({
      entries: [textEntry],
    });

    fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
    expect(screen.getByTestId('timeline-text-detail')).toBeTruthy();

    fireEvent.press(screen.getByTestId('timeline-text-detail-close'));
    expect(screen.queryByTestId('timeline-text-detail')).toBeNull();
    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('timeline-entry-card-entry-text-1'));
    fireEvent.press(screen.getByTestId('timeline-text-detail-edit'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByTestId('timeline-entry-editor')).toBeTruthy();

    fireEvent.press(screen.getByTestId('timeline-entry-editor-close'));
    expect(screen.queryByTestId('timeline-entry-editor')).toBeNull();
    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
  });
});
