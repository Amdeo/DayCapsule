import { type ViewStyle, type TextStyle } from 'react-native';

export const TOPBAR_BUTTON_SIZE = 48;
export const TOPBAR_RADIUS = 14;
export const TOPBAR_BORDER = '#E8DED1';
export const TOPBAR_BUTTON_BG = '#F3EEE7';
export const TOPBAR_SEARCH_BG = '#F8F5F0';
export const TOPBAR_SEARCH_BORDER = '#ECE3D8';
export const TOPBAR_TOGGLE_INACTIVE = '#8F8477';

export const searchBarStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: TOPBAR_BUTTON_SIZE,
    backgroundColor: TOPBAR_SEARCH_BG,
    borderRadius: TOPBAR_RADIUS,
    borderWidth: 1,
    borderColor: TOPBAR_SEARCH_BORDER,
    paddingHorizontal: 16,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: '#A3A3A3',
  },
  toolButton: {
    width: TOPBAR_BUTTON_SIZE,
    height: TOPBAR_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOPBAR_BUTTON_BG,
    borderRadius: TOPBAR_RADIUS,
    borderWidth: 1,
    borderColor: TOPBAR_BORDER,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
} satisfies Record<string, ViewStyle | TextStyle>;
