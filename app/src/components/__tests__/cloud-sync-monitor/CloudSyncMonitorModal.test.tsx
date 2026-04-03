import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CloudSyncMonitorModal } from '../../cloud-sync-monitor/CloudSyncMonitorModal';
import type { ActiveSyncRun, LastSyncRunSummary } from '@/src/store/cloudSyncMonitorStore';

const baseActiveRun: ActiveSyncRun = {
  runId: 'run-1',
  startedAt: new Date('2026-04-03T10:00:00+08:00').getTime(),
  phase: 'upload-media',
  phaseIndex: 3,
  entryProgress: {
    completed: 4,
    total: 6,
    currentItemTitle: '早餐记录',
  },
  mediaProgress: {
    completed: 2,
    total: 5,
    currentItemTitle: 'IMG_20260403.JPG',
  },
  queue: [],
};

const baseSummary: LastSyncRunSummary = {
  runId: 'run-summary',
  status: 'success',
  startedAt: new Date('2026-04-03T10:00:00+08:00').getTime(),
  finishedAt: new Date('2026-04-03T10:03:00+08:00').getTime(),
  failedPhase: null,
  entryProcessed: 6,
  mediaProcessed: 5,
  failedItems: [],
};

describe('CloudSyncMonitorModal', () => {
  it('renders the idle state when there is no active run or summary', () => {
    const screen = render(
      <CloudSyncMonitorModal activeRun={null} lastRunSummary={null} lastSyncError={null} onDismiss={jest.fn()} />
    );

    expect(screen.getByText('当前没有正在执行的云同步')).toBeTruthy();
    expect(screen.getByText('你可以在同步开始后回到这里查看进度。')).toBeTruthy();
  });

  it('renders the in-progress timeline and progress counters', () => {
    const screen = render(
      <CloudSyncMonitorModal
        activeRun={baseActiveRun}
        lastRunSummary={null}
        lastSyncError={null}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('正在同步到云端')).toBeTruthy();
    expect(screen.getByText('准备同步')).toBeTruthy();
    expect(screen.getByText('同步记录')).toBeTruthy();
    expect(screen.getByText('上传媒体')).toBeTruthy();
    expect(screen.getByText('校验媒体')).toBeTruthy();
    expect(screen.getByText('记录进度 4 / 6')).toBeTruthy();
    expect(screen.getByText('当前：早餐记录')).toBeTruthy();
    expect(screen.getByText('媒体进度 2 / 5')).toBeTruthy();
    expect(screen.getByText('当前：IMG_20260403.JPG')).toBeTruthy();
  });

  it('renders the completion summary for successful or partial runs', () => {
    const screen = render(
      <CloudSyncMonitorModal
        activeRun={null}
        lastRunSummary={{ ...baseSummary, status: 'partial' }}
        lastSyncError={null}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('最近一次云同步已结束')).toBeTruthy();
    expect(screen.getByText('同步结果')).toBeTruthy();
    expect(screen.getByText('部分完成')).toBeTruthy();
    expect(screen.getByText('记录已处理')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('媒体已处理')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders the failed state and failed items', () => {
    const screen = render(
      <CloudSyncMonitorModal
        activeRun={null}
        lastRunSummary={{
          ...baseSummary,
          status: 'failed',
          failedPhase: 'upload-media',
          failedItems: [
            { id: 'photo-1', title: '封面照片', detail: '上传超时' },
            { id: 'voice-1', title: '语音备忘', detail: '网络中断' },
          ],
        }}
        lastSyncError={null}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('最近一次云同步失败')).toBeTruthy();
    expect(screen.getByText('失败阶段')).toBeTruthy();
    expect(screen.getByText('上传媒体')).toBeTruthy();
    expect(screen.getByText('封面照片')).toBeTruthy();
    expect(screen.getByText('上传超时')).toBeTruthy();
    expect(screen.getByText('语音备忘')).toBeTruthy();
    expect(screen.getByText('网络中断')).toBeTruthy();
  });

  it('renders the idle state with lastSyncError when no run summary exists', () => {
    const screen = render(
      <CloudSyncMonitorModal
        activeRun={null}
        lastRunSummary={null}
        lastSyncError="Network request failed"
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('上次同步遇到错误')).toBeTruthy();
    expect(screen.getByText('错误信息')).toBeTruthy();
    expect(screen.getByText('Network request failed')).toBeTruthy();
  });

  it('dismisses from the footer action', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <CloudSyncMonitorModal activeRun={null} lastRunSummary={null} lastSyncError={null} onDismiss={onDismiss} />
    );

    fireEvent.press(screen.getByTestId('cloud-sync-monitor-dismiss'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
