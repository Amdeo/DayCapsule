import type { Entry } from '@/src/types/entry';
import { renderHomeScreen } from '../helpers/renderHomeScreen';

describe('HomeScreen timeline interactions', () => {
  it('switches from the empty state to timeline entries when the home store receives data', () => {
    const { screen, controls } = renderHomeScreen();

    expect(screen.getByTestId('timeline-empty-state')).toBeTruthy();

    controls.setEntries([
      {
        id: 'entry-text-1',
        type: 'text',
        content: '新出现的首页记录',
        timestamp: new Date('2026-03-27T10:00:00+08:00').getTime(),
        syncStatus: 'synced',
      } as Entry,
    ]);

    expect(screen.getByTestId('timeline-entry-entry-text-1')).toBeTruthy();
    expect(screen.queryByTestId('timeline-empty-state')).toBeNull();
  });
});
