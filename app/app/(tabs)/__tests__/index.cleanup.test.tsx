import React from 'react';
import { act } from '@testing-library/react-native';
import { renderHomeScreen } from '@/src/components/__tests__/helpers/renderHomeScreen';

let capturedOnQuickAdd: undefined | ((type: 'text' | 'photo' | 'voice') => Promise<void> | void);

// Reuse the shared HomeScreen harness for a stable, minimal environment, and only
// stub Timeline to get access to the onQuickAdd entry point.
jest.mock('@/src/components/Timeline.v2', () => {
  return {
    Timeline: ({ onQuickAdd }: { onQuickAdd?: (type: 'text' | 'photo' | 'voice') => Promise<void> | void }) => {
      capturedOnQuickAdd = onQuickAdd;
      return null;
    },
  };
});

describe('HomeScreen cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnQuickAdd = undefined;
  });

  it('clears the active recording timer when HomeScreen unmounts', async () => {
    jest.useFakeTimers();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { screen } = renderHomeScreen({ cloudMode: true });
    expect(capturedOnQuickAdd).toBeDefined();

    // Drive the real HomeScreen recording start path so it allocates an interval.
    const intervalCallsBeforeStart = setIntervalSpy.mock.calls.length;
    await act(async () => {
      await capturedOnQuickAdd?.('voice');
    });

    const startPhaseCalls = setIntervalSpy.mock.calls.slice(intervalCallsBeforeStart);
    const startPhaseHandles = setIntervalSpy.mock.results
      .slice(intervalCallsBeforeStart)
      .map((result) => result.value);

    expect(startPhaseHandles.length).toBeGreaterThan(0);

    // Prefer the poll interval handle if we can identify it by delay; otherwise, if only one
    // interval was started in this phase, it must be the recording timer.
    const candidatesByDelay = startPhaseCalls
      .map((call, index) => ({
        delay: call[1],
        handle: startPhaseHandles[index],
      }))
      .filter(({ delay }) => Number(delay) === 250);

    const recordingTimerHandle =
      candidatesByDelay.length === 1
        ? candidatesByDelay[0].handle
        : startPhaseHandles.length === 1
          ? startPhaseHandles[0]
          : undefined;

    expect(recordingTimerHandle).toBeDefined();

    screen.unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(recordingTimerHandle);

    jest.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
