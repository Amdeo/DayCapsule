import React, { ReactNode, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface DetailPageShellProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}

export function DetailPageShell({
  visible,
  title,
  onClose,
  children,
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
      <View style={styles.container}>
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
            style={styles.page}
          >
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
              <Pressable
                testID="detail-page-back-button"
                onPress={onClose}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
              </Pressable>
              <Text style={styles.headerTitle}>{title}</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              testID="detail-page-scroll"
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: 40 + insets.bottom },
                contentContainerStyle,
              ]}
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
            >
              {children}
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  page: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20 },
});
