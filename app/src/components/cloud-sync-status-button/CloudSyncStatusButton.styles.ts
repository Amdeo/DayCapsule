import { type ViewStyle } from 'react-native';

export const cloudSyncStatusButtonStyles = {
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
