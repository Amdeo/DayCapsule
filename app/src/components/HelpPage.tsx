/**
 * 帮助与反馈页面
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface HelpPageProps {
  visible: boolean;
  onClose: () => void;
}

const FAQ = [
  {
    q: '如何添加文字记录？',
    a: '点击底部蓝色 + 按钮，选择"文字"，输入内容后点击保存。',
  },
  {
    q: '如何录制语音记忆？',
    a: '点击底部 + 按钮，选择"语音"，应用会立即开始录音。点击录音卡片上的暂停/停止按钮控制录音。',
  },
  {
    q: '如何添加照片？',
    a: '点击底部 + 按钮，选择"照片"，从相册中选择一张照片即可保存。',
  },
  {
    q: '如何搜索记录？',
    a: '点击顶部搜索框，输入关键词即可实时搜索所有记录的内容和标签。',
  },
  {
    q: '如何按类型筛选？',
    a: '点击搜索框右侧的筛选图标，可以按记录类型（文字/照片/语音）和时间范围进行过滤。',
  },
  {
    q: '如何编辑或删除记录？',
    a: '长按记录卡片，或点击卡片右上角的菜单按钮，可以选择编辑或删除。',
  },
  {
    q: '数据存储在哪里？',
    a: '所有数据存储在您的设备本地，不会上传到任何服务器，完全私密安全。',
  },
  {
    q: '如何导出数据？',
    a: '进入设置 → 数据 → 导出数据，可以将所有记录导出为 JSON 格式并分享。',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={styles.faqItem}
      activeOpacity={0.7}
      onPress={() => setOpen((v) => !v)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#A3A3A3" />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

export function HelpPage({ visible, onClose }: HelpPageProps) {
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      const t = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
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

        {isAnimating && (
          <Animated.View
            entering={SlideInRight.duration(300).springify()}
            exiting={SlideOutRight.duration(250)}
            style={styles.page}
          >
            <View style={{ flex: 1 }} onStartShouldSetResponder={() => true}>
              <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
                </Pressable>
                <Text style={styles.headerTitle}>帮助与反馈</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>常见问题</Text>
                <View style={styles.faqList}>
                  {FAQ.map((item, i) => (
                    <FaqItem key={i} q={item.q} a={item.a} />
                  ))}
                </View>

                <Text style={styles.sectionTitle}>联系我们</Text>
                <View style={styles.contactCard}>
                  <Text style={styles.contactText}>
                    如果您遇到问题或有功能建议，欢迎通过以下方式联系我们：
                  </Text>
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => Linking.openURL('mailto:support@memorycapsule.app')}
                  >
                    <Ionicons name="mail-outline" size={18} color="#6A89CC" />
                    <Text style={styles.contactButtonText}>发送反馈邮件</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 40 + insets.bottom }} />
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  page: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#4A4A4A' },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#A3A3A3',
    marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  faqList: { backgroundColor: '#F5F5F5', borderRadius: 12, overflow: 'hidden' },
  faqItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { flex: 1, fontSize: 15, fontWeight: '500', color: '#4A4A4A', marginRight: 8 },
  faqA: { fontSize: 14, color: '#737373', marginTop: 10, lineHeight: 20 },
  contactCard: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16 },
  contactText: { fontSize: 14, color: '#737373', lineHeight: 20, marginBottom: 16 },
  contactButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#E5E5E5',
  },
  contactButtonText: { fontSize: 15, color: '#6A89CC', fontWeight: '500' },
});
