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
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
});
