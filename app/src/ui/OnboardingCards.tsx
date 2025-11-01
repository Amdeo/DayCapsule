import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import {logger} from '@services/telemetry/logger';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  tips: string[];
  action?: string;
}

interface OnboardingCardsProps {
  onComplete?: () => void;
  onSkip?: () => void;
  testID?: string;
}

export const OnboardingCards: React.FC<OnboardingCardsProps> = ({
  onComplete,
  onSkip,
  testID,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '欢迎使用 MemoryCapsule',
      description: '一个功能强大的生活日志应用，帮助您记录和回顾美好时光',
      icon: '📱',
      tips: [
        '快速记录照片、文字和语音',
        '智能搜索和筛选您的记录',
        '多维时间线回顾',
      ],
    },
    {
      id: 'capture',
      title: '快速记录',
      description: '轻松记录您的日常生活',
      icon: '📸',
      tips: [
        '点击 + 按钮快速拍照',
        '支持文字、语音和位置记录',
        '自动保存到本地数据库',
      ],
      action: '开始记录',
    },
    {
      id: 'timeline',
      title: '多维时间线',
      description: '以不同方式浏览您的记录',
      icon: '📅',
      tips: [
        '日视图：按小时分段显示',
        '周视图：热度指示和统计',
        '月视图：日历热力图',
        '年视图：全年概览',
      ],
    },
    {
      id: 'search',
      title: '智能搜索',
      description: '快速找到您想要的记录',
      icon: '🔍',
      tips: [
        '全文搜索和语义搜索',
        '多维筛选（标签、心情、日期、地点）',
        '搜索历史和热门标签',
      ],
    },
    {
      id: 'ai',
      title: 'AI 标签建议',
      description: '智能识别和标记您的照片',
      icon: '🤖',
      tips: [
        '自动识别照片内容',
        '一键应用 AI 建议的标签',
        '提高记录的可搜索性',
      ],
    },
    {
      id: 'security',
      title: '隐私与安全',
      description: '保护您的个人数据',
      icon: '🔒',
      tips: [
        '支持生物识别和密码锁定',
        'AES-256-GCM 加密存储',
        '本地存储，数据不上云',
      ],
    },
  ];

  // 处理下一步
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      handleComplete();
    }
  };

  // 处理上一步
  const handlePrevious = () => {
    if (currentStep > 0) {
      animateTransition(() => {
        setCurrentStep(currentStep - 1);
      });
    }
  };

  // 处理完成
  const handleComplete = () => {
    logger.info('Onboarding completed');
    onComplete?.();
  };

  // 处理跳过
  const handleSkip = () => {
    logger.info('Onboarding skipped');
    onSkip?.();
  };

  // 动画过渡
  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <View style={styles.container} testID={testID}>
      {/* 进度条 */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, {width: `${progress}%`}]} />
      </View>

      {/* 内容 */}
      <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
        {/* 图标 */}
        <Text style={styles.icon}>{step.icon}</Text>

        {/* 标题 */}
        <Text style={styles.title}>{step.title}</Text>

        {/* 描述 */}
        <Text style={styles.description}>{step.description}</Text>

        {/* 提示列表 */}
        <View style={styles.tipsList}>
          {step.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* 按钮 */}
      <View style={styles.buttonContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePrevious}
            testID="onboarding_previous"
          >
            <Text style={styles.secondaryButtonText}>上一步</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          testID="onboarding_next"
        >
          <Text style={styles.primaryButtonText}>
            {currentStep === steps.length - 1 ? '完成' : '下一步'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 跳过按钮 */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        testID="onboarding_skip"
      >
        <Text style={styles.skipButtonText}>跳过教程</Text>
      </TouchableOpacity>

      {/* 步骤指示器 */}
      <View style={styles.stepIndicator}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentStep && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 40,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  tipsList: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  dotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
});

