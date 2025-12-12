/**
 * 引导页组件
 * 首次使用应用时的功能介绍页面
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

const {width, height} = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete?: () => void;
}

interface OnboardingItem {
  id: number;
  title: string;
  description: string;
  icon: string;
}

const onboardingData: OnboardingItem[] = [
  {
    id: 1,
    title: '记录生活瞬间',
    description: '用照片、语音和文字记录每一个珍贵时刻，让回忆永不褪色。',
    icon: '📸',
  },
  {
    id: 2,
    title: '智能时间线',
    description: '按时间顺序展示所有记录，让您轻松回顾生活的点点滴滴。',
    icon: '📅',
  },
  {
    id: 3,
    title: '强大搜索',
    description: '支持全文搜索和语义搜索，快速找到您想要的任何记忆。',
    icon: '🔍',
  },
  {
    id: 4,
    title: '隐私安全',
    description: '本地加密存储，生物识别保护，您的隐私安全是我们的首要任务。',
    icon: '🔒',
  },
];

/**
 * 引导页组件
 */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({onComplete}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const handleDotPress = (index: number) => {
    setCurrentIndex(index);
  };

  const renderItem = (item: OnboardingItem) => (
    <View key={item.id} style={[styles.slide, {backgroundColor: theme.colors.background}]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={[styles.title, {color: theme.colors.onBackground}]}>{item.title}</Text>
      <Text style={[styles.description, {color: theme.colors.onSurfaceVariant}]}>
        {item.description}
      </Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotContainer}>
      {onboardingData.map((_, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentIndex ? theme.colors.primary : theme.colors.outline,
              width: index === currentIndex ? 24 : 8,
            },
          ]}
          onPress={() => handleDotPress(index)}
        />
      ))}
    </View>
  );

  const renderButtons = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.skipButton, {borderColor: theme.colors.outline}]}
        onPress={handleSkip}>
        <Text style={[styles.skipButtonText, {color: theme.colors.onSurfaceVariant}]}>
          跳过
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.nextButton, {backgroundColor: theme.colors.primary}]}
        onPress={handleNext}>
        <Text style={[styles.nextButtonText, {color: theme.colors.onPrimary}]}>
          {currentIndex === onboardingData.length - 1 ? '开始使用' : '下一步'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}>
        {onboardingData.map(renderItem)}
      </ScrollView>
      {renderDots()}
      {renderButtons()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  icon: {
    fontSize: 80,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  skipButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;