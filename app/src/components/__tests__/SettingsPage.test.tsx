import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
} from './helpers/renderSettingsPage';

describe('SettingsPage assembly', () => {
  beforeEach(() => {
    resetRenderSettingsPageMocks();
  });

  it('renders the core settings sections and shared entry points', async () => {
    const { screen } = await renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('< 0.1 MB')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-page-root')).toBeTruthy();
    expect(screen.getByTestId('settings-backend-card')).toBeTruthy();
    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByTestId('settings-open-login')).toBeTruthy();
    expect(screen.getByText('登录 / 注册')).toBeTruthy();
    expect(screen.getByText('登录后可使用云端同步功能')).toBeTruthy();
    expect(screen.getByText('日历内容区密度')).toBeTruthy();
    expect(screen.getByText('预制标签管理')).toBeTruthy();
  });

  it('opens the tag management dialog from the shared settings entry', async () => {
    const { screen } = await renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-tag-management'));

    expect(await screen.findByTestId('settings-tag-management-dialog')).toBeTruthy();
  });

  it('renders the preset tag management entry with subtitle and stable testID', async () => {
    const { screen } = await renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('标签管理')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
    expect(screen.getByText('管理可快速选择的预制标签')).toBeTruthy();
  });

  it('renders the regrouped settings sections and support entries', async () => {
    const { screen } = await renderSettingsPage();

    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('提醒')).toBeTruthy();
    expect(screen.getByText('内容显示')).toBeTruthy();
    expect(screen.getByText('数据与存储')).toBeTruthy();
    expect(screen.getByText('标签管理')).toBeTruthy();
    expect(screen.getByText('支持')).toBeTruthy();
    expect(screen.getByText('危险操作')).toBeTruthy();

    expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
    expect(screen.getByTestId('settings-open-help')).toBeTruthy();
    expect(screen.getByTestId('settings-open-about')).toBeTruthy();
  });

  it('opens help and about pages from support entries', async () => {
    const { screen } = await renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-help'));
    expect(await screen.findByTestId('help-page-root')).toBeTruthy();
    expect(screen.getAllByText('帮助与反馈').length).toBeGreaterThan(1);

    fireEvent.press(screen.getByTestId('settings-open-about'));
    expect(await screen.findByTestId('about-page-root')).toBeTruthy();
    expect(screen.getAllByText('关于').length).toBeGreaterThan(1);
  });

  it('opens the login dialog from the real unauthenticated account entry', async () => {
    // Note: unauthenticated real UI does not render the cloud-mode switch; only the login entry is available.
    const { screen } = await renderSettingsPage({ authenticated: false });

    fireEvent.press(screen.getByTestId('settings-open-login'));

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
  });
});
