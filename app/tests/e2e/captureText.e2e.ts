/**
 * 文字输入流程 E2E 测试 (Detox)
 * 测试从主页通过底部胶囊栏直接输入文字的流程
 */

describe('Text Capture E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('应该能通过底部胶囊栏输入并发送文字', async () => {
    // 1. 验证主页可见
    await expect(element(by.id('capsule-text-input'))).toBeVisible();

    // 2. 点击输入框并输入文字
    await element(by.id('capsule-text-input')).typeText('这是一个测试想法');

    // 3. 验证相机按钮消失，发送按钮出现
    await expect(element(by.id('capsule-camera-button'))).not.toBeVisible();
    await expect(element(by.id('capsule-send-button'))).toBeVisible();

    // 4. 点击发送按钮
    await element(by.id('capsule-send-button')).tap();

    // 5. 验证输入框被清空
    await expect(element(by.id('capsule-text-input'))).toHaveText('');

    // 6. 验证发送按钮消失，相机按钮重新出现
    await expect(element(by.id('capsule-send-button'))).not.toBeVisible();
    await expect(element(by.id('capsule-camera-button'))).toBeVisible();
  });
});