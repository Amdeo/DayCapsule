import React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  renderSettingsPage,
  resetRenderSettingsPageMocks,
  setMockSessionSnapshot,
  triggerLatestLoginSuccess,
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
    expect(screen.getByTestId('settings-open-login')).toBeTruthy();
    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('登录 / 注册')).toBeTruthy();
    expect(screen.getByText('登录后即可开启云同步保护当前数据')).toBeTruthy();
    expect(screen.getByText('日历密度')).toBeTruthy();
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
      expect(screen.getByText('数据管理')).toBeTruthy();
    });

    expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
    expect(screen.getByText('管理可快速选择的预制标签')).toBeTruthy();
  });

  it('renders the regrouped settings sections and support entries', async () => {
    const { screen } = await renderSettingsPage();

    expect(screen.getByText('账户与同步')).toBeTruthy();
    expect(screen.getByText('外观')).toBeTruthy();
    expect(screen.getByText('数据管理')).toBeTruthy();
    expect(screen.getByText('关于与支持')).toBeTruthy();

    expect(screen.getByTestId('settings-open-tag-management')).toBeTruthy();
    expect(screen.getByTestId('settings-open-help')).toBeTruthy();
    expect(screen.getByTestId('settings-open-about')).toBeTruthy();
    expect(screen.getByTestId('settings-open-backend-server')).toBeTruthy();

    const displaySection = screen.getByTestId('settings-section-display');
    const dataStorageSection = screen.getByTestId('settings-section-data-storage');
    const accountSection = screen.getByTestId('settings-section-account-sync');

    expect(within(displaySection).queryByTestId('settings-switch-high-quality-photos')).toBeNull();
    expect(within(dataStorageSection).getByTestId('settings-switch-high-quality-photos')).toBeTruthy();
    expect(within(dataStorageSection).getByText('清除缓存')).toBeTruthy();
    expect(within(dataStorageSection).getByText('恢复 APP 初始状态')).toBeTruthy();
    expect(within(dataStorageSection).queryByText('重置设置')).toBeNull();
    expect(within(accountSection).getByTestId('settings-open-backend-server')).toBeTruthy();
  });

  it('renders settings sections in fixed order', async () => {
    const { screen } = await renderSettingsPage();

    const findNodeByTestId = (
      node: unknown,
      testID: string,
    ): { props?: { testID?: string }; children?: unknown[] } | null => {
      if (!node) {
        return null;
      }
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findNodeByTestId(child, testID);
          if (found) {
            return found;
          }
        }
        return null;
      }
      if (typeof node !== 'object') {
        return null;
      }
      const candidate = node as { props?: { testID?: string }; children?: unknown[] };
      if (candidate.props?.testID === testID) {
        return candidate;
      }
      if (candidate.children) {
        for (const child of candidate.children) {
          const found = findNodeByTestId(child, testID);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    const settingsRootNode = findNodeByTestId(screen.toJSON(), 'settings-page-root');
    const rootChildren = settingsRootNode?.children ?? [];
    const findSectionIndex = (testID: string) => rootChildren.findIndex((child) => (
      typeof child === 'object'
      && child !== null
      && 'props' in child
      && (child as { props?: { testID?: string } }).props?.testID === testID
    ));

    const accountSyncIndex = findSectionIndex('settings-section-account-sync');
    const displayIndex = findSectionIndex('settings-section-display');
    const dataStorageIndex = findSectionIndex('settings-section-data-storage');
    const supportIndex = findSectionIndex('settings-section-support');

    expect(accountSyncIndex).toBeGreaterThanOrEqual(0);
    expect(accountSyncIndex).toBeLessThan(displayIndex);
    expect(displayIndex).toBeLessThan(dataStorageIndex);
    expect(dataStorageIndex).toBeLessThan(supportIndex);
  });

  it('renders the profile card with storage info and account status', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true });

    const profileCard = screen.getByTestId('settings-profile-card');
    expect(profileCard).toBeTruthy();
    expect(within(profileCard).getByText('tester@example.com')).toBeTruthy();

    const accountSection = screen.getByTestId('settings-section-account-sync');
    expect(accountSection).toBeTruthy();
  });

  it('shows profile card with login button when not authenticated', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });

    const profileCard = screen.getByTestId('settings-profile-card');
    expect(profileCard).toBeTruthy();
    expect(within(profileCard).getByText('未登录')).toBeTruthy();
    expect(within(profileCard).getByText('< 0.1 MB')).toBeTruthy();
  });

  it('falls back to non-empty account title when authenticated user email is missing', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true, userEmail: null });
    const profileCard = screen.getByTestId('settings-profile-card');

    expect(within(profileCard).getByText('已登录')).toBeTruthy();
  });

  it('opens help page from support entry with real close path', async () => {
    const { screen } = await renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-help'));
    expect(await screen.findByTestId('help-page-root')).toBeTruthy();
    expect(screen.getByTestId('detail-page-title-帮助与反馈')).toBeTruthy();

    const backdrops = screen.getAllByTestId('detail-page-backdrop');
    fireEvent.press(backdrops[backdrops.length - 1]);
    await waitFor(() => {
      expect(screen.queryByTestId('help-page-root')).toBeNull();
    });
  });

  it('opens about page from support entry with real close path', async () => {
    const { screen } = await renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-about'));
    expect(await screen.findByTestId('about-page-root')).toBeTruthy();
    expect(screen.getByTestId('detail-page-title-关于')).toBeTruthy();

    const backdrops = screen.getAllByTestId('detail-page-backdrop');
    fireEvent.press(backdrops[backdrops.length - 1]);
    await waitFor(() => {
      expect(screen.queryByTestId('about-page-root')).toBeNull();
    });
  });

  it('keeps help and about mutually exclusive when switching entries', async () => {
    const { screen } = await renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-help'));
    expect(await screen.findByTestId('help-page-root')).toBeTruthy();

    fireEvent.press(screen.getByTestId('settings-open-about'));
    expect(await screen.findByTestId('about-page-root')).toBeTruthy();
    expect(screen.queryByTestId('help-page-root')).toBeNull();
  });

  it('opens the login dialog from the real unauthenticated account entry', async () => {
    const { screen } = await renderSettingsPage({ authenticated: false });

    fireEvent.press(screen.getByTestId('settings-open-login'));

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
  });

  it('refreshes the account switcher after login success and shows the current account immediately', async () => {
    const { screen, mocks } = await renderSettingsPage({ authenticated: false });

    mocks.accountSwitcher.refresh.mockImplementation(async () => {
      mocks.accountSwitcher.accounts = [
        {
          serverUrl: 'https://server-a.example.com',
          userId: 'user-1',
          email: 'tester@example.com',
          addedAt: Date.now(),
        },
      ];
      mocks.accountSwitcher.activeRef = {
        serverUrl: 'https://server-a.example.com',
        userId: 'user-1',
      };
    });

    fireEvent.press(screen.getByTestId('settings-open-login'));
    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();

    Object.assign(mocks.auth, {
      user: { email: 'tester@example.com' },
      isAuthenticated: true,
    });
    setMockSessionSnapshot({
      currentScopeKey: 'account',
      isTransitioning: false,
      isAccountScopeActive: true,
      canRunCloudSync: true,
    });

    await act(async () => {
      await triggerLatestLoginSuccess();
    });

    await waitFor(() => {
      expect(mocks.accountSwitcher.refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByText('切换账号')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('切换账号'));
    });

    await waitFor(() => {
      expect(mocks.accountSwitcher.refresh).toHaveBeenCalledTimes(2);
      expect(screen.getAllByText('tester@example.com').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('confirms clearing cache, then resets app and shows success feedback', async () => {
    const { screen, mocks } = await renderSettingsPage();

    fireEvent.press(screen.getByText('清除缓存'));

    expect(mocks.showConfirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: '清除缓存',
      message: '确定要清除当前设备上的本地数据并恢复到首次打开 APP 时的状态吗？这会清空记录、媒体、设置、登录状态，并将当前服务器地址恢复到默认值。最近使用过的服务器地址会保留。',
    }));

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    const confirm = actions.find((action) => action.label === '清除');

    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(mocks.resetAppToInitialState).toHaveBeenCalledTimes(1);
    expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
      title: '成功',
      message: 'APP 已恢复到初始状态',
    }));
  });

  it('shows branded feedback when app reset fails after confirmation', async () => {
    const { screen, mocks } = await renderSettingsPage();

    mocks.resetAppToInitialState.mockRejectedValueOnce(new Error('mmkv locked'));

    fireEvent.press(screen.getByText('清除缓存'));

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    const confirm = actions.find((action) => action.label === '清除');

    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(mocks.resetAppToInitialState).toHaveBeenCalledTimes(1);
    expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
      title: '恢复失败',
      message: 'mmkv locked',
    }));
  });

  it('shows backend save success feedback for save and switch results', async () => {
    const { screen, mocks } = await renderSettingsPage();

    fireEvent.press(screen.getByTestId('settings-open-backend-server'));

    fireEvent.changeText(screen.getByTestId('settings-backend-input'), 'https://server-new.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);
    });

    fireEvent.press(screen.getByTestId('settings-backend-save-button'));

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
        title: '切换成功',
        message: '后端已切换，请重新登录',
      }));
    });

    mocks.showErrorFeedback.mockClear();
    mocks.switchBackendEnvironment.mockResolvedValueOnce({
      switched: false,
      currentServerUrl: 'https://server-keep.example.com',
    });

    fireEvent.changeText(screen.getByTestId('settings-backend-input'), 'https://server-keep.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);
    });

    fireEvent.press(screen.getByTestId('settings-backend-save-button'));

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
        title: '保存成功',
        message: '后端地址已更新',
      }));
    });
  });

  it('shows backend save failure feedback when saving backend server throws', async () => {
    const { screen, mocks } = await renderSettingsPage();

    mocks.switchBackendEnvironment.mockRejectedValueOnce(new Error('backend offline'));

    fireEvent.press(screen.getByTestId('settings-open-backend-server'));

    fireEvent.changeText(screen.getByTestId('settings-backend-input'), 'https://server-fail.example.com');
    fireEvent.press(screen.getByTestId('settings-backend-test-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-backend-save-button').props.accessibilityState.disabled).toBe(false);
    });

    fireEvent.press(screen.getByTestId('settings-backend-save-button'));

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
        title: '切换失败',
        message: 'backend offline',
      }));
    });
  });

  it('shows branded feedback when saving card spacing fails', async () => {
    const { screen, mocks } = await renderSettingsPage();
    const displaySection = screen.getByTestId('settings-section-display');

    mocks.settings.setCardSpacing.mockRejectedValueOnce(new Error('mmkv locked'));

    fireEvent.press(within(displaySection).getAllByText('宽松')[0]);

    await waitFor(() => {
      expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
        title: '保存失败',
        message: 'mmkv locked',
      }));
    });
  });
});
