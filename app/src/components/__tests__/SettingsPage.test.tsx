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
    const rootChildTestIds = (settingsRootNode?.children ?? [])
      .map((child) => (
        typeof child === 'object' && child !== null && 'props' in child
          ? (child as { props?: { testID?: string } }).props?.testID
          : undefined
      ))
      .filter((testID): testID is string => typeof testID === 'string');
    const overviewIndex = rootChildTestIds.indexOf('settings-overview-card');
    const accountSectionIndex = rootChildTestIds.indexOf('settings-section-account-sync');

    expect(overviewCard).toBeTruthy();
    expect(accountSection).toBeTruthy();
    expect(screen.getByText('当前账号')).toBeTruthy();
    expect(screen.getByText('同步模式')).toBeTruthy();
    expect(screen.getByText('当前后端')).toBeTruthy();
    expect(screen.getByText('存储概览')).toBeTruthy();
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
});
