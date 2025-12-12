/**
 * 拍照流程 E2E 测试 (Detox)
 * 测试从主页通过底部胶囊栏启动拍照的流程
 */

describe('Photo Capture E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('应该能通过底部胶囊栏打开相机并拍照', async () => {
    // 1. 验证主页可见
    await expect(element(by.id('capsule-camera-button'))).toBeVisible();

    // 2. 点击胶囊栏的相机按钮
    await element(by.id('capsule-camera-button')).tap();

    // 3. 验证半屏相机 (BottomSheet) 出现
    await waitFor(element(by.id('camera-bottom-sheet-view')))
      .toBeVisible()
      .withTimeout(2000);

    // 4. 验证拍照按钮可见
    await expect(element(by.id('take-photo-button'))).toBeVisible();

    // 5. 点击拍照
    // 注意：这可能需要模拟器相机权限，Detox 有时很难处理真实的 VisionCamera。
    // 我们假设 VisionCamera 在模拟器上能正常工作或有 fallback。
    // 如果失败，我们可能需要在 Detox 配置中处理权限。
    await element(by.id('take-photo-button')).tap();

    // 6. 验证半屏相机关闭 (表示拍照成功并处理)
    await waitFor(element(by.id('camera-bottom-sheet-view')))
      .not.toBeVisible()
      .withTimeout(2000);
  });
});