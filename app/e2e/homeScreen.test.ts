import {device, expect, element, by, waitFor} from 'detox';

describe('HomeScreen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {camera: 'YES', microphone: 'YES', photos: 'YES'},
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display home screen with FAB buttons', async () => {
    // 等待主屏幕加载
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // 验证 FAB 按钮存在
    await expect(element(by.testID('fab-photo'))).toBeVisible();
    await expect(element(by.testID('fab-voice'))).toBeVisible();
    await expect(element(by.testID('fab-text'))).toBeVisible();
  });

  it('should open text entry dialog when clicking text FAB', async () => {
    // 点击文字 FAB
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证对话框元素
    await expect(element(by.testID('text-input'))).toBeVisible();
    await expect(element(by.testID('tag-input'))).toBeVisible();
    await expect(element(by.testID('mood-selector'))).toBeVisible();
    await expect(element(by.testID('save-button'))).toBeVisible();
  });

  it('should create a text entry successfully', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('今天天气很好，心情不错！');

    // 添加标签
    await element(by.testID('tag-input')).typeText('天气');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 选择心情
    await element(by.testID('mood-happy')).multiTap(1);

    // 保存
    await element(by.testID('save-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('text-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(3000);

    // 验证记录出现在列表中
    await waitFor(element(by.text('今天天气很好，心情不错！')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should display entry list with recent entries', async () => {
    // 等待列表加载
    await waitFor(element(by.testID('entry-list')))
      .toBeVisible()
      .withTimeout(5000);

    // 验证列表项存在
    await expect(element(by.testID('entry-item-0'))).toBeVisible();
  });

  it('should navigate to entry detail when tapping entry', async () => {
    // 点击第一个记录
    await element(by.testID('entry-item-0')).multiTap(1);

    // 等待详情页加载
    await waitFor(element(by.testID('entry-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证详情页元素
    await expect(element(by.testID('entry-content'))).toBeVisible();
    await expect(element(by.testID('edit-button'))).toBeVisible();
    await expect(element(by.testID('delete-button'))).toBeVisible();
  });

  it('should go back to home screen from entry detail', async () => {
    // 点击返回按钮
    await element(by.testID('back-button')).multiTap(1);

    // 等待返回到主屏幕
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证 FAB 按钮可见
    await expect(element(by.testID('fab-text'))).toBeVisible();
  });

  it('should cancel text entry dialog', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击取消按钮
    await element(by.testID('cancel-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('text-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(3000);
  });

  it('should refresh entry list', async () => {
    // 向下拉动刷新
    await element(by.testID('entry-list')).swipe('down', 'fast', 0.75);

    // 等待刷新完成
    await waitFor(element(by.testID('entry-list')))
      .toBeVisible()
      .withTimeout(3000);
  });
});
