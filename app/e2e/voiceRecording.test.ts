import {device, expect, element, by, waitFor} from 'detox';

describe('Voice Recording E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {camera: 'YES', microphone: 'YES', photos: 'YES'},
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should open voice recording dialog when clicking voice FAB', async () => {
    // 等待主屏幕加载
    await waitFor(element(by.testID('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // 点击语音 FAB
    await element(by.testID('fab-voice')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('voice-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 验证语音录制组件
    await expect(element(by.testID('voice-recorder'))).toBeVisible();
    await expect(element(by.testID('record-button'))).toBeVisible();
  });

  it('should start and stop voice recording', async () => {
    // 打开语音记录对话框
    await element(by.testID('fab-voice')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('voice-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击开始录音
    await element(by.testID('record-button')).multiTap(1);

    // 等待录音开始（显示停止按钮）
    await waitFor(element(by.testID('stop-button')))
      .toBeVisible()
      .withTimeout(2000);

    // 验证计时器显示
    await expect(element(by.testID('recording-timer'))).toBeVisible();

    // 等待 2 秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 点击停止录音
    await element(by.testID('stop-button')).multiTap(1);

    // 验证停止按钮消失
    await waitFor(element(by.testID('stop-button')))
      .not.toBeVisible()
      .withTimeout(2000);
  });

  it('should cancel voice recording', async () => {
    // 打开语音记录对话框
    await element(by.testID('fab-voice')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('voice-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击开始录音
    await element(by.testID('record-button')).multiTap(1);

    // 等待录音开始
    await waitFor(element(by.testID('stop-button')))
      .toBeVisible()
      .withTimeout(2000);

    // 点击取消按钮
    await element(by.testID('cancel-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('voice-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(2000);
  });

  it('should save voice entry with tags and mood', async () => {
    // 打开语音记录对话框
    await element(by.testID('fab-voice')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('voice-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 开始录音
    await element(by.testID('record-button')).multiTap(1);

    // 等待录音开始
    await waitFor(element(by.testID('stop-button')))
      .toBeVisible()
      .withTimeout(2000);

    // 等待 1 秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 停止录音
    await element(by.testID('stop-button')).multiTap(1);

    // 等待停止完成
    await waitFor(element(by.testID('stop-button')))
      .not.toBeVisible()
      .withTimeout(2000);

    // 添加标签
    await element(by.testID('tag-input')).typeText('语音');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 选择心情
    await element(by.testID('mood-excited')).multiTap(1);

    // 保存
    await element(by.testID('save-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('voice-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(3000);

    // 验证记录出现在列表中
    await waitFor(element(by.testID('entry-list')))
      .toBeVisible()
      .withTimeout(3000);
  });

  it('should display voice indicator in entry list', async () => {
    // 等待列表加载
    await waitFor(element(by.testID('entry-list')))
      .toBeVisible()
      .withTimeout(5000);

    // 查找语音指示器
    await expect(element(by.testID('voice-indicator-0'))).toBeVisible();
  });

  it('should play voice recording from entry detail', async () => {
    // 点击第一个记录
    await element(by.testID('entry-item-0')).multiTap(1);

    // 等待详情页加载
    await waitFor(element(by.testID('entry-detail-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // 点击播放按钮
    await element(by.testID('play-button')).multiTap(1);

    // 验证暂停按钮出现
    await waitFor(element(by.testID('pause-button')))
      .toBeVisible()
      .withTimeout(2000);

    // 点击暂停
    await element(by.testID('pause-button')).multiTap(1);

    // 验证播放按钮重新出现
    await waitFor(element(by.testID('play-button')))
      .toBeVisible()
      .withTimeout(2000);
  });
});
