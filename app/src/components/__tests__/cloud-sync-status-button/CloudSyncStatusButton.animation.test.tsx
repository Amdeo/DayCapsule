import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { CloudSyncStatusButton } from '../../CloudSyncStatusButton';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => <Text>{name ?? 'icon'}</Text>,
  };
});

describe('CloudSyncStatusButton animation lifecycle', () => {
  let loopControllers: Array<{ start: jest.Mock; stop: jest.Mock }>;
  let loopSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    let callIndex = 0;
    loopControllers = [
      { start: jest.fn(), stop: jest.fn() },
      { start: jest.fn(), stop: jest.fn() },
    ];

    loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockImplementation(() => loopControllers[callIndex++] as unknown as Animated.CompositeAnimation);
    timingSpy = jest.spyOn(Animated, 'timing');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('进入 syncing 时启动两组 loop 并调用各自 start', () => {
    const screen = render(
      <CloudSyncStatusButton uiState="pending" onPress={jest.fn()} />,
    );

    loopSpy.mockClear();
    loopControllers.forEach((controller) => {
      controller.start.mockClear();
      controller.stop.mockClear();
    });

    screen.rerender(<CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />);

    expect(loopSpy).toHaveBeenCalledTimes(2);
    expect(loopControllers[0].start).toHaveBeenCalledTimes(1);
    expect(loopControllers[1].start).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('cloud-sync-spinner')).toBeTruthy();
    expect(screen.queryAllByTestId(/cloud-sync-dot-/)).toHaveLength(0);
  });

  it('从 syncing 切回非 syncing 时停止 loop 并重置动画值', () => {
    const { rerender } = render(
      <CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />,
    );

    const timingValues = timingSpy.mock.calls.map((call) => call[0] as Animated.Value);
    const valueCallCount = new Map<Animated.Value, number>();
    timingValues.forEach((value) => {
      valueCallCount.set(value, (valueCallCount.get(value) ?? 0) + 1);
    });
    const breatheValue = Array.from(valueCallCount.entries()).find(([, count]) => count === 2)?.[0];
    const spinValue = Array.from(valueCallCount.entries()).find(([, count]) => count === 1)?.[0];
    expect(breatheValue).toBeDefined();
    expect(spinValue).toBeDefined();
    if (!breatheValue || !spinValue) {
      throw new Error('无法捕获 syncing 状态创建的 Animated.Value 实例');
    }

    const breatheStopSpy = jest.spyOn(breatheValue, 'stopAnimation');
    const breatheSetValueSpy = jest.spyOn(breatheValue, 'setValue');
    const spinStopSpy = jest.spyOn(spinValue, 'stopAnimation');
    const spinSetValueSpy = jest.spyOn(spinValue, 'setValue');

    loopControllers.forEach((controller) => {
      controller.stop.mockClear();
    });
    breatheStopSpy.mockClear();
    breatheSetValueSpy.mockClear();
    spinStopSpy.mockClear();
    spinSetValueSpy.mockClear();

    rerender(<CloudSyncStatusButton uiState="synced" onPress={jest.fn()} />);

    expect(loopControllers[0].stop).toHaveBeenCalled();
    expect(loopControllers[1].stop).toHaveBeenCalled();
    expect(breatheStopSpy).toHaveBeenCalled();
    expect(spinStopSpy).toHaveBeenCalled();
    expect(breatheSetValueSpy).toHaveBeenCalledWith(1);
    expect(spinSetValueSpy).toHaveBeenCalledWith(0);
  });

  it('组件卸载时清理动画资源', () => {
    const { unmount } = render(
      <CloudSyncStatusButton uiState="syncing" onPress={jest.fn()} />,
    );

    const timingValues = timingSpy.mock.calls.map((call) => call[0] as Animated.Value);
    const valueCallCount = new Map<Animated.Value, number>();
    timingValues.forEach((value) => {
      valueCallCount.set(value, (valueCallCount.get(value) ?? 0) + 1);
    });
    const breatheValue = Array.from(valueCallCount.entries()).find(([, count]) => count === 2)?.[0];
    const spinValue = Array.from(valueCallCount.entries()).find(([, count]) => count === 1)?.[0];
    expect(breatheValue).toBeDefined();
    expect(spinValue).toBeDefined();
    if (!breatheValue || !spinValue) {
      throw new Error('无法捕获 syncing 状态创建的 Animated.Value 实例');
    }

    const breatheStopSpy = jest.spyOn(breatheValue, 'stopAnimation');
    const spinStopSpy = jest.spyOn(spinValue, 'stopAnimation');

    loopControllers.forEach((controller) => {
      controller.stop.mockClear();
    });
    breatheStopSpy.mockClear();
    spinStopSpy.mockClear();

    unmount();

    expect(loopControllers[0].stop).toHaveBeenCalledTimes(1);
    expect(loopControllers[1].stop).toHaveBeenCalledTimes(1);
    expect(breatheStopSpy).toHaveBeenCalled();
    expect(spinStopSpy).toHaveBeenCalled();
  });
});
