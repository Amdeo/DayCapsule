/**
 * 帮助与反馈页面
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailPageShell } from './DetailPageShell';

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
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      className="border-b border-[#EBEBEB] px-4 py-[14px]"
      activeOpacity={0.7}
      onPress={() => setOpen((v) => !v)}
    >
      <View className="flex-row items-center justify-between">
        <Text className="mr-2 flex-1 text-[15px] font-medium text-copy-primary">{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#A3A3A3" />
      </View>
      {open ? (
        <Text className="mt-2.5 text-sm leading-5 text-neutral-500">{a}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export function HelpPage({ visible, onClose }: HelpPageProps) {
  return (
    <DetailPageShell visible={visible} title="帮助与反馈" onClose={onClose}>
      <View testID="help-page-root">
        <Text className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.5px] text-copy-muted">
          常见问题
        </Text>
        <View className="overflow-hidden rounded-chip bg-neutral-100">
          {FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </View>

        <Text className="mb-3 mt-6 text-[13px] font-bold uppercase tracking-[0.5px] text-copy-muted">
          联系我们
        </Text>
        <View className="rounded-chip bg-neutral-100 p-4">
          <Text className="mb-4 text-sm leading-5 text-neutral-500">
            如果您遇到问题或有功能建议，欢迎通过以下方式联系我们：
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-2 rounded-[10px] border border-border-subtle bg-background-elevated p-[14px]"
            onPress={() => Linking.openURL('mailto:support@memorycapsule.app')}
          >
            <Ionicons name="mail-outline" size={18} color="#6A89CC" />
            <Text className="text-[15px] font-medium text-primary">发送反馈邮件</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DetailPageShell>
  );
}
