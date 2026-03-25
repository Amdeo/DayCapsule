import React from 'react';
import {
  Modal,
  Pressable,
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

const BACKDROP_STYLE = {
  backgroundColor: visualLanguage.surface.backdrop,
};

const CARD_STYLE = {
  backgroundColor: visualLanguage.surface.modal,
  borderRadius: visualLanguage.radius.modal,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 8,
};

const TITLE_STYLE = {
  color: visualLanguage.text.primary,
};

const MESSAGE_STYLE = {
  color: visualLanguage.text.secondary,
};

const DETAIL_LABEL_STYLE = {
  color: visualLanguage.text.secondary,
};

const DETAIL_VALUE_STYLE = {
  color: visualLanguage.text.primary,
};

const ACTION_BUTTON_STYLE = {
  borderRadius: visualLanguage.radius.control,
};

const PRIMARY_BUTTON_STYLE = {
  backgroundColor: visualLanguage.accent.error,
};

const ACCENT_BUTTON_STYLE = {
  backgroundColor: visualLanguage.accent.brand,
};

const SECONDARY_BUTTON_STYLE = {
  backgroundColor: visualLanguage.surface.card,
};

const PRIMARY_LABEL_STYLE = {
  color: '#FFFFFF',
};

const SECONDARY_LABEL_STYLE = {
  color: visualLanguage.text.primary,
};

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
      <View className="flex-1 justify-center px-6">
        <Pressable
          testID="error-feedback-backdrop"
          className="absolute inset-0"
          style={BACKDROP_STYLE}
          onPress={onDismiss}
        />
        <View
          testID="error-feedback-card"
          className="px-5 py-[18px]"
          style={CARD_STYLE}
        >
          <Text className="mb-2 text-[20px] font-bold" style={TITLE_STYLE}>
            {request.title}
          </Text>
          {request.message ? (
            <Text className="mb-[18px] text-sm leading-5" style={MESSAGE_STYLE}>
              {request.message}
            </Text>
          ) : null}
          {request.details?.length ? (
            <View className="mb-[18px] gap-2.5">
              {request.details.map((detail, index) => (
                <View
                  key={`${detail.label}-${index}`}
                  className="flex-row items-center justify-between gap-4"
                >
                  <Text className="flex-1 text-sm leading-5" style={DETAIL_LABEL_STYLE}>
                    {detail.label}
                  </Text>
                  <Text className="text-sm font-bold leading-5" style={DETAIL_VALUE_STYLE}>
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View className="flex-row justify-end gap-2.5">
            {request.actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                testID={action.testID ?? `error-feedback-action-${index}`}
                onPress={action.onPress}
                style={[
                  ACTION_BUTTON_STYLE,
                  action.role === 'primary'
                    ? request.tone === 'accent'
                      ? ACCENT_BUTTON_STYLE
                      : PRIMARY_BUTTON_STYLE
                    : SECONDARY_BUTTON_STYLE,
                ]}
                className="min-w-[92px] items-center justify-center px-4 py-[11px]"
              >
                <Text
                  className="text-sm font-semibold"
                  style={[
                    action.role === 'primary'
                      ? PRIMARY_LABEL_STYLE
                      : SECONDARY_LABEL_STYLE,
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
