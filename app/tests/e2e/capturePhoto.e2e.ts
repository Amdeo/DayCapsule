/**
 * 拍照流程 E2E 测试 (Detox)
 * 测试从首页启动拍照到完成保存的完整用户流程
 */

describe('Photo Capture E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('应该在 3 次点击内完成拍照流程', async () => {
    // 第 1 次点击：打开拍照界面
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 第 2 次点击：打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 第 3 次点击：拍照
    await element(by.id('take-photo-button')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('应该在 2 秒内显示首屏', async () => {
    const startTime = Date.now();

    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000);
  });

  it('应该支持从相册选择照片', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相册选择器
    await element(by.id('select-from-gallery-button')).tap();
    await waitFor(element(by.id('gallery-picker')))
      .toBeVisible()
      .withTimeout(2000);

    // 选择照片
    await element(by.id('gallery-photo-0')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('应该支持添加照片描述', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 拍照
    await element(by.id('take-photo-button')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);

    // 添加描述
    await element(by.id('description-input')).typeText('今天的美景');
    await expect(element(by.id('description-input'))).toHaveToggleValue(true);
  });

  it('应该支持添加标签', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 拍照
    await element(by.id('take-photo-button')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);

    // 添加标签
    await element(by.id('tag-input')).typeText('风景');
    await element(by.id('add-tag-button')).tap();
    await expect(element(by.text('风景'))).toBeVisible();
  });

  it('应该支持选择心情', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 拍照
    await element(by.id('take-photo-button')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);

    // 选择心情
    await element(by.id('mood-picker')).tap();
    await waitFor(element(by.id('mood-happy')))
      .toBeVisible()
      .withTimeout(1000);
    await element(by.id('mood-happy')).tap();
  });

  it('应该在 2 秒内完成保存', async () => {
    const startTime = Date.now();

    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 拍照
    await element(by.id('take-photo-button')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);

    // 保存
    await element(by.id('save-button')).tap();
    await waitFor(element(by.id('save-success-message')))
      .toBeVisible()
      .withTimeout(2000);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000);
  });

  it('应该显示保存成功提示', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 拍照
    await element(by.id('take-photo-button')).tap();
    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(2000);

    // 保存
    await element(by.id('save-button')).tap();
    await waitFor(element(by.id('save-success-message')))
      .toBeVisible()
      .withTimeout(2000);

    await expect(element(by.text('保存成功'))).toBeVisible();
  });

  it('应该支持取消拍照', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 打开相机
    await element(by.id('open-camera-button')).tap();
    await waitFor(element(by.id('camera-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 取消
    await element(by.id('cancel-button')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('应该处理权限被拒的情况', async () => {
    // 模拟权限被拒
    await device.setBiometricEnrollment(false);

    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 尝试打开相机
    await element(by.id('open-camera-button')).tap();

    // 应该显示权限错误提示
    await waitFor(element(by.id('permission-error-message')))
      .toBeVisible()
      .withTimeout(2000);
  });
});

