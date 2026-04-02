import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { ConfirmDialogRequest } from '@/src/store/confirmDialogStore';
import { visualLanguage } from '@/src/theme/visualLanguage';

interface ConfirmDialogModalProps {
  visible: boolean;
  request: ConfirmDialogRequest | null;
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

const ACTION_BUTTON_STYLE = {
  borderRadius: visualLanguage.radius.control,
};

const PRIMARY_BUTTON_STYLE = {
  backgroundColor: visualLanguage.accent.brand,
};

const DANGER_BUTTON_STYLE = {
  backgroundColor: visualLanguage.accent.error,
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

export function ConfirmDialogModal({ visible, request, onDismiss }: ConfirmDialogModalProps) {
  if (!visible || !request) {
    return null;
  }

  const handleBackdropPress = () => {
    if (request.dismissible !== false) {
      onDismiss();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleBackdropPress}
    >
      <View className="flex-1 justify-center px-6">
        <Pressable
          testID="confirm-dialog-backdrop"
          className="absolute inset-0"
          style={BACKDROP_STYLE}
          onPress={handleBackdropPress}
        />
        <View testID="confirm-dialog-card" className="px-5 py-[18px]" style={CARD_STYLE}>
          <Text className="mb-2 text-[20px] font-bold" style={TITLE_STYLE}>
            {request.title}
          </Text>
          {request.message ? (
            <Text className="mb-[18px] text-sm leading-5" style={MESSAGE_STYLE}>
              {request.message}
            </Text>
          ) : null}
          <View className="flex-row justify-end gap-2.5">
            {request.actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                testID={action.testID ?? `confirm-dialog-action-${index}`}
                onPress={action.onPress}
                style={[
                  ACTION_BUTTON_STYLE,
                  action.role === 'primary'
                    ? PRIMARY_BUTTON_STYLE
                    : action.role === 'danger'
                      ? DANGER_BUTTON_STYLE
                      : SECONDARY_BUTTON_STYLE,
                ]}
                className="min-w-[92px] items-center justify-center px-4 py-[11px]"
              >
                <Text
                  className="text-sm font-semibold"
                  style={action.role === 'secondary' ? SECONDARY_LABEL_STYLE : PRIMARY_LABEL_STYLE}
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
