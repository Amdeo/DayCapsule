/**
 * 记录编辑器组件
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Entry } from '../types/entry';

interface EntryEditorProps {
  visible: boolean;
  entry: Entry | null;
  onSave: (id: string, content: string, tags: string[]) => void;
  onClose: () => void;
}

export function EntryEditor({ visible, entry, onSave, onClose }: EntryEditorProps) {
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    console.log('EntryEditor useEffect 触发，visible:', visible, 'entry:', entry);
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
      if (entry) {
        setContent(entry.content);
        setTagsInput(entry.tags?.join(', ') || '');
      }
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setContent('');
        setTagsInput('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, entry]);

  console.log('EntryEditor 渲染检查，shouldRender:', shouldRender, 'entry:', !!entry, 'isAnimating:', isAnimating);

  if (!shouldRender || !entry) {
    console.log('EntryEditor 返回 null，shouldRender:', shouldRender, 'entry:', !!entry);
    return null;
  }

  console.log('EntryEditor 准备渲染，isAnimating:', isAnimating);

  const handleSave = () => {
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    onSave(entry.id, content, tags);
    onClose();
  };

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

        {/* 编辑器内容 */}
        {isAnimating && (
          <Animated.View
            entering={SlideInUp.duration(300).springify()}
            exiting={SlideOutDown.duration(250)}
            style={styles.editor}
          >
            <View
              style={{ flex: 1 }}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => {}}
            >
              {/* 头部 */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>编辑记录</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#4A4A4A" />
                </Pressable>
              </View>

              {/* 内容区域 */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* 类型标签 */}
                <View style={styles.typeTag}>
                  <Ionicons
                    name={
                      entry.type === 'text'
                        ? 'document-text'
                        : entry.type === 'photo'
                        ? 'image'
                        : 'mic'
                    }
                    size={16}
                    color="#6A89CC"
                  />
                  <Text style={styles.typeText}>
                    {entry.type === 'text' ? '文本' : entry.type === 'photo' ? '照片' : '语音'}
                  </Text>
                </View>

                {/* 内容输入 */}
                <View style={styles.section}>
                  <Text style={styles.label}>内容</Text>
                  <TextInput
                    style={styles.textInput}
                    value={content}
                    onChangeText={setContent}
                    placeholder="输入内容..."
                    placeholderTextColor="#A3A3A3"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>

                {/* 标签输入 */}
                <View style={styles.section}>
                  <Text style={styles.label}>标签</Text>
                  <TextInput
                    style={styles.input}
                    value={tagsInput}
                    onChangeText={setTagsInput}
                    placeholder="用逗号分隔多个标签，如：生活, 工作"
                    placeholderTextColor="#A3A3A3"
                  />
                  {tagsInput.length > 0 && (
                    <View style={styles.tagsPreview}>
                      {tagsInput
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter((tag) => tag.length > 0)
                        .map((tag, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>

                {/* 时间信息 */}
                <View style={styles.section}>
                  <Text style={styles.infoLabel}>创建时间</Text>
                  <Text style={styles.infoText}>
                    {new Date(entry.timestamp).toLocaleString('zh-CN')}
                  </Text>
                </View>
              </ScrollView>

              {/* 底部按钮 */}
              <View style={styles.footer}>
                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>保存</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editor: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    marginBottom: 20,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#4A4A4A',
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#4A4A4A',
    minHeight: 120,
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6A89CC',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A3A3A3',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#737373',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#737373',
  },
  saveButton: {
    backgroundColor: '#6A89CC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
