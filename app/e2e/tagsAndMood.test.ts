import {device, expect, element, by, waitFor} from 'detox';

describe('Tags and Mood E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {camera: 'YES', microphone: 'YES', photos: 'YES'},
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should add single tag to entry', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('测试标签功能');

    // 添加标签
    await element(by.testID('tag-input')).typeText('测试');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 验证标签显示
    await expect(element(by.text('测试'))).toBeVisible();
  });

  it('should add multiple tags to entry', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('多标签测试');

    // 添加第一个标签
    await element(by.testID('tag-input')).typeText('标签1');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 添加第二个标签
    await element(by.testID('tag-input')).typeText('标签2');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 添加第三个标签
    await element(by.testID('tag-input')).typeText('标签3');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 验证所有标签显示
    await expect(element(by.text('标签1'))).toBeVisible();
    await expect(element(by.text('标签2'))).toBeVisible();
    await expect(element(by.text('标签3'))).toBeVisible();
  });

  it('should remove tag from entry', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('删除标签测试');

    // 添加标签
    await element(by.testID('tag-input')).typeText('待删除');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 验证标签显示
    await expect(element(by.text('待删除'))).toBeVisible();

    // 删除标签
    await element(by.testID('tag-delete-待删除')).multiTap(1);

    // 验证标签被删除
    await expect(element(by.text('待删除'))).not.toBeVisible();
  });

  it('should show tag suggestions', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('查看标签建议');

    // 点击标签输入框
    await element(by.testID('tag-input')).multiTap(1);

    // 等待建议显示
    await waitFor(element(by.testID('tag-suggestions')))
      .toBeVisible()
      .withTimeout(2000);
  });

  it('should select happy mood', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('开心的一天');

    // 选择开心心情
    await element(by.testID('mood-happy')).multiTap(1);

    // 验证心情被选中
    await expect(element(by.testID('mood-happy-selected'))).toBeVisible();
  });

  it('should select all mood options', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('心情测试');

    // 测试所有心情选项
    const moods = ['happy', 'excited', 'neutral', 'tired', 'sad'];

    for (const mood of moods) {
      // 选择心情
      await element(by.testID(`mood-${mood}`)).multiTap(1);

      // 验证心情被选中
      await expect(element(by.testID(`mood-${mood}-selected`))).toBeVisible();

      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  });

  it('should deselect mood when clicking again', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('取消心情选择');

    // 选择心情
    await element(by.testID('mood-happy')).multiTap(1);

    // 验证心情被选中
    await expect(element(by.testID('mood-happy-selected'))).toBeVisible();

    // 再次点击取消选择
    await element(by.testID('mood-happy')).multiTap(1);

    // 验证心情被取消
    await expect(element(by.testID('mood-happy-selected'))).not.toBeVisible();
  });

  it('should save entry with tags and mood', async () => {
    // 打开文字记录对话框
    await element(by.testID('fab-text')).multiTap(1);

    // 等待对话框出现
    await waitFor(element(by.testID('text-entry-dialog')))
      .toBeVisible()
      .withTimeout(3000);

    // 输入文本
    await element(by.testID('text-input')).typeText('完整的记录测试');

    // 添加标签
    await element(by.testID('tag-input')).typeText('完整');
    await element(by.testID('tag-add-button')).multiTap(1);

    // 选择心情
    await element(by.testID('mood-excited')).multiTap(1);

    // 保存
    await element(by.testID('save-button')).multiTap(1);

    // 验证对话框关闭
    await waitFor(element(by.testID('text-entry-dialog')))
      .not.toBeVisible()
      .withTimeout(3000);

    // 验证记录出现在列表中
    await waitFor(element(by.text('完整的记录测试')))
      .toBeVisible()
      .withTimeout(3000);
  });
});
