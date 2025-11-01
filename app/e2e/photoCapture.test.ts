import {device, expect, element, by, waitFor} from 'detox';

describe('Photo Capture E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {camera: 'YES', microphone: 'YES', photos: 'YES'},
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should open photo entry dialog when clicking photo FAB', async () => {
    // 等待主屏幕加载
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // 点击拍照 FAB
    await element(by.testID('fab-photo')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('photo-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证对话框元素
    await expect(element(by.testID('photo-preview'))).toBeVisible();
    await expect(element(by.testID('take-photo-button'))).toBeVisible();
  });

  it('should display photo entry dialog with preview', async () => {
    // 等待主屏幕加载
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // 点击拍照 FAB
    await element(by.testID('fab-photo')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('photo-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证对话框元素
    await expect(element(by.testID('photo-description'))).toBeVisible();
  });

  it('should create photo entry with description and tags', async () => {
    // 打开拍照对话框
    await element(by.testID('fab-photo')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('photo-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 模拟选择照片（在实际测试中需要模拟图片选择）
    // 这里假设已经有照片预览
    await waitFor(element(by.testID('photo-preview')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入描述
    await element(by.testID('photo-description')).typeText('美丽的风景照');

    // 添加标签
    await element(by.testID('tag-input')).typeText('风景');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 选择心情
    await element(by.testID('mood-neutral')).multiTap(1);

    // 保存
    await element(by.testID('save-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('photo-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(3000);

    // 验证记录出现在列表中
    await waitFor(element(by.testID('entry-list')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should display photo thumbnail in entry list', async () => {
    // 等待列表加载
    await waitFor(element(by.testID('entry-list')))
      .toBeVisible()
      .withTimeout(5000);

    // 查找照片缩略图
    await expect(element(by.testID('photo-thumbnail-0'))).toBeVisible();
  });

  it('should view photo in entry detail', async () => {
    // 点击第一个记录
    await element(by.testID('entry-item-0')).multiTap(1);

    // 等待详情页加载
    await waitFor(element(by.testID('entry-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证照片显示
    await expect(element(by.testID('detail-photo'))).toBeVisible();

    // 验证描述显示
    await expect(element(by.testID('entry-content'))).toBeVisible();
  });

  it('should edit photo entry', async () => {
    // 点击第一个记录
    await element(by.testID('entry-item-0')).multiTap(1);

    // 等待详情页加载
    await waitFor(element(by.testID('entry-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击编辑按钮
    await element(by.testID('edit-button')).multiTap(1);

    // 等待编辑模式激活
    await waitFor(element(by.testID('edit-mode')))
      .toBeVisible()
      .withTimeout(2000);

    // 修改描述
    await element(by.testID('entry-content')).clearText();
    await element(by.testID('entry-content')).typeText('更新的风景照描述');

    // 保存
    await element(by.testID('save-button')).multiTap(1);

    // 验证编辑模式关闭
    await waitFor(element(by.testID('edit-mode')))
      .not.toBeVisible()
      .withTimeout(2000);
  });

  it('should delete photo entry', async () => {
    // 点击第一个记录
    await element(by.testID('entry-item-0')).multiTap(1);

    // 等待详情页加载
    await waitFor(element(by.testID('entry-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击删除按钮
    await element(by.testID('delete-button')).multiTap(1);

    // 等待确认对话框
    await waitFor(element(by.testID('delete-confirm-dialog')))
      .toBeVisible()
      .withTimeout(2000);

    // 点击确认删除
    await element(by.testID('confirm-delete-button')).multiTap(1);

    // 验证返回到主屏幕
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should cancel photo entry dialog', async () => {
    // 打开拍照对话框
    await element(by.testID('fab-photo')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('photo-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击取消按钮
    await element(by.testID('cancel-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('photo-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(3000);
  });
});
