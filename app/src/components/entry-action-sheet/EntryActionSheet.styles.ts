import { StyleSheet } from 'react-native';

export const entryActionSheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
  panel: {
    paddingHorizontal: 12,
    paddingTop: 0,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 999,
    height: 6,
    marginBottom: 16,
    marginTop: 12,
    width: 40,
  },
  optionGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 16,
  },
  optionText: {
    color: '#1A1A1A',
    fontSize: 17,
    marginLeft: 12,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 17,
    marginLeft: 12,
  },
  divider: {
    backgroundColor: '#F0F0F0',
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 17,
    fontWeight: '500',
  },
  confirmGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  confirmTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmSubtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  confirmDeleteButton: {
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    marginTop: 16,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmCancelButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
});
