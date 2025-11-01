import {logger} from '@services/telemetry/logger';

export interface A11yLabel {
  componentId: string;
  label: string;
  hint?: string;
  role?: string;
  state?: string;
}

export interface VoicePrompt {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  duration?: number;
}

export interface A11yConfig {
  enabled: boolean;
  voiceEnabled: boolean;
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  fontSizeMultiplier: number;
}

/**
 * 无障碍服务
 * 提供无障碍标签、语音提示和屏幕阅读器支持
 */
export class A11yService {
  private config: A11yConfig = {
    enabled: true,
    voiceEnabled: false,
    screenReaderEnabled: false,
    highContrastEnabled: false,
    fontSizeMultiplier: 1,
  };

  private labels: Map<string, A11yLabel> = new Map();
  private voiceQueue: VoicePrompt[] = [];
  private isPlayingVoice: boolean = false;

  constructor(config?: Partial<A11yConfig>) {
    if (config) {
      this.config = {...this.config, ...config};
    }
    this.initializeA11y();
  }

  /**
   * 初始化无障碍功能
   */
  private initializeA11y(): void {
    try {
      this.registerDefaultLabels();
      logger.info('Accessibility service initialized', {config: this.config});
    } catch (error) {
      logger.error('Failed to initialize accessibility service', {error});
    }
  }

  /**
   * 注册默认标签
   */
  private registerDefaultLabels(): void {
    const defaultLabels: A11yLabel[] = [
      {
        componentId: 'capture_button',
        label: '拍照按钮',
        hint: '双击打开相机',
        role: 'button',
      },
      {
        componentId: 'timeline_view',
        label: '时间线视图',
        hint: '显示您的记录时间线',
        role: 'list',
      },
      {
        componentId: 'search_input',
        label: '搜索输入框',
        hint: '输入关键词搜索记录',
        role: 'searchbox',
      },
      {
        componentId: 'settings_button',
        label: '设置按钮',
        hint: '打开应用设置',
        role: 'button',
      },
      {
        componentId: 'entry_card',
        label: '记录卡片',
        hint: '点击查看详细信息',
        role: 'button',
      },
      {
        componentId: 'delete_button',
        label: '删除按钮',
        hint: '删除此项',
        role: 'button',
      },
      {
        componentId: 'share_button',
        label: '分享按钮',
        hint: '分享此记录',
        role: 'button',
      },
      {
        componentId: 'filter_panel',
        label: '筛选面板',
        hint: '应用筛选条件',
        role: 'group',
      },
    ];

    defaultLabels.forEach(label => {
      this.labels.set(label.componentId, label);
    });

    logger.info('Default accessibility labels registered', {
      count: defaultLabels.length,
    });
  }

  /**
   * 获取无障碍标签
   */
  getLabel(componentId: string): A11yLabel | null {
    return this.labels.get(componentId) || null;
  }

  /**
   * 注册自定义标签
   */
  registerLabel(label: A11yLabel): void {
    this.labels.set(label.componentId, label);
    logger.info('Accessibility label registered', {componentId: label.componentId});
  }

  /**
   * 注册多个标签
   */
  registerLabels(labels: A11yLabel[]): void {
    labels.forEach(label => {
      this.labels.set(label.componentId, label);
    });
    logger.info('Multiple accessibility labels registered', {count: labels.length});
  }

  /**
   * 播放语音提示
   */
  async playVoicePrompt(prompt: VoicePrompt): Promise<void> {
    try {
      if (!this.config.voiceEnabled) {
        logger.info('Voice prompts disabled');
        return;
      }

      this.voiceQueue.push(prompt);

      if (!this.isPlayingVoice) {
        await this.processVoiceQueue();
      }

      logger.info('Voice prompt queued', {promptId: prompt.id});
    } catch (error) {
      logger.error('Failed to play voice prompt', {error});
    }
  }

  /**
   * 处理语音队列
   */
  private async processVoiceQueue(): Promise<void> {
    try {
      while (this.voiceQueue.length > 0) {
        this.isPlayingVoice = true;
        const prompt = this.voiceQueue.shift();

        if (prompt) {
          // 模拟语音播放
          await this.simulateVoicePlayback(prompt);
        }
      }
    } catch (error) {
      logger.error('Error processing voice queue', {error});
    } finally {
      this.isPlayingVoice = false;
    }
  }

  /**
   * 模拟语音播放
   */
  private async simulateVoicePlayback(prompt: VoicePrompt): Promise<void> {
    return new Promise(resolve => {
      const duration = prompt.duration || 2000;
      setTimeout(() => {
        logger.info('Voice prompt played', {
          promptId: prompt.id,
          text: prompt.text,
        });
        resolve();
      }, duration);
    });
  }

  /**
   * 宣布消息（屏幕阅读器）
   */
  async announce(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    try {
      if (!this.config.screenReaderEnabled) {
        logger.info('Screen reader disabled');
        return;
      }

      const prompt: VoicePrompt = {
        id: `announce_${Date.now()}`,
        text: message,
        priority,
      };

      await this.playVoicePrompt(prompt);
    } catch (error) {
      logger.error('Failed to announce message', {error});
    }
  }

  /**
   * 启用高对比度
   */
  enableHighContrast(): void {
    this.config.highContrastEnabled = true;
    logger.info('High contrast mode enabled');
  }

  /**
   * 禁用高对比度
   */
  disableHighContrast(): void {
    this.config.highContrastEnabled = false;
    logger.info('High contrast mode disabled');
  }

  /**
   * 设置字体大小倍数
   */
  setFontSizeMultiplier(multiplier: number): void {
    this.config.fontSizeMultiplier = Math.max(0.8, Math.min(2, multiplier));
    logger.info('Font size multiplier set', {multiplier: this.config.fontSizeMultiplier});
  }

  /**
   * 获取配置
   */
  getConfig(): A11yConfig {
    return {...this.config};
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<A11yConfig>): void {
    this.config = {...this.config, ...config};
    logger.info('Accessibility config updated', {config: this.config});
  }

  /**
   * 获取所有标签
   */
  getAllLabels(): A11yLabel[] {
    return Array.from(this.labels.values());
  }

  /**
   * 清除标签
   */
  clearLabels(): void {
    this.labels.clear();
    logger.info('All accessibility labels cleared');
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.voiceQueue = [];
    this.labels.clear();
    logger.info('Accessibility service destroyed');
  }
}

// 导出单例
export const a11yService = new A11yService({
  enabled: true,
  voiceEnabled: false,
  screenReaderEnabled: false,
  highContrastEnabled: false,
  fontSizeMultiplier: 1,
});

