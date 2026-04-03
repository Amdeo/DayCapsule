import React from 'react';
import { Linking, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HelpFaqItem } from './HelpFaqItem';
import {
  HELP_FAQ_ITEMS,
  HELP_SUPPORT_EMAIL,
} from './helpPageConfig';
import { helpPageStyles as styles } from './HelpPage.styles';

export function HelpPageContent() {
  return (
    <View testID="help-page-root">
      <Text style={styles.sectionTitle}>常见问题</Text>
      <View style={styles.faqList}>
        {HELP_FAQ_ITEMS.map((item) => (
          <HelpFaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>联系我们</Text>
      <View style={styles.contactCard}>
        <Text style={styles.contactText}>
          如果您遇到问题或有功能建议，欢迎通过以下方式联系我们：
        </Text>
        <Pressable
          style={styles.contactButton}
          onPress={() => Linking.openURL(`mailto:${HELP_SUPPORT_EMAIL}`)}
        >
          <Ionicons name="mail-outline" size={18} color="#6A89CC" />
          <Text style={styles.contactButtonText}>发送反馈邮件</Text>
        </Pressable>
      </View>
    </View>
  );
}
