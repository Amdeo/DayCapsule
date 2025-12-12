/**
 * 主导航器
 * 管理应用的根导航结构
 */

import React from 'react';
import {NavigationContainer, useNavigation} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {useTheme} from 'react-native-paper';

import {RootStackParamList} from './types';
import {useAppSelector, useAppDispatch} from '@store/hooks';
import {selectIsFirstLaunch, completeOnboarding} from '@store/slices/appSlice';
import {ErrorBoundary} from '@ui/ErrorBoundary';
import TimelineScreen from '@features/timeline/screens/TimelineScreen'; // Import the new TimelineScreen
import {OnboardingScreen} from '@features/onboarding/OnboardingScreen'; // Keep Onboarding

// 导航器实例
const Stack = createStackNavigator();

/**
 * 根导航器组件
 * 管理应用的主要导航流程，简化为单一主屏幕
 */
export const AppNavigator: React.FC = () => {
  const theme = useTheme();
  const isFirstLaunch = useAppSelector(selectIsFirstLaunch);
  const dispatch = useAppDispatch();

  const handleOnboardingComplete = (navigation: any) => {
    // 完成引导，更新Redux状态
    dispatch(completeOnboarding());
    // 导航到主界面
    navigation.reset({
      index: 0,
      routes: [{name: 'Timeline'}], // Navigate to TimelineScreen
    });
  };

  return (
    <NavigationContainer theme={theme}>
      <ErrorBoundary>
        <Stack.Navigator
          initialRouteName={isFirstLaunch ? 'Onboarding' : 'Timeline'} // Changed 'Main' to 'Timeline'
          screenOptions={{
            headerShown: false,
            presentation: 'card',
            animationTypeForReplace: 'push',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}>
          {/* 引导页 */}
          <Stack.Screen
            name="Onboarding"
            options={{
              gestureEnabled: false,
              animationTypeForReplace: 'pop',
            }}>
            {(props: any) => (
              <OnboardingScreen
                {...props}
                onComplete={() => handleOnboardingComplete(props.navigation)}
              />
            )}
          </Stack.Screen>

          {/* TimelineScreen 作为应用的主要内容屏幕 */}
          <Stack.Screen
            name="Timeline" // Changed name from 'Main'
            component={TimelineScreen}
            options={{
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </ErrorBoundary>
    </NavigationContainer>
  );
};