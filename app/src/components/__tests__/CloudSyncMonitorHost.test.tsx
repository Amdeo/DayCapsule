import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { CloudSyncMonitorHost } from '../cloud-sync-monitor/CloudSyncMonitorHost';
import { useCloudSyncMonitorStore } from '@/src/store/cloudSyncMonitorStore';

jest.mock('../cloud-sync-monitor/CloudSyncMonitorModal', () => ({
  CloudSyncMonitorModal: ({ activeRun, lastRunSummary, onDismiss }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <View testID="cloud-sync-monitor-modal">
        <Text>{activeRun ? activeRun.runId : 'no-active-run'}</Text>
        <Text>{lastRunSummary ? lastRunSummary.runId : 'no-summary'}</Text>
        <Pressable testID="cloud-sync-monitor-dismiss" onPress={onDismiss}>
          <Text>关闭</Text>
        </Pressable>
      </View>
    );
  },
}));

describe('CloudSyncMonitorHost', () => {
  beforeEach(() => {
    useCloudSyncMonitorStore.setState({
      activeRun: null,
      lastRunSummary: null,
      isVisible: false,
    });
  });

  it('renders nothing when hidden', () => {
    const screen = render(<CloudSyncMonitorHost />);

    expect(screen.queryByTestId('cloud-sync-monitor-modal')).toBeNull();
  });

  it('renders after the store shows the monitor', () => {
    const screen = render(<CloudSyncMonitorHost />);

    act(() => {
      useCloudSyncMonitorStore.setState({
        activeRun: {
          runId: 'run-active',
          startedAt: 1,
          phase: 'sync-entries',
          phaseIndex: 2,
          entryProgress: { completed: 2, total: 3, currentItemTitle: '第 2 条' },
          mediaProgress: { completed: 0, total: 1, currentItemTitle: null },
          queue: [],
        },
        lastRunSummary: {
          runId: 'run-summary',
          status: 'success',
          startedAt: 1,
          finishedAt: 2,
          failedPhase: null,
          entryProcessed: 3,
          mediaProcessed: 1,
          failedItems: [],
        },
      });
      useCloudSyncMonitorStore.getState().show();
    });

    expect(screen.getByTestId('cloud-sync-monitor-modal')).toBeTruthy();
    expect(screen.getByText('run-active')).toBeTruthy();
    expect(screen.getByText('run-summary')).toBeTruthy();
  });

  it('closes after dismiss is triggered', () => {
    const screen = render(<CloudSyncMonitorHost />);

    act(() => {
      useCloudSyncMonitorStore.getState().show();
    });

    fireEvent.press(screen.getByTestId('cloud-sync-monitor-dismiss'));

    expect(useCloudSyncMonitorStore.getState().isVisible).toBe(false);
    expect(screen.queryByTestId('cloud-sync-monitor-modal')).toBeNull();
  });
});
