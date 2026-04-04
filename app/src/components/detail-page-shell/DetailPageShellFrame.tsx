import React, { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { detailPageShellStyles as styles } from './DetailPageShell.styles';

interface DetailPageShellFrameProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  headerTopPadding: number;
  contentBottomPadding: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled: boolean;
  footerContent?: ReactNode;
}

export function DetailPageShellFrame({
  title,
  onClose,
  children,
  headerLeft,
  headerRight,
  headerTopPadding,
  contentBottomPadding,
  contentContainerStyle,
  scrollEnabled,
  footerContent,
}: DetailPageShellFrameProps) {
  return (
    <View style={{ flex: 1 }}>
      <View testID="detail-page-header" style={[styles.header, { paddingTop: headerTopPadding }]}>
        {headerLeft ? (
          <View style={styles.backButton}>{headerLeft}</View>
        ) : (
          <Pressable
            testID="detail-page-back-button"
            onPress={onClose}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        {headerRight ? (
          <View testID="detail-page-header-right" style={styles.headerRight}>{headerRight}</View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {scrollEnabled ? (
        <ScrollView
          testID="detail-page-scroll"
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: contentBottomPadding },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View
          testID="detail-page-content"
          style={[
            styles.content,
            styles.staticContent,
            { paddingBottom: contentBottomPadding },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}

      {footerContent}
    </View>
  );
}
