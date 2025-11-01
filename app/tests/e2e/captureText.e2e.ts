/**
 * 文字输入流程 E2E 测试 (Detox)
 * 测试从首页启动文字输入到完成保存的完整用户流程
 */

describe('Text Capture E2E Test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('应该在 3 次点击内完成文字输入流程', async () => {
    // 第 1 次点击：打开拍照界面
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 第 2 次点击：切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 第 3 次点击：保存
    await element(by.id('text-input')).typeText('今天的日记');
    await element(by.id('save-button')).tap();
    await waitFor(element(by.id('save-success-message')))
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

  it('应该支持输入文字内容', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    const testText = '这是一个测试文字记录';
    await element(by.id('text-input')).typeText(testText);
    await expect(element(by.id('text-input'))).toHaveText(testText);
  });

  it('应该支持长文本输入', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入长文本
    const longText = '这是一个很长的文本。'.repeat(50);
    await element(by.id('text-input')).typeText(longText);
    await expect(element(by.id('text-input'))).toHaveText(longText);
  });

  it('应该支持添加标签', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('今天的日记');

    // 添加标签
    await element(by.id('tag-input')).typeText('日常');
    await element(by.id('add-tag-button')).tap();
    await expect(element(by.text('日常'))).toBeVisible();
  });

  it('应该支持选择心情', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('今天很开心');

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

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('今天的日记');

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

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('今天的日记');

    // 保存
    await element(by.id('save-button')).tap();
    await waitFor(element(by.id('save-success-message')))
      .toBeVisible()
      .withTimeout(2000);

    await expect(element(by.text('保存成功'))).toBeVisible();
  });

  it('应该支持取消输入', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('今天的日记');

    // 取消
    await element(by.id('cancel-button')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('应该支持清空文字', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('今天的日记');

    // 清空
    await element(by.id('clear-button')).tap();
    await expect(element(by.id('text-input'))).toHaveText('');
  });

  it('应该支持多行文本输入', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入多行文本
    await element(by.id('text-input')).typeText('第一行\n第二行\n第三行');
    await expect(element(by.id('text-input'))).toHaveText('第一行\n第二行\n第三行');
  });

  it('应该支持 emoji 输入', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入包含 emoji 的文本
    await element(by.id('text-input')).typeText('今天很开心 😊');
    await expect(element(by.id('text-input'))).toHaveText('今天很开心 😊');
  });

  it('应该自动保存草稿', async () => {
    await element(by.id('capture-tab')).tap();
    await waitFor(element(by.id('capture-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // 切换到文字模式
    await element(by.id('text-mode-button')).tap();
    await waitFor(element(by.id('text-editor')))
      .toBeVisible()
      .withTimeout(2000);

    // 输入文字
    await element(by.id('text-input')).typeText('草稿内容');

    // 等待自动保存
    await waitFor(element(by.id('draft-saved-indicator')))
      .toBeVisible()
      .withTimeout(3000);
  });
});

