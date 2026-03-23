import React, { ReactNode, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface DetailPageShellProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerRight?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}

export function DetailPageShell({
  visible,
  title,
  onClose,
  children,
  headerRight,
  contentContainerStyle,
  scrollEnabled = true,
}: DetailPageShellProps) {
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView className="flex-1">
        <Pressable
          testID="detail-page-backdrop"
          className="absolute inset-0"
          onPress={onClose}
        >
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              className="absolute inset-0 bg-black/50"
              pointerEvents="none"
            />
          )}
        </Pressable>

        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            className="absolute inset-x-0 top-0 bg-background-elevated shadow-lg shadow-black/10"
            style={{ height: SCREEN_HEIGHT }}
            testID="detail-page-shell"
          >
            <View
              className="flex-row items-center justify-between border-b border-border-subtle px-4 pb-4"
              style={{ paddingTop: insets.top + 20 }}
              testID="detail-page-header"
            >
              <Pressable
                testID="detail-page-back-button"
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full"
              >
                <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
              </Pressable>
              <Text className="text-lg font-bold text-copy-primary">{title}</Text>
              {headerRight ? (
                <View
                  className="min-w-10 items-end justify-center"
                  testID="detail-page-header-right"
                >
                  {headerRight}
                </View>
              ) : (
                <View className="w-10" />
              )}
            </View>

            {scrollEnabled ? (
              <ScrollView
                testID="detail-page-scroll"
                className="flex-1"
                showsVerticalScrollIndicator={false}
              >
                <View
                  className="px-5"
                  style={[
                    { paddingBottom: 40 + insets.bottom },
                    contentContainerStyle,
                  ]}
                >
                  {children}
                </View>
              </ScrollView>
            ) : (
              <View
                testID="detail-page-content"
                className="flex-1 px-5"
                style={[
                  { paddingBottom: 40 + insets.bottom },
                  contentContainerStyle,
                ]}
              >
                {children}
              </View>
            )}
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
