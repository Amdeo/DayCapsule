import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useConfirmDialogStore } from '@/src/store/confirmDialogStore';
import { ConfirmDialogHost } from '../ConfirmDialogHost';

const mockLoggerError = jest.fn();

jest.mock('@/src/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock('../ConfirmDialogModal', () => ({
  ConfirmDialogModal: ({ visible, request, onDismiss }: any) => {
    const { Pressable, Text, View } = require('react-native');

    if (!visible || !request) {
      return null;
    }

    return (
      <View>
        <Text>{request.title}</Text>
        <Pressable testID="confirm-dialog-host-dismiss" onPress={onDismiss}>
          <Text>关闭</Text>
        </Pressable>
        {request.actions.map((action: any, index: number) => (
          <Pressable
            key={`${action.label}-${index}`}
            testID={action.testID ?? `confirm-dialog-host-action-${index}`}
            onPress={action.onPress}
          >
            <Text>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

describe('ConfirmDialogHost', () => {
  beforeEach(() => {
    mockLoggerError.mockClear();
    useConfirmDialogStore.setState({
      current: null,
      activeDedupeKey: null,
    });
  });

  it('renders nothing when hidden', () => {
    const screen = render(<ConfirmDialogHost />);

    expect(screen.queryByTestId('confirm-dialog-host-action-0')).toBeNull();
  });

  it('renders after the store shows a dialog request', () => {
    const screen = render(<ConfirmDialogHost />);

    act(() => {
      useConfirmDialogStore.getState().show({
        title: '删除回忆',
        actions: [{ label: '删除', role: 'danger' }],
      });
    });

    expect(screen.getByText('删除回忆')).toBeTruthy();
  });

  it('dismisses the current request before running the wrapped action', async () => {
    const callOrder: string[] = [];
    useConfirmDialogStore.getState().show({
      title: '删除回忆',
      actions: [
        {
          label: '删除',
          role: 'danger',
          onPress: jest.fn(() => {
            callOrder.push(useConfirmDialogStore.getState().current ? 'action-before-dismiss' : 'dismissed');
          }),
        },
      ],
    });

    const screen = render(<ConfirmDialogHost />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('confirm-dialog-host-action-0'));
    });

    expect(callOrder).toEqual(['dismissed']);
    expect(useConfirmDialogStore.getState().current).toBeNull();
    expect(screen.queryByText('删除回忆')).toBeNull();
  });

  it('closes after dismiss is triggered', () => {
    useConfirmDialogStore.getState().show({
      title: '删除回忆',
      actions: [{ label: '取消', role: 'secondary' }],
    });

    const screen = render(<ConfirmDialogHost />);
    fireEvent.press(screen.getByTestId('confirm-dialog-host-dismiss'));

    expect(useConfirmDialogStore.getState().current).toBeNull();
    expect(screen.queryByText('删除回忆')).toBeNull();
  });

  it('dismisses and logs when a wrapped async action rejects', async () => {
    const actionError = new Error('delete failed');
    useConfirmDialogStore.getState().show({
      title: '删除回忆',
      actions: [
        {
          label: '删除',
          role: 'danger',
          onPress: jest.fn().mockRejectedValue(actionError),
        },
      ],
    });

    const screen = render(<ConfirmDialogHost />);

    await expect(
      act(async () => {
        fireEvent.press(screen.getByTestId('confirm-dialog-host-action-0'));
      })
    ).resolves.toBeUndefined();

    expect(useConfirmDialogStore.getState().current).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[ConfirmDialogHost] dialog action failed:',
      actionError
    );
  });

  it('dismisses before logging when a wrapped action throws synchronously', async () => {
    const actionError = new Error('delete sync failed');
    const actionSpy = jest.fn(() => {
      expect(useConfirmDialogStore.getState().current).toBeNull();
      throw actionError;
    });
    useConfirmDialogStore.getState().show({
      title: '删除回忆',
      actions: [{ label: '删除', role: 'danger', onPress: actionSpy }],
    });

    const screen = render(<ConfirmDialogHost />);

    await expect(
      act(async () => {
        fireEvent.press(screen.getByTestId('confirm-dialog-host-action-0'));
      })
    ).resolves.toBeUndefined();

    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(useConfirmDialogStore.getState().current).toBeNull();
    expect(screen.queryByText('删除回忆')).toBeNull();
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[ConfirmDialogHost] dialog action failed:',
      actionError
    );
  });
});
