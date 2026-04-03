import type { ComponentProps } from 'react';
import React from 'react';
import type { GestureResponderHandlers } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LastAddType } from '@/src/store/settingsStore';
import { FanOptionButton } from './FanOptionButton';
import { fabMenuStyles as styles } from './FABMenu.styles';
import { FAN_OPTIONS } from './fabMenuConfig';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface FABMenuViewProps {
  isExpanded: boolean;
  fanProgress: SharedValue<number>;
  hoveredIndex: SharedValue<number>;
  panHandlers: GestureResponderHandlers;
  fabIcon: IoniconName;
  fabBgColor: string;
  lastAddType: LastAddType | null;
  backdropAnimatedStyle: AnimatedStyle<ViewStyle>;
  fabTranslateYStyle: AnimatedStyle<ViewStyle>;
  onCloseFan: () => void;
}

export function FABMenuView({
  isExpanded,
  fanProgress,
  hoveredIndex,
  panHandlers,
  fabIcon,
  fabBgColor,
  lastAddType,
  backdropAnimatedStyle,
  fabTranslateYStyle,
  onCloseFan,
}: FABMenuViewProps) {
  return (
    <>
      <Animated.View
        style={[styles.backdropOverlay, backdropAnimatedStyle]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCloseFan} />
      </Animated.View>

      <View style={styles.optionsOverlay} pointerEvents="none">
        {FAN_OPTIONS.map((option, index) => (
          <FanOptionButton
            key={option.type}
            option={option}
            index={index}
            fanProgress={fanProgress}
            hoveredIndex={hoveredIndex}
          />
        ))}
      </View>

      <Animated.View style={[styles.fabContainer, fabTranslateYStyle]} pointerEvents="box-none">
        <View style={styles.mainButtonWrapper}>
          <View
            testID="fab-main-button"
            {...panHandlers}
            style={[styles.mainButton, { backgroundColor: fabBgColor }]}
          >
            <Ionicons name={fabIcon} size={28} color="#FFFFFF" />
          </View>

          {lastAddType === null && !isExpanded ? (
            <View style={styles.tipBubble}>
              <Text style={styles.tipText}>长按选择记录类型</Text>
              <View style={styles.tipArrow} />
            </View>
          ) : null}
        </View>
      </Animated.View>
    </>
  );
}
