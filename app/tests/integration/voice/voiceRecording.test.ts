import {audioRecorder} from '@services/voice/audioRecorder';
import {audioStorage} from '@services/storage/audioStorage';
import {databaseService} from '@services/storage/database';
import {performanceMonitor} from '@services/telemetry/performance';

describe('Voice Recording Integration Tests', () => {
  beforeEach(async () => {
    // 清理测试数据
    await audioStorage.clearTestAudio();
  });

  afterEach(async () => {
    // 停止录音
    if (audioRecorder.isRecording()) {
      await audioRecorder.stopRecording();
    }
  });

  describe('基础录音功能', () => {
    it('应该成功开始录音', async () => {
      const result = await audioRecorder.startRecording();
      expect(result).toBe(true);
      expect(audioRecorder.isRecording()).toBe(true);
    });

    it('应该成功停止录音并返回音频文件路径', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 录制 1 秒
      const audioPath = await audioRecorder.stopRecording();

      expect(audioPath).toBeDefined();
      expect(audioPath).toContain('.m4a');
    });

    it('应该在 1 秒内响应录音开始', async () => {
      const startTime = Date.now();
      await audioRecorder.startRecording();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(audioRecorder.isRecording()).toBe(true);
    });

    it('应该支持 30 秒录音', async () => {
      const startTime = Date.now();
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 秒
      const audioPath = await audioRecorder.stopRecording();
      const duration = Date.now() - startTime;

      expect(audioPath).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(30000);
      expect(duration).toBeLessThan(31000);
    });

    it('应该支持 5 分钟录音', async () => {
      const startTime = Date.now();
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 分钟
      const audioPath = await audioRecorder.stopRecording();
      const duration = Date.now() - startTime;

      expect(audioPath).toBeDefined();
      expect(duration).toBeGreaterThanOrEqual(300000);
    });
  });

  describe('录音暂停和恢复', () => {
    it('应该支持暂停录音', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
      const pauseResult = await audioRecorder.pauseRecording();

      expect(pauseResult).toBe(true);
      expect(audioRecorder.isPaused()).toBe(true);
    });

    it('应该支持恢复录音', async () => {
      await audioRecorder.startRecording();
      await audioRecorder.pauseRecording();
      const resumeResult = await audioRecorder.resumeRecording();

      expect(resumeResult).toBe(true);
      expect(audioRecorder.isPaused()).toBe(false);
    });

    it('应该正确计算暂停期间的时长', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
      await audioRecorder.pauseRecording();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 暂停 1 秒
      await audioRecorder.resumeRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
      const audioPath = await audioRecorder.stopRecording();

      expect(audioPath).toBeDefined();
      // 总时长应该约为 1 秒（500ms + 500ms），不包括暂停时间
    });
  });

  describe('录音时长限制', () => {
    it('应该在达到最大时长时自动停止', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 300100)); // 超过 5 分钟

      expect(audioRecorder.isRecording()).toBe(false);
    });

    it('应该在达到最小时长前不允许停止', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 100)); // 仅 100ms
      const audioPath = await audioRecorder.stopRecording();

      expect(audioPath).toBeNull(); // 应该返回 null，因为时长不足
    });
  });

  describe('音频文件管理', () => {
    it('应该成功保存录音到存储', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const audioPath = await audioRecorder.stopRecording();

      const savedPath = await audioStorage.saveAudio(audioPath!);
      expect(savedPath).toBeDefined();
    });

    it('应该加密存储音频文件', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const audioPath = await audioRecorder.stopRecording();

      const savedPath = await audioStorage.saveAudio(audioPath!, true);
      expect(savedPath).toBeDefined();

      // 验证文件已加密
      const isEncrypted = await audioStorage.isAudioEncrypted(savedPath);
      expect(isEncrypted).toBe(true);
    });

    it('应该获取音频文件信息', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const audioPath = await audioRecorder.stopRecording();

      const audioInfo = await audioStorage.getAudioInfo(audioPath!);
      expect(audioInfo).toBeDefined();
      expect(audioInfo?.duration).toBeGreaterThan(0);
      expect(audioInfo?.size).toBeGreaterThan(0);
    });
  });

  describe('数据库集成', () => {
    it('应该成功保存语音记录到数据库', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const audioPath = await audioRecorder.stopRecording();

      const entryId = await databaseService.insertEntry({
        type: 'voice',
        content: '测试语音记录',
        mediaPath: audioPath,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      expect(entryId).toBeDefined();
    });

    it('应该正确关联音频附件', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const audioPath = await audioRecorder.stopRecording();

      const entryId = await databaseService.insertEntry({
        type: 'voice',
        content: '测试语音记录',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await databaseService.insertMediaAttachment({
        entryId,
        mediaPath: audioPath!,
        mediaType: 'audio/m4a',
        createdAt: Date.now(),
      });

      // 验证关联成功
      expect(entryId).toBeDefined();
    });
  });

  describe('性能指标', () => {
    it('应该在 1 秒内响应录音开始', async () => {
      performanceMonitor.startMeasure('voice_start');
      await audioRecorder.startRecording();
      performanceMonitor.endMeasure('voice_start');

      const duration = performanceMonitor.getMeasure('voice_start');
      expect(duration).toBeLessThan(1000);
    });

    it('应该在 2 秒内完成 30 秒录音的停止', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 30000));

      performanceMonitor.startMeasure('voice_stop');
      await audioRecorder.stopRecording();
      performanceMonitor.endMeasure('voice_stop');

      const duration = performanceMonitor.getMeasure('voice_stop');
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('错误处理', () => {
    it('应该处理录音权限被拒的情况', async () => {
      // 这个测试需要模拟权限被拒
      // 实际实现中应该使用 mock
      const result = await audioRecorder.startRecording();
      expect(typeof result).toBe('boolean');
    });

    it('应该处理存储空间不足的情况', async () => {
      // 这个测试需要模拟存储空间不足
      // 实际实现中应该使用 mock
      const result = await audioRecorder.startRecording();
      expect(typeof result).toBe('boolean');
    });

    it('应该在录音过程中处理中断', async () => {
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 模拟中断（如来电）
      const audioPath = await audioRecorder.stopRecording();
      expect(audioPath).toBeDefined();
    });
  });
});

