import React, { useState } from 'react';
import { Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { helpPageStyles as styles } from './HelpPage.styles';

interface HelpFaqItemProps {
  question: string;
  answer: string;
}

export function HelpFaqItem({ question, answer }: HelpFaqItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      style={styles.faqItem}
      onPress={() => setOpen((value) => !value)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{question}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#A3A3A3"
        />
      </View>
      {open && <Text style={styles.faqA}>{answer}</Text>}
    </Pressable>
  );
}
