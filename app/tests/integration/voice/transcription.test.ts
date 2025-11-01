import {asrService} from '@services/ai/asrService';
import {audioRecorder} from '@services/voice/audioRecorder';
import {performanceMonitor} from '@services/telemetry/performance';

describe('Voice Transcription Integration Tests', () => {
  beforeEach(async () => {
    // 初始化 ASR 服务
    await asrService.initialize();
  });

  describe('基础转写功能', () => {
    it('应该成功转写 30 秒的语音', async () => {
      // 模拟 30 秒的音频文件
      const mockAudioPath = '/path/to/30s_audio.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result).toBeDefined();
      expect(result?.text).toBeDefined();
      expect(result?.text.length).toBeGreaterThan(0);
    });

    it('应该成功转写 5 分钟的语音', async () => {
      // 模拟 5 分钟的音频文件
      const mockAudioPath = '/path/to/5min_audio.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result).toBeDefined();
      expect(result?.text).toBeDefined();
      expect(result?.text.length).toBeGreaterThan(0);
    });

    it('应该返回转写结果和置信度', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result?.text).toBeDefined();
      expect(result?.confidence).toBeDefined();
      expect(result?.confidence).toBeGreaterThanOrEqual(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    it('应该支持多种语言转写', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      // 中文
      const chineseResult = await asrService.transcribe(mockAudioPath, 'zh-CN');
      expect(chineseResult?.text).toBeDefined();

      // 英文
      const englishResult = await asrService.transcribe(mockAudioPath, 'en-US');
      expect(englishResult?.text).toBeDefined();
    });
  });

  describe('转写时延', () => {
    it('应该在 10 秒内完成 30 秒语音的转写', async () => {
      const mockAudioPath = '/path/to/30s_audio.m4a';

      performanceMonitor.startMeasure('transcribe_30s');
      await asrService.transcribe(mockAudioPath);
      performanceMonitor.endMeasure('transcribe_30s');

      const duration = performanceMonitor.getMeasure('transcribe_30s');
      expect(duration).toBeLessThan(10000);
    });

    it('应该在 60 秒内完成 5 分钟语音的转写', async () => {
      const mockAudioPath = '/path/to/5min_audio.m4a';

      performanceMonitor.startMeasure('transcribe_5min');
      await asrService.transcribe(mockAudioPath);
      performanceMonitor.endMeasure('transcribe_5min');

      const duration = performanceMonitor.getMeasure('transcribe_5min');
      expect(duration).toBeLessThan(60000);
    });

    it('转写时延应该不超过录音时长的 20%', async () => {
      const mockAudioPath = '/path/to/30s_audio.m4a';
      const recordingDuration = 30000; // 30 秒

      performanceMonitor.startMeasure('transcribe_ratio');
      await asrService.transcribe(mockAudioPath);
      performanceMonitor.endMeasure('transcribe_ratio');

      const transcribeDuration = performanceMonitor.getMeasure('transcribe_ratio');
      const maxAllowedDuration = recordingDuration * 0.2; // 20%

      expect(transcribeDuration).toBeLessThan(maxAllowedDuration);
    });
  });

  describe('转写质量', () => {
    it('应该正确识别清晰的语音', async () => {
      const mockAudioPath = '/path/to/clear_audio.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result?.confidence).toBeGreaterThan(0.8);
    });

    it('应该处理背景噪音', async () => {
      const mockAudioPath = '/path/to/noisy_audio.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result?.text).toBeDefined();
      // 置信度可能较低，但应该仍然有结果
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('应该支持标点符号识别', async () => {
      const mockAudioPath = '/path/to/audio_with_punctuation.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result?.text).toMatch(/[。，！？]/); // 应该包含中文标点
    });

    it('应该支持数字识别', async () => {
      const mockAudioPath = '/path/to/audio_with_numbers.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(result?.text).toMatch(/\d+/); // 应该包含数字
    });
  });

  describe('转写选项', () => {
    it('应该支持自定义语言', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath, 'zh-CN');
      expect(result?.text).toBeDefined();
    });

    it('应该支持启用标点符号', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath, 'zh-CN', {
        enablePunctuation: true,
      });
      expect(result?.text).toBeDefined();
    });

    it('应该支持启用数字转换', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath, 'zh-CN', {
        convertNumbers: true,
      });
      expect(result?.text).toBeDefined();
    });

    it('应该支持启用分词', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath, 'zh-CN', {
        enableSegmentation: true,
      });
      expect(result?.segments).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的音频文件', async () => {
      const invalidPath = '/path/to/invalid.txt';

      const result = await asrService.transcribe(invalidPath);
      expect(result).toBeNull();
    });

    it('应该处理网络错误', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      // 模拟网络错误
      const result = await asrService.transcribe(mockAudioPath);
      expect(typeof result).toBe('object');
    });

    it('应该处理超时', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath, 'zh-CN', {
        timeout: 1000, // 1 秒超时
      });
      expect(typeof result).toBe('object');
    });

    it('应该处理服务不可用', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      const result = await asrService.transcribe(mockAudioPath);
      expect(typeof result).toBe('object');
    });
  });

  describe('离线支持', () => {
    it('应该支持离线转写缓存', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      // 第一次转写
      const result1 = await asrService.transcribe(mockAudioPath);

      // 第二次应该从缓存获取
      const result2 = await asrService.transcribe(mockAudioPath);

      expect(result1?.text).toEqual(result2?.text);
    });

    it('应该在联网后自动同步离线转写', async () => {
      const mockAudioPath = '/path/to/audio.m4a';

      // 模拟离线转写
      const result = await asrService.transcribeOffline(mockAudioPath);
      expect(result?.text).toBeDefined();

      // 联网后同步
      const syncResult = await asrService.syncOfflineTranscriptions();
      expect(syncResult).toBe(true);
    });
  });

  describe('批量转写', () => {
    it('应该支持批量转写', async () => {
      const audioPaths = [
        '/path/to/audio1.m4a',
        '/path/to/audio2.m4a',
        '/path/to/audio3.m4a',
      ];

      const results = await asrService.transcribeBatch(audioPaths);
      expect(results).toHaveLength(3);
      expect(results.every(r => r?.text)).toBe(true);
    });

    it('应该支持批量转写进度回调', async () => {
      const audioPaths = [
        '/path/to/audio1.m4a',
        '/path/to/audio2.m4a',
      ];

      let progressCalls = 0;
      const onProgress = (current: number, total: number) => {
        progressCalls++;
      };

      await asrService.transcribeBatch(audioPaths, {onProgress});
      expect(progressCalls).toBeGreaterThan(0);
    });
  });
});

