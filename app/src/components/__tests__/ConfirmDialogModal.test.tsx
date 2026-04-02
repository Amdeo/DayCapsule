import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ConfirmDialogModal } from '../ConfirmDialogModal';

describe('ConfirmDialogModal', () => {
  const actionOnPress = jest.fn();
  const request = {
    title: '删除回忆',
    message: '删除后不可恢复，确认继续吗？',
    actions: [
      { label: '取消', role: 'secondary' as const },
      { label: '删除', role: 'danger' as const, onPress: actionOnPress },
    ],
  };

  beforeEach(() => {
    actionOnPress.mockClear();
  });

  it('renders title, message and actions', () => {
    const screen = render(
      <ConfirmDialogModal visible request={request} onDismiss={jest.fn()} />
    );

    expect(screen.getByText('删除回忆')).toBeTruthy();
    expect(screen.getByText('删除后不可恢复，确认继续吗？')).toBeTruthy();
    expect(screen.getByTestId('confirm-dialog-action-0')).toBeTruthy();
    expect(screen.getByTestId('confirm-dialog-action-1')).toBeTruthy();
    expect(screen.getByText('取消')).toBeTruthy();
    expect(screen.getByText('删除')).toBeTruthy();
  });

  it('returns null when hidden or request is null', () => {
    const hidden = render(
      <ConfirmDialogModal visible={false} request={request} onDismiss={jest.fn()} />
    );
    const empty = render(
      <ConfirmDialogModal visible request={null} onDismiss={jest.fn()} />
    );

    expect(hidden.queryByTestId('confirm-dialog-card')).toBeNull();
    expect(empty.queryByTestId('confirm-dialog-card')).toBeNull();
  });

  it('calls onDismiss when backdrop is pressed and dialog is dismissible', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <ConfirmDialogModal
        visible
        request={{ ...request, dismissible: true }}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(screen.getByTestId('confirm-dialog-backdrop'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when backdrop is pressed and dialog is not dismissible', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <ConfirmDialogModal
        visible
        request={{ ...request, dismissible: false }}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(screen.getByTestId('confirm-dialog-backdrop'));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls action.onPress when an action button is pressed', () => {
    const screen = render(
      <ConfirmDialogModal visible request={request} onDismiss={jest.fn()} />
    );

    fireEvent.press(screen.getByTestId('confirm-dialog-action-1'));

    expect(actionOnPress).toHaveBeenCalledTimes(1);
  });
});
