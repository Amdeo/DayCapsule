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
  it('keeps a helper trigger bound to its own render after a later render mounts', async () => {
    const firstRender = renderHomeScreen({
      entries: [workEntry],
    });
    const secondRender = renderHomeScreen({
      entries: [travelEntry],
    });

    expect(secondRender.screen.getByTestId('timeline-entry-entry-travel-1')).toBeTruthy();

    firstRender.spies.startRecording.mockClear();

    await act(async () => {
      await firstRender.spies.triggerQuickAddVoice?.();
    });

    expect(firstRender.spies.loggerError).not.toHaveBeenCalled();
    expect(firstRender.spies.startRecording).toHaveBeenCalledTimes(1);
    expect(firstRender.screen.getByTestId('timeline-entry-mock-entry-2')).toBeTruthy();
    expect(secondRender.screen.getByTestId('timeline-entry-entry-travel-1')).toBeTruthy();
    expect(secondRender.screen.queryByTestId('timeline-entry-mock-entry-2')).toBeNull();

    firstRender.screen.unmount();
    secondRender.screen.unmount();
  });
});
