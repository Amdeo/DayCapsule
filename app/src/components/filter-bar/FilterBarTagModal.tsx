import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { filterBarStyles as styles } from './FilterBar.styles';

interface FilterBarTagModalProps {
  visible: boolean;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClose: () => void;
  onClear: () => void;
}

export function FilterBarTagModal({
  visible,
  allTags,
  selectedTags,
  onToggleTag,
  onClose,
  onClear,
}: FilterBarTagModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalDismissArea} onPress={onClose}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.modalBackdrop}
            pointerEvents="none"
          />
        </Pressable>

        <Animated.View
          entering={SlideInUp.duration(300).springify()}
          style={styles.modalContent}
        >
          <View
            style={styles.modalContentBody}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择标签</Text>
              <View style={styles.modalHeaderButtons}>
                {selectedTags.length > 0 ? (
                  <TouchableOpacity onPress={onClear} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>清除</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
                  <Ionicons name="close" size={24} color="#4A4A4A" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
              {allTags.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pricetags-outline" size={48} color="#D1D1D1" />
                  <Text style={styles.emptyText}>暂无标签</Text>
                  <Text style={styles.emptyHint}>在编辑记录时添加标签</Text>
                </View>
              ) : (
                <View style={styles.tagGrid}>
                  {allTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                        onPress={() => onToggleTag(tag)}
                      >
                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#FFFFFF"
                            style={styles.tagChipCheckmark}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.tagChipText,
                            isSelected && styles.tagChipTextSelected,
                          ]}
                        >
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
