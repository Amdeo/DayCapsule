import React, { ReactNode } from 'react';
import { Dimensions, Modal, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailPageShellFrame } from './detail-page-shell/DetailPageShellFrame';
import { detailPageShellStyles as styles } from './detail-page-shell/DetailPageShell.styles';
import { useDetailPageShellController } from './detail-page-shell/useDetailPageShellController';

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
  const { shouldRender, isAnimating } = useDetailPageShellController(visible);

  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.container}>
        <Pressable
          testID="detail-page-backdrop"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        >
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            style={[styles.page, { height: SCREEN_HEIGHT }]}
          >
            <DetailPageShellFrame
              title={title}
              onClose={onClose}
              headerRight={headerRight}
              headerTopPadding={insets.top + 20}
              scrollEnabled={scrollEnabled}
              contentContainerStyle={contentContainerStyle}
              contentBottomPadding={40 + insets.bottom}
            >
              {children}
            </DetailPageShellFrame>
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
