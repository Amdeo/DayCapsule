import {device, element, by, expect as detoxExpect} from 'detox';

describe('Search E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('搜索界面导航', () => {
    it('应该打开搜索界面', async () => {
      await element(by.id('search_tab')).tap();
      await detoxExpect(element(by.id('search_screen'))).toBeVisible();
    });

    it('应该显示搜索输入框', async () => {
      await element(by.id('search_tab')).tap();
      await detoxExpect(element(by.id('search_input'))).toBeVisible();
    });

    it('应该显示搜索历史', async () => {
      await element(by.id('search_tab')).tap();
      await detoxExpect(element(by.id('search_history'))).toBeVisible();
    });
  });

  describe('基础搜索流程', () => {
    it('应该执行搜索并显示结果', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('search_button')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });

    it('应该显示搜索结果列表', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('记录');
      await element(by.id('search_button')).tap();
      await detoxExpect(element(by.id('result_item_0'))).toBeVisible();
    });

    it('应该点击搜索结果打开详情', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('search_button')).tap();
      await element(by.id('result_item_0')).tap();
      await detoxExpect(element(by.id('entry_detail_screen'))).toBeVisible();
    });

    it('应该清除搜索输入', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('clear_search_button')).tap();
      await detoxExpect(element(by.id('search_input'))).toHaveToggleValue(false);
    });
  });

  describe('搜索建议', () => {
    it('应该显示搜索建议', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅');
      await detoxExpect(element(by.id('search_suggestions'))).toBeVisible();
    });

    it('应该点击建议执行搜索', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅');
      await element(by.id('suggestion_item_0')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });
  });

  describe('筛选功能', () => {
    it('应该打开筛选面板', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await detoxExpect(element(by.id('filter_panel'))).toBeVisible();
    });

    it('应该按标签筛选', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await element(by.id('tag_filter')).tap();
      await element(by.text('旅游')).tap();
      await element(by.id('apply_filter_button')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });

    it('应该按心情筛选', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await element(by.id('mood_filter')).tap();
      await element(by.text('开心')).tap();
      await element(by.id('apply_filter_button')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });

    it('应该按日期范围筛选', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await element(by.id('date_range_filter')).tap();
      await element(by.id('start_date_input')).typeText('2024-01-01');
      await element(by.id('end_date_input')).typeText('2024-12-31');
      await element(by.id('apply_filter_button')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });

    it('应该按类型筛选', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await element(by.id('type_filter')).tap();
      await element(by.text('照片')).tap();
      await element(by.id('apply_filter_button')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });

    it('应该重置筛选条件', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await element(by.id('tag_filter')).tap();
      await element(by.text('旅游')).tap();
      await element(by.id('reset_filter_button')).tap();
      await detoxExpect(element(by.id('tag_filter'))).toHaveToggleValue(false);
    });
  });

  describe('搜索历史', () => {
    it('应该显示搜索历史', async () => {
      await element(by.id('search_tab')).tap();
      await detoxExpect(element(by.id('search_history'))).toBeVisible();
    });

    it('应该点击历史项执行搜索', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('history_item_0')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
    });

    it('应该删除历史项', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('history_item_0')).multiTap(2);
      await element(by.text('删除')).tap();
      await detoxExpect(element(by.id('history_item_0'))).not.toBeVisible();
    });

    it('应该清除所有历史', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('clear_history_button')).tap();
      await element(by.text('确定')).tap();
      await detoxExpect(element(by.id('search_history'))).not.toBeVisible();
    });
  });

  describe('导出功能', () => {
    it('应该打开导出对话框', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('search_button')).tap();
      await element(by.id('export_button')).tap();
      await detoxExpect(element(by.id('export_dialog'))).toBeVisible();
    });

    it('应该选择导出格式', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('search_button')).tap();
      await element(by.id('export_button')).tap();
      await element(by.id('export_format_pdf')).tap();
      await detoxExpect(element(by.id('export_format_pdf'))).toHaveToggleValue(true);
    });

    it('应该执行导出', async () => {
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('search_button')).tap();
      await element(by.id('export_button')).tap();
      await element(by.id('export_format_pdf')).tap();
      await element(by.id('confirm_export_button')).tap();
      await detoxExpect(element(by.id('export_success_message'))).toBeVisible();
    });
  });

  describe('性能验证', () => {
    it('应该在 2 秒内显示搜索结果', async () => {
      const startTime = Date.now();
      await element(by.id('search_tab')).tap();
      await element(by.id('search_input')).typeText('旅游');
      await element(by.id('search_button')).tap();
      await detoxExpect(element(by.id('search_results'))).toBeVisible();
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('应该快速响应筛选操作', async () => {
      const startTime = Date.now();
      await element(by.id('search_tab')).tap();
      await element(by.id('filter_button')).tap();
      await element(by.id('tag_filter')).tap();
      await element(by.text('旅游')).tap();
      await element(by.id('apply_filter_button')).tap();
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });
  });
});

