import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { visualLanguage } from '@/src/theme/visualLanguage';
import type { ErrorFeedbackRequest } from '@/src/store/errorFeedbackStore';

interface ErrorFeedbackModalProps {
  visible: boolean;
  request: ErrorFeedbackRequest | null;
  onDismiss: () => void;
}

export function ErrorFeedbackModal({
  visible,
  request,
  onDismiss,
}: ErrorFeedbackModalProps) {
  if (!visible || !request) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Pressable
          testID="error-feedback-backdrop"
          style={styles.backdrop}
          onPress={onDismiss}
        />
        <View testID="error-feedback-card" style={styles.card}>
          <Text style={styles.title}>{request.title}</Text>
          <Text style={styles.message}>{request.message}</Text>
          <View style={styles.actions}>
            {request.actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                onPress={action.onPress}
                style={[
                  styles.actionButton,
                  action.role === 'primary'
                    ? styles.primaryButton
                    : styles.secondaryButton,
                ]}
              >
                <Text
                  testID={`error-feedback-action-${index}`}
                  style={[
                    styles.actionLabel,
                    action.role === 'primary'
                      ? styles.primaryButtonLabel
                      : styles.secondaryButtonLabel,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: visualLanguage.surface.backdrop,
  },
  card: {
    backgroundColor: visualLanguage.surface.modal,
    borderRadius: visualLanguage.radius.modal,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    color: visualLanguage.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: visualLanguage.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    minWidth: 92,
    borderRadius: visualLanguage.radius.control,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: visualLanguage.accent.error,
  },
  secondaryButton: {
    backgroundColor: visualLanguage.surface.card,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
  },
  secondaryButtonLabel: {
    color: visualLanguage.text.primary,
  },
});
