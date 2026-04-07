import { type ViewStyle } from 'react-native';

export const cloudSyncStatusButtonStyles = {
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EEE7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  cloudWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(106, 137, 204, 0.18)',
    borderTopColor: '#6A89CC',
  },
} satisfies {
  button: ViewStyle;
  cloudWrap: ViewStyle;
  syncRing: ViewStyle;
};
