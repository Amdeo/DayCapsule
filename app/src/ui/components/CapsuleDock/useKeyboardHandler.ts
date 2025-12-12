import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

/**
 * Custom hook to handle keyboard visibility and adjust component position.
 * Returns a shared value for animation and the keyboard height.
 */
const useKeyboardHandler = () => {
  const keyboardHeight = useSharedValue(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, { duration: 250 });
        setIsKeyboardVisible(true);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withTiming(0, { duration: 250 });
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const animatedKeyboardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboardHeight.value }],
    };
  });

  return { keyboardHeight, isKeyboardVisible, animatedKeyboardStyle };
};

export default useKeyboardHandler;