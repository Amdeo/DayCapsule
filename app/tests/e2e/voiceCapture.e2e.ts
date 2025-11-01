import {device, element, by, expect as detoxExpect} from 'detox';

describe('Voice Capture E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('语音录制基础流程', () => {
    it('应该在 2 秒内打开语音录制界面', async () => {
      const startTime = Date.now();

      // 导航到语音录制
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).tap();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);

      // 验证界面显示
      await detoxExpect(element(by.id('voice_record_screen'))).toBeVisible();
    });

    it('应该支持长按开始录音', async () => {
      await element(by.id('voice_tab')).tap();

      // 长按录音按钮
      await element(by.id('record_button')).multiTap(1);
      await element(by.id('record_button')).longPress();

      // 验证录音已开始
      await detoxExpect(element(by.id('recording_indicator'))).toBeVisible();
      await detoxExpect(element(by.id('timer'))).toBeVisible();
    });

    it('应该支持松开停止录音', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 等待 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 松开按钮
      await element(by.id('record_button')).multiTap(1);

      // 验证录音已停止
      await detoxExpect(element(by.id('recording_indicator'))).not.toBeVisible();
    });

    it('应该显示录音时长', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 等待 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 验证时长显示
      await detoxExpect(element(by.id('timer'))).toHaveText('00:03');
    });

    it('应该在 1 秒内响应录音开始', async () => {
      await element(by.id('voice_tab')).tap();

      const startTime = Date.now();
      await element(by.id('record_button')).longPress();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      await detoxExpect(element(by.id('recording_indicator'))).toBeVisible();
    });
  });

  describe('波形可视化', () => {
    it('应该显示实时波形', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 等待 1 秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证波形显示
      await detoxExpect(element(by.id('waveform_visualizer'))).toBeVisible();
    });

    it('应该在录音过程中更新波形', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 等待 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证波形仍然可见
      await detoxExpect(element(by.id('waveform_visualizer'))).toBeVisible();
    });
  });

  describe('转写功能', () => {
    it('应该在 10 秒内完成 30 秒语音的转写', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 30 秒
      await new Promise(resolve => setTimeout(resolve, 30000));
      await element(by.id('record_button')).multiTap(1);

      // 验证转写进度显示
      await detoxExpect(element(by.id('transcription_progress'))).toBeVisible();

      // 等待转写完成（最多 10 秒）
      const startTime = Date.now();
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);
    });

    it('应该显示转写进度', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 5 秒
      await new Promise(resolve => setTimeout(resolve, 5000));
      await element(by.id('record_button')).multiTap(1);

      // 验证进度条显示
      await detoxExpect(element(by.id('transcription_progress'))).toBeVisible();
    });

    it('应该显示转写结果', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 验证转写文本显示
      await detoxExpect(element(by.id('transcript_text'))).toBeVisible();
    });
  });

  describe('转写编辑', () => {
    it('应该支持编辑转写文本', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 编辑文本
      await element(by.id('transcript_editor')).tap();
      await element(by.id('transcript_editor')).typeText('编辑后的文本');

      // 验证文本已更新
      await detoxExpect(element(by.id('transcript_editor'))).toHaveText('编辑后的文本');
    });

    it('应该支持清除转写文本', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 清除文本
      await element(by.id('clear_transcript_button')).tap();

      // 验证文本已清除
      await detoxExpect(element(by.id('transcript_editor'))).toHaveText('');
    });
  });

  describe('音频回放', () => {
    it('应该支持播放录制的音频', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 点击播放按钮
      await element(by.id('play_button')).tap();

      // 验证播放状态
      await detoxExpect(element(by.id('pause_button'))).toBeVisible();
    });

    it('应该支持暂停播放', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 播放
      await element(by.id('play_button')).tap();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 暂停
      await element(by.id('pause_button')).tap();

      // 验证暂停状态
      await detoxExpect(element(by.id('play_button'))).toBeVisible();
    });
  });

  describe('保存功能', () => {
    it('应该支持保存语音记录', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 3 秒
      await new Promise(resolve => setTimeout(resolve, 3000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 点击保存按钮
      await element(by.id('save_button')).tap();

      // 验证保存成功提示
      await detoxExpect(element(by.text('保存成功'))).toBeVisible();
    });

    it('应该支持取消录制', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000));
      await element(by.id('record_button')).multiTap(1);

      // 等待转写完成
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);

      // 点击取消按钮
      await element(by.id('cancel_button')).tap();

      // 验证返回到语音列表
      await detoxExpect(element(by.id('voice_list'))).toBeVisible();
    });
  });

  describe('错误处理', () => {
    it('应该处理录音权限被拒', async () => {
      // 这个测试需要在设备上手动拒绝权限
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).tap();

      // 验证错误提示
      await detoxExpect(element(by.text('需要录音权限'))).toBeVisible();
    });

    it('应该处理录音中断', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 模拟来电中断
      await device.sendUserInteraction({type: 'call'});

      // 验证已保存已录制的片段
      await detoxExpect(element(by.id('save_draft_button'))).toBeVisible();
    });
  });

  describe('性能指标', () => {
    it('应该在 1 秒内响应录音开始', async () => {
      await element(by.id('voice_tab')).tap();

      const startTime = Date.now();
      await element(by.id('record_button')).longPress();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('应该在 10 秒内完成转写', async () => {
      await element(by.id('voice_tab')).tap();
      await element(by.id('record_button')).longPress();

      // 录制 5 秒
      await new Promise(resolve => setTimeout(resolve, 5000));
      await element(by.id('record_button')).multiTap(1);

      const startTime = Date.now();
      await waitFor(element(by.id('transcript_text')))
        .toBeVisible()
        .withTimeout(10000);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000);
    });
  });
});

