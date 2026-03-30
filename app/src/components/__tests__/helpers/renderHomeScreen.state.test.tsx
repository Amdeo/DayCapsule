import type { Entry } from '@/src/types/entry';
import { act, waitFor } from '@testing-library/react-native';
import { renderHomeScreen } from './renderHomeScreen';

const workEntry = {
  id: 'entry-work-1',
  type: 'text',
  content: '工作复盘',
  tags: ['工作'],
  timestamp: new Date('2026-03-27T09:00:00+08:00').getTime(),
  syncStatus: 'synced',
} as Entry;

const travelEntry = {
  id: 'entry-travel-1',
  type: 'text',
  content: '旅行计划',
  tags: ['旅行'],
  timestamp: new Date('2026-03-27T10:00:00+08:00').getTime(),
  syncStatus: 'synced',
} as Entry;

describe('renderHomeScreen helper state isolation', () => {
  it('does not let a later render reset an earlier render\'s cloud sync ui state on rerender', async () => {
    const firstRender = renderHomeScreen({
      cloudMode: true,
      cloudSyncUiState: 'pending',
    });

    expect(firstRender.screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(firstRender.screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();

    const secondRender = renderHomeScreen();

    expect(secondRender.screen.queryByTestId('cloud-sync-button')).toBeNull();

    await act(async () => {
      await firstRender.spies.applySearchFilters({
        query: '',
        type: 'all',
        dateRange: 'all',
        tags: [],
      });
    });

    expect(firstRender.screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(firstRender.screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();
    expect(firstRender.screen.queryByTestId('cloud-sync-dot-synced')).toBeNull();
    expect(firstRender.screen.queryByTestId('cloud-sync-spinner')).toBeNull();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });

  it('does not let one render\'s source entries and derived tags become the default baseline for the next render', async () => {
    const firstRender = renderHomeScreen({
      entries: [workEntry],
    });

    const secondRender = renderHomeScreen();

    await expect(firstRender.spies.getAllTags()).resolves.toEqual(['工作']);
    await expect(secondRender.spies.getAllTags()).resolves.toEqual([]);

    await act(async () => {
      await firstRender.spies.applySearchFilters({
        query: '工作',
        type: 'all',
        dateRange: 'all',
        tags: ['工作'],
      });
    });

    expect(firstRender.screen.getByTestId('timeline-entry-entry-work-1')).toBeTruthy();
    expect(firstRender.screen.queryByTestId('timeline-empty-state')).toBeNull();
    expect(secondRender.screen.getByTestId('timeline-empty-state')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('timeline-entry-entry-work-1')).toBeNull();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });

  it('keeps one render\'s store updates from changing another render\'s visible entries', async () => {
    const firstRender = renderHomeScreen({
      entries: [workEntry],
    });

    const secondRender = renderHomeScreen({
      entries: [travelEntry],
    });

    expect(firstRender.screen.getByTestId('timeline-entry-entry-work-1')).toBeTruthy();
    expect(firstRender.screen.queryByTestId('timeline-entry-entry-travel-1')).toBeNull();
    expect(secondRender.screen.getByTestId('timeline-entry-entry-travel-1')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('timeline-entry-entry-work-1')).toBeNull();

    await act(async () => {
      await firstRender.spies.applySearchFilters({
        query: 'not-found',
        type: 'all',
        dateRange: 'all',
        tags: [],
      });
    });

    expect(firstRender.screen.getByTestId('timeline-empty-state')).toBeTruthy();
    expect(secondRender.screen.getByTestId('timeline-entry-entry-travel-1')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('timeline-empty-state')).toBeNull();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });

  it('keeps imperative store reads triggered from one rendered home screen bound to that render', async () => {
    const firstRender = renderHomeScreen();
    const secondRender = renderHomeScreen({
      entries: [travelEntry],
    });

    firstRender.spies.startRecording.mockClear();

    await act(async () => {
      await firstRender.spies.triggerQuickAddVoice?.();
    });

    expect(firstRender.spies.loggerError).not.toHaveBeenCalled();
    expect(firstRender.spies.addEntry).toHaveBeenCalledTimes(1);
    expect(firstRender.spies.startRecording).toHaveBeenCalledTimes(1);
    expect(firstRender.screen.getByTestId('timeline-entry-mock-entry-1')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('timeline-entry-mock-entry-1')).toBeNull();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });
});
