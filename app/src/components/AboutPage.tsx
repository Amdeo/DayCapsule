/**
 * 关于页面组件
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface AboutPageProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutPage({ visible, onClose }: AboutPageProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!shouldRender) {
    return null;
  }

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 半透明背景 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {isAnimating && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {/* 页面内容 */}
        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            style={styles.page}
          >
            <View
              style={{ flex: 1 }}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => {}}
            >
              {/* 头部 */}
              <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
                </Pressable>
                <Text style={styles.headerTitle}>关于</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* 内容区域 */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Logo 和名称 */}
                <View style={styles.logoSection}>
                  <View style={styles.logoContainer}>
                    <Text style={styles.logoEmoji}>📝</Text>
                  </View>
                  <Text style={styles.appName}>MemoryCapsule</Text>
                  <Text style={styles.version}>v1.0.0</Text>
                  <Text style={styles.tagline}>记录生活的每个瞬间</Text>
                </View>

                {/* 功能介绍 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>功能特性</Text>
                  <View style={styles.featureList}>
                    <FeatureItem icon="document-text" text="文本记录 - 快速记录想法和灵感" />
                    <FeatureItem icon="image" text="照片记录 - 捕捉美好瞬间" />
                    <FeatureItem icon="mic" text="语音记录 - 记录声音和情感" />
                    <FeatureItem icon="search" text="智能搜索 - 快速找到记忆" />
                    <FeatureItem icon="pricetags" text="标签管理 - 分类整理记录" />
                    <FeatureItem icon="time" text="时间轴 - 按时间浏览记忆" />
                  </View>
                </View>

                {/* 技术栈 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>技术栈</Text>
                  <View style={styles.techStack}>
                    <TechItem name="React Native" version="0.81.5" />
                    <TechItem name="Expo SDK" version="54" />
                    <TechItem name="TypeScript" version="5.9" />
                    <TechItem name="Zustand" version="5.0" />
                    <TechItem name="NativeWind" version="4.0" />
                    <TechItem name="Reanimated" version="4.1" />
                  </View>
                </View>

                {/* 开发者信息 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>开发者</Text>
                  <Text style={styles.developer}>Built with ❤️ using 2025-2026 modern React Native tech stack</Text>
                </View>

                {/* 链接 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>更多信息</Text>
                  <Pressable
                    style={styles.linkButton}
                    onPress={() => handleOpenLink('https://github.com')}
                  >
                    <Ionicons name="logo-github" size={20} color="#6A89CC" />
                    <Text style={styles.linkText}>GitHub 仓库</Text>
                    <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
                  </Pressable>
                  <Pressable
                    style={styles.linkButton}
                    onPress={() => handleOpenLink('https://expo.dev')}
                  >
                    <Ionicons name="document-text" size={20} color="#6A89CC" />
                    <Text style={styles.linkText}>使用文档</Text>
                    <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
                  </Pressable>
                </View>

                {/* 版权信息 */}
                <View style={styles.footer}>
                  <Text style={styles.copyright}>© 2026 MemoryCapsule</Text>
                  <Text style={styles.copyright}>All rights reserved</Text>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

// 功能项组件
function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={18} color="#6A89CC" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// 技术栈项组件
function TechItem({ name, version }: { name: string; version: string }) {
  return (
    <View style={styles.techItem}>
      <Text style={styles.techName}>{name}</Text>
      <Text style={styles.techVersion}>v{version}</Text>
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingTop: 60,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 50,
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A3A3A3',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#737373',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 18,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#4A4A4A',
  },
  techStack: {
    gap: 8,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  techName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  techVersion: {
    fontSize: 14,
    color: '#737373',
  },
  developer: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 22,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#4A4A4A',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  copyright: {
    fontSize: 12,
    color: '#A3A3A3',
    marginBottom: 4,
  },
});
