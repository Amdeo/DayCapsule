import type { Entry } from '@/src/types/entry';
import { act } from '@testing-library/react-native';
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

describe('renderHomeScreen stability contract', () => {
  it('keeps an earlier home render visible state stable after a later render mounts', async () => {
    const firstRender = renderHomeScreen({
      entries: [workEntry],
      cloudMode: true,
      cloudSyncUiState: 'pending',
    });

    expect(firstRender.screen.getByTestId('timeline-entry-entry-work-1')).toBeTruthy();
    expect(firstRender.screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();

    const secondRender = renderHomeScreen({
      entries: [travelEntry],
      cloudMode: false,
    });

    await act(async () => {
      await firstRender.spies.applySearchFilters({
        query: '',
        type: 'all',
        dateRange: 'all',
        tags: [],
      });
    });

    expect(firstRender.screen.getByTestId('timeline-entry-entry-work-1')).toBeTruthy();
    expect(firstRender.screen.queryByTestId('timeline-entry-entry-travel-1')).toBeNull();
    expect(firstRender.screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(firstRender.screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();

    expect(secondRender.screen.getByTestId('timeline-entry-entry-travel-1')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('cloud-sync-button')).toBeNull();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });
});
