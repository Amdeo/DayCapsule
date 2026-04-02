import React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
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
      expect(within(screen.getByTestId('settings-storage-card')).getByText('< 0.1 MB')).toBeTruthy();
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

    const displaySection = screen.getByTestId('settings-section-display');
    const dataStorageSection = screen.getByTestId('settings-section-data-storage');

    expect(within(displaySection).queryByTestId('settings-switch-high-quality-photos')).toBeNull();
    expect(within(dataStorageSection).getByTestId('settings-switch-high-quality-photos')).toBeTruthy();
    expect(within(dataStorageSection).getByTestId('settings-storage-card')).toBeTruthy();
    expect(within(dataStorageSection).getByText('清除缓存')).toBeTruthy();
  });

  it('renders settings sections in fixed order and keeps reset action in danger section', async () => {
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
    const remindersIndex = findSectionIndex('settings-section-reminders');
    const displayIndex = findSectionIndex('settings-section-display');
    const dataStorageIndex = findSectionIndex('settings-section-data-storage');
    const tagsIndex = findSectionIndex('settings-section-tags');
    const supportIndex = findSectionIndex('settings-section-support');
    const dangerIndex = findSectionIndex('settings-section-danger');

    expect(accountSyncIndex).toBeGreaterThanOrEqual(0);
    expect(accountSyncIndex).toBeLessThan(remindersIndex);
    expect(remindersIndex).toBeLessThan(displayIndex);
    expect(displayIndex).toBeLessThan(dataStorageIndex);
    expect(dataStorageIndex).toBeLessThan(tagsIndex);
    expect(tagsIndex).toBeLessThan(supportIndex);
    expect(supportIndex).toBeLessThan(dangerIndex);

    const supportSection = screen.getByTestId('settings-section-support');
    const dangerSection = screen.getByTestId('settings-section-danger');
    expect(within(dangerSection).getByText('重置设置')).toBeTruthy();
    expect(within(supportSection).queryByText('重置设置')).toBeNull();
  });

  it('falls back to non-empty account title when authenticated user email is missing', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true, userEmail: null });
    const accountSection = screen.getByTestId('settings-section-account-sync');

    expect(within(accountSection).getAllByText('已登录').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the settings overview card with account, sync and storage summary', async () => {
    const { screen } = await renderSettingsPage({ authenticated: true });

    const overviewCard = screen.getByTestId('settings-overview-card');
    const accountSection = screen.getByTestId('settings-section-account-sync');
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
    const firstRootChild = rootChildren[0] as { props?: { testID?: string } } | undefined;
    const overviewIndex = rootChildren.findIndex((child) => (
      typeof child === 'object'
      && child !== null
      && 'props' in child
      && (child as { props?: { testID?: string } }).props?.testID === 'settings-overview-card'
    ));
    const accountSectionIndex = rootChildren.findIndex((child) => (
      typeof child === 'object'
      && child !== null
      && 'props' in child
      && (child as { props?: { testID?: string } }).props?.testID === 'settings-section-account-sync'
    ));

    expect(overviewCard).toBeTruthy();
    expect(accountSection).toBeTruthy();
    expect(within(overviewCard).getByText('当前账号')).toBeTruthy();
    expect(within(overviewCard).getByText('同步模式')).toBeTruthy();
    expect(within(overviewCard).getByText('当前后端')).toBeTruthy();
    expect(within(overviewCard).getByText('存储概览')).toBeTruthy();
    expect(firstRootChild?.props?.testID).toBe('settings-overview-card');
    expect(overviewIndex).toBeLessThan(accountSectionIndex);
    expect(overviewIndex).toBe(0);

    const dataStorageSection = screen.getByTestId('settings-section-data-storage');
    expect(within(dataStorageSection).getByTestId('settings-storage-card')).toBeTruthy();
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
    // Note: unauthenticated real UI does not render the cloud-mode switch; only the login entry is available.
    const { screen } = await renderSettingsPage({ authenticated: false });

    fireEvent.press(screen.getByTestId('settings-open-login'));

    expect(await screen.findByTestId('settings-login-dialog')).toBeTruthy();
  });

  it('confirms reset settings, then resets and shows success feedback', async () => {
    const { screen, mocks } = await renderSettingsPage();

    fireEvent.press(screen.getByText('重置设置'));

    expect(mocks.showConfirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: '重置设置',
      message: '确定要重置所有设置为默认值吗？',
    }));

    const actions = mocks.showConfirmDialog.mock.calls[0][0].actions as Array<{ label?: string; onPress?: () => void | Promise<void> }>;
    const confirm = actions.find((action) => action.label === '重置');

    await confirm?.onPress?.();

    expect(mocks.settings.resetSettings).toHaveBeenCalledTimes(1);
    expect(mocks.showErrorFeedback).toHaveBeenCalledWith(expect.objectContaining({
      title: '成功',
      message: '设置已重置',
    }));
  });

  it('shows backend save success feedback for save and switch results', async () => {
    const { screen, mocks } = await renderSettingsPage();

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
});
