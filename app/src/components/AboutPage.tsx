/**
 * 关于页面组件
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailPageShell } from './DetailPageShell';

interface AboutPageProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutPage({ visible, onClose }: AboutPageProps) {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <DetailPageShell visible={visible} title="关于" onClose={onClose}>
      <View testID="about-page-root">
        <View className="items-center py-10">
          <View className="mb-4 h-[100px] w-[100px] items-center justify-center rounded-full bg-home-filter">
            <Text className="text-[48px]">📝</Text>
          </View>
          <Text className="mb-1 text-[28px] font-bold text-copy-primary">MemoryCapsule</Text>
          <Text className="mb-2 text-sm font-medium text-copy-muted">v1.0.0</Text>
          <Text className="text-center text-base text-neutral-500">记录生活的每个瞬间</Text>
        </View>

        <View className="mb-8">
          <Text className="mb-4 text-lg font-bold text-copy-primary">功能特性</Text>
          <View className="gap-3">
            <FeatureItem icon="document-text" text="文本记录 - 快速记录想法和灵感" />
            <FeatureItem icon="image" text="照片记录 - 捕捉美好瞬间" />
            <FeatureItem icon="mic" text="语音记录 - 记录声音和情感" />
            <FeatureItem icon="search" text="智能搜索 - 快速找到记忆" />
            <FeatureItem icon="pricetags" text="标签管理 - 分类整理记录" />
            <FeatureItem icon="time" text="时间轴 - 按时间浏览记忆" />
          </View>
        </View>

        <View className="mb-8">
          <Text className="mb-4 text-lg font-bold text-copy-primary">技术栈</Text>
          <View className="gap-2">
            <TechItem name="React Native" version="0.81.5" />
            <TechItem name="Expo SDK" version="54" />
            <TechItem name="TypeScript" version="5.9" />
            <TechItem name="Zustand" version="5.0" />
            <TechItem name="NativeWind" version="4.0" />
            <TechItem name="Reanimated" version="4.1" />
          </View>
        </View>

        <View className="mb-8">
          <Text className="mb-4 text-lg font-bold text-copy-primary">开发者</Text>
          <Text className="text-sm leading-[22px] text-neutral-500">
            Built with ❤️ using 2025-2026 modern React Native tech stack
          </Text>
        </View>

        <View className="mb-8">
          <Text className="mb-4 text-lg font-bold text-copy-primary">更多信息</Text>
          <Pressable
            className="mb-3 flex-row items-center rounded-xl bg-neutral-100 px-4 py-4"
            onPress={() => handleOpenLink('https://github.com')}
          >
            <Ionicons name="logo-github" size={20} color="#6A89CC" />
            <Text className="ml-3 flex-1 text-[15px] font-medium text-copy-primary">
              GitHub 仓库
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
          </Pressable>
          <Pressable
            className="flex-row items-center rounded-xl bg-neutral-100 px-4 py-4"
            onPress={() => handleOpenLink('https://expo.dev')}
          >
            <Ionicons name="document-text" size={20} color="#6A89CC" />
            <Text className="ml-3 flex-1 text-[15px] font-medium text-copy-primary">
              使用文档
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
          </Pressable>
        </View>

        <View className="items-center py-8">
          <Text className="mb-1 text-xs text-copy-muted">© 2026 MemoryCapsule</Text>
          <Text className="text-xs text-copy-muted">All rights reserved</Text>
        </View>
      </View>
    </DetailPageShell>
  );
}

// 功能项组件
function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-home-filter">
        <Ionicons name={icon as any} size={18} color="#6A89CC" />
      </View>
      <Text className="flex-1 text-[15px] text-copy-primary">{text}</Text>
    </View>
  );
}

// 技术栈项组件
function TechItem({ name, version }: { name: string; version: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-chip bg-neutral-100 px-4 py-3">
      <Text className="text-[15px] font-semibold text-copy-primary">{name}</Text>
      <Text className="text-sm text-neutral-500">v{version}</Text>
    </View>
  );
}
