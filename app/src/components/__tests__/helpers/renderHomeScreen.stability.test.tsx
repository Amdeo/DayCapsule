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
  it('keeps a default empty render empty and cloud-hidden after another populated render updates itself', async () => {
    const firstRender = renderHomeScreen();
    const secondRender = renderHomeScreen({
      entries: [travelEntry],
      cloudMode: true,
      cloudSyncUiState: 'pending',
    });

    expect(firstRender.screen.getByTestId('timeline-empty-state')).toBeTruthy();
    expect(firstRender.screen.queryByTestId('timeline-entry-entry-travel-1')).toBeNull();
    expect(firstRender.screen.queryByTestId('cloud-sync-button')).toBeNull();
    expect(firstRender.screen.queryByTestId('cloud-sync-dot-pending')).toBeNull();

    expect(secondRender.screen.getByTestId('timeline-entry-entry-travel-1')).toBeTruthy();
    expect(secondRender.screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(secondRender.screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();

    await act(async () => {
      await secondRender.spies.applySearchFilters({
        query: 'not-found',
        type: 'all',
        dateRange: 'all',
        tags: [],
      });
    });

    expect(firstRender.screen.getByTestId('timeline-empty-state')).toBeTruthy();
    expect(firstRender.screen.queryByTestId('timeline-data-state')).toBeNull();
    expect(firstRender.screen.queryByTestId('timeline-entry-entry-travel-1')).toBeNull();
    expect(firstRender.screen.queryByTestId('cloud-sync-button')).toBeNull();
    expect(firstRender.screen.queryByTestId('cloud-sync-dot-pending')).toBeNull();

    expect(secondRender.screen.getByTestId('timeline-empty-state')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('timeline-entry-entry-travel-1')).toBeNull();
    expect(secondRender.screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(secondRender.screen.getByTestId('cloud-sync-dot-pending')).toBeTruthy();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });
});
