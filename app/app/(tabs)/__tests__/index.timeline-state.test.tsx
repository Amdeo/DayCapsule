import { waitFor } from '@testing-library/react-native';
import type { Entry } from '@/src/types/entry';
import { renderHomeScreen } from '@/src/components/__tests__/helpers/renderHomeScreen';

describe('HomeScreen timeline state', () => {
  it('renders the empty timeline state and refreshes home bootstrap sources on mount', async () => {
    const { screen, spies } = renderHomeScreen();

    expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();

    await waitFor(() => {
      expect(spies.loadSettings).toHaveBeenCalledTimes(1);
      expect(spies.loadCommonTags).toHaveBeenCalledTimes(1);
      expect(spies.loadEntries).toHaveBeenCalledTimes(1);
      expect(spies.refreshCloudSyncIndicator).toHaveBeenCalledTimes(1);
    });
  });

  it('renders timeline entries when the home screen has data', () => {
    const { screen } = renderHomeScreen({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '第一条文本记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        } as Entry,
      ],
    });

    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
    expect(screen.getByText('第一条文本记录')).toBeTruthy();
  });

  it('keeps existing entries visible while the home screen refreshes', async () => {
    let resolveRefresh: (() => void) | null = null;

    const { screen, spies } = renderHomeScreen({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '刷新前的首页记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        } as Entry,
      ],
      loadEntriesImplementation: () => new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    });

    await waitFor(() => {
      expect(spies.loadEntries).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
    expect(screen.queryByTestId('timeline-empty-state')).toBeNull();

    resolveRefresh?.();
    await waitFor(() => {
      expect(spies.refreshCloudSyncIndicator).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the sync status entry point when the home timeline reports cloud activity', () => {
    const { screen } = renderHomeScreen({
      entries: [
        {
          id: 'entry-text-1',
          type: 'text',
          content: '第一条文本记录',
          tags: ['工作'],
          timestamp: new Date('2026-03-20T09:00:00+08:00').getTime(),
          syncStatus: 'synced',
        } as Entry,
      ],
      cloudSyncUiState: 'pending',
    });

    expect(screen.getByTestId('cloud-sync-button')).toBeTruthy();
    expect(screen.getByTestId('cloud-sync-icon-pending')).toBeTruthy();
  });
});
