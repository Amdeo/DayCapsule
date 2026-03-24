import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppDialogModal } from '../AppDialogModal';

describe('AppDialogModal', () => {
  it('renders title, message and actions', () => {
    const screen = render(
      <AppDialogModal
        visible
        request={{
          title: '同步失败',
          message: '请检查网络连接后重试。',
          actions: [
            { label: '稍后', role: 'secondary' },
            { label: '重试', role: 'primary' },
          ],
        }}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('同步失败')).toBeTruthy();
    expect(screen.getByText('请检查网络连接后重试。')).toBeTruthy();
    expect(screen.getByTestId('app-dialog-action-0').props.children).toBe('稍后');
    expect(screen.getByTestId('app-dialog-action-1').props.children).toBe('重试');
  });

  it('does not dismiss on backdrop press when blocking is true', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <AppDialogModal
        visible
        request={{
          title: '退出登录',
          blocking: true,
          actions: [
            { label: '取消', role: 'secondary' },
            { label: '退出', role: 'destructive' },
          ],
        }}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(screen.getByTestId('app-dialog-backdrop'));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on backdrop press when blocking is false', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <AppDialogModal
        visible
        request={{
          title: '已保存',
          actions: [{ label: '知道了', role: 'primary' }],
        }}
        onDismiss={onDismiss}
      />
    );

    fireEvent.press(screen.getByTestId('app-dialog-backdrop'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders structured detail rows and more than two actions', () => {
    const screen = render(
      <AppDialogModal
        visible
        request={{
          title: '数据同步',
          details: [
            { label: '云端', value: '3 条' },
            { label: '本地', value: '2 条' },
          ],
          blocking: true,
          actions: [
            { label: '使用云端数据', role: 'primary' },
            { label: '上传本地数据', role: 'secondary' },
            { label: '取消', role: 'secondary' },
          ],
        }}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('云端')).toBeTruthy();
    expect(screen.getByText('3 条')).toBeTruthy();
    expect(screen.getByTestId('app-dialog-action-2').props.children).toBe('取消');
  });
});
