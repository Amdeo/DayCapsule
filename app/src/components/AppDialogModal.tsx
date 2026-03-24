import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { visualLanguage } from '@/src/theme/visualLanguage';
import type { AppDialogRequest } from '@/src/store/appDialogStore';

interface AppDialogModalProps {
  visible: boolean;
  request: AppDialogRequest | null;
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

const SECONDARY_BUTTON_STYLE = {
  backgroundColor: visualLanguage.surface.card,
};

const PRIMARY_LABEL_STYLE = {
  color: '#FFFFFF',
};

const SECONDARY_LABEL_STYLE = {
  color: visualLanguage.text.primary,
};

const SUCCESS_BUTTON_STYLE = {
  backgroundColor: '#5E9B6B',
};

const NEUTRAL_BUTTON_STYLE = {
  backgroundColor: visualLanguage.text.primary,
};

const DESTRUCTIVE_BUTTON_STYLE = {
  backgroundColor: visualLanguage.accent.error,
};

const ACCENT_BUTTON_STYLE = {
  backgroundColor: visualLanguage.accent.brand,
};

function resolvePrimaryButtonStyle(request: AppDialogRequest) {
  switch (request.tone) {
    case 'accent':
      return ACCENT_BUTTON_STYLE;
    case 'success':
      return SUCCESS_BUTTON_STYLE;
    case 'neutral':
      return NEUTRAL_BUTTON_STYLE;
    case 'error':
    default:
      return DESTRUCTIVE_BUTTON_STYLE;
  }
}

export function AppDialogModal({
  visible,
  request,
  onDismiss,
}: AppDialogModalProps) {
  if (!visible || !request) {
    return null;
  }

  const isStacked = request.actions.length > 2;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={request.blocking ? undefined : onDismiss}
    >
      <View className="flex-1 justify-center px-6">
        <Pressable
          testID="app-dialog-backdrop"
          className="absolute inset-0"
          style={BACKDROP_STYLE}
          onPress={request.blocking ? undefined : onDismiss}
        />
        <View
          testID="app-dialog-card"
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
          <View
            className={isStacked ? 'gap-2.5' : 'flex-row justify-end gap-2.5'}
            testID={isStacked ? 'app-dialog-actions-stacked' : 'app-dialog-actions-inline'}
          >
            {request.actions.map((action, index) => {
              const buttonStyle = action.role === 'secondary'
                ? SECONDARY_BUTTON_STYLE
                : action.role === 'destructive'
                  ? DESTRUCTIVE_BUTTON_STYLE
                  : resolvePrimaryButtonStyle(request);

              const labelStyle = action.role === 'secondary'
                ? SECONDARY_LABEL_STYLE
                : PRIMARY_LABEL_STYLE;

              return (
                <Pressable
                  key={`${action.label}-${index}`}
                  disabled={action.disabled}
                  onPress={action.onPress}
                  style={[ACTION_BUTTON_STYLE, buttonStyle]}
                  className="min-w-[92px] items-center justify-center px-4 py-[11px]"
                >
                  <Text
                    testID={`app-dialog-action-${index}`}
                    className="text-sm font-semibold"
                    style={labelStyle}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
