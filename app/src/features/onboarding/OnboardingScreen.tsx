/**
 * 引导页组件
 * 首次使用应用时的功能介绍页面
 */

import React from 'react';
import {useTheme} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch} from '@store/hooks';
import {completeOnboarding} from '@store/slices/appSlice';
import {OnboardingCards} from '@ui/OnboardingCards';

interface OnboardingScreenProps {
  onComplete?: () => void;
}

/**
 * 引导页组件
 */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({onComplete}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const handleComplete = () => {
    // 完成引导，更新Redux状态
    dispatch(completeOnboarding());
    onComplete?.();
  };

  const handleSkip = () => {
    // 跳过引导，更新Redux状态
    dispatch(completeOnboarding());
    onComplete?.();
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
      <OnboardingCards
        onComplete={handleComplete}
        onSkip={handleSkip}
        testID="onboarding_screen"
      />
    </SafeAreaView>
  );
};

export default OnboardingScreen;