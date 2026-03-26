jest.mock('@/src/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/src/services/showErrorFeedback', () => ({
  showErrorFeedback: jest.fn(),
}));

// Mock DetailPageShell to avoid native module dependencies
jest.mock('../DetailPageShell', () => ({
  DetailPageShell: ({ children, visible }: any) =>
    visible ? children : null,
}));

import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '@/src/store/authStore';
import { showErrorFeedback } from '@/src/services/showErrorFeedback';

const mockLogin = jest.fn();
const mockRegister = jest.fn();

(useAuthStore as unknown as jest.Mock).mockReturnValue({
  login: mockLogin,
  register: mockRegister,
  isAuthenticated: false,
});

beforeEach(() => jest.clearAllMocks());

describe('LoginPage', () => {
  it('renders the login page shell inside the existing detail shell', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    expect(getByTestId('login-page-root')).toBeTruthy();
    expect(getByPlaceholderText('邮箱')).toBeTruthy();
    expect(getByText('登录')).toBeTruthy();
  });

  it('renders login form by default', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );
    expect(getByPlaceholderText('邮箱')).toBeTruthy();
    expect(getByPlaceholderText('密码')).toBeTruthy();
    expect(getByText('登录')).toBeTruthy();
  });

  it('calls login on submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const onSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={onSuccess} />
    );

    fireEvent.changeText(getByPlaceholderText('邮箱'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('密码'), 'Password1');
    fireEvent.press(getByText('登录'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'Password1');
    });
  });

  it('alerts when email or password is missing and does not call login', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const screen = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.press(screen.getByText('登录'));

    expect(alertSpy).toHaveBeenCalledWith('提示', '请填写邮箱和密码');
    expect(mockLogin).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('密码'), 'Password1');
    fireEvent.press(screen.getByText('登录'));

    expect(alertSpy).toHaveBeenCalledWith('提示', '请填写邮箱和密码');
    expect(mockLogin).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText('邮箱'), 'user@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('密码'), '');
    fireEvent.press(screen.getByText('登录'));

    expect(alertSpy).toHaveBeenCalledWith('提示', '请填写邮箱和密码');
    expect(mockLogin).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('calls onSuccess and clears inputs after a successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const onSuccess = jest.fn();
    const screen = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={onSuccess} />
    );

    fireEvent.changeText(screen.getByPlaceholderText('邮箱'), ' user@test.com ');
    fireEvent.changeText(screen.getByPlaceholderText('密码'), 'Password1');
    fireEvent.press(screen.getByText('登录'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.getByPlaceholderText('邮箱')).toHaveProp('value', '');
    expect(screen.getByPlaceholderText('密码')).toHaveProp('value', '');
  });

  it('prevents duplicate submits and hides submit text while loading', async () => {
    let resolveLogin: () => void;
    mockLogin.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );
    const onSuccess = jest.fn();
    const screen = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={onSuccess} />
    );

    fireEvent.changeText(screen.getByPlaceholderText('邮箱'), 'test@test.com');
    fireEvent.changeText(screen.getByPlaceholderText('密码'), 'Password1');

    const [submitButton] = screen.UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(submitButton);

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('登录')).toBeNull());

    const buttonsAfterLoading = screen.UNSAFE_getAllByType(TouchableOpacity);
    const loadingButton = buttonsAfterLoading.find((button) => button.props.disabled);
    expect(loadingButton).toBeTruthy();
    expect(mockLogin).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin!();
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows branded feedback when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('401'));
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.changeText(getByPlaceholderText('邮箱'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('密码'), 'Password1');
    fireEvent.press(getByText('登录'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '登录失败',
          dedupeKey: 'auth-login-failed',
        })
      );
    });
  });

  it('switches to register mode', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.press(getByText('没有账户？注册'));
    expect(getByPlaceholderText('确认密码')).toBeTruthy();
    expect(getByText('注册')).toBeTruthy();
  });

  it('alerts when register passwords do not match', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.press(getByText('没有账户？注册'));
    fireEvent.changeText(getByPlaceholderText('邮箱'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('密码'), 'Password1');
    fireEvent.changeText(getByPlaceholderText('确认密码'), 'Password2');
    fireEvent.press(getByText('注册'));

    expect(alertSpy).toHaveBeenCalledWith('提示', '两次输入的密码不一致');
    expect(mockRegister).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('clears confirm password when switching modes', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.press(getByText('没有账户？注册'));
    fireEvent.changeText(getByPlaceholderText('确认密码'), 'Password1');
    fireEvent.press(getByText('已有账户？登录'));
    fireEvent.press(getByText('没有账户？注册'));

    expect(getByPlaceholderText('确认密码')).toHaveProp('value', '');
  });

  it('calls onSuccess and clears inputs after a successful register', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const onSuccess = jest.fn();
    const screen = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={onSuccess} />
    );

    fireEvent.press(screen.getByText('没有账户？注册'));
    fireEvent.changeText(screen.getByPlaceholderText('邮箱'), ' user@test.com ');
    fireEvent.changeText(screen.getByPlaceholderText('密码'), 'Password1');
    fireEvent.changeText(screen.getByPlaceholderText('确认密码'), 'Password1');
    fireEvent.press(screen.getByText('注册'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.getByPlaceholderText('邮箱')).toHaveProp('value', '');
    expect(screen.getByPlaceholderText('密码')).toHaveProp('value', '');
    expect(screen.getByPlaceholderText('确认密码')).toHaveProp('value', '');
  });

  it('shows register-specific feedback when register fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('409'));
    const { getByPlaceholderText, getByText } = render(
      <LoginPage visible={true} onClose={jest.fn()} onSuccess={jest.fn()} />
    );

    fireEvent.press(getByText('没有账户？注册'));
    fireEvent.changeText(getByPlaceholderText('邮箱'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('密码'), 'Password1');
    fireEvent.changeText(getByPlaceholderText('确认密码'), 'Password1');
    fireEvent.press(getByText('注册'));

    await waitFor(() => {
      expect(showErrorFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '注册失败',
          dedupeKey: 'auth-register-failed',
        })
      );
    });
  });
});
