import { StyleSheet } from 'react-native';

export const imageViewerStyles = StyleSheet.create({
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {},
  actionSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
    elevation: 100,
  },
  actionSheetOverlayDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  actionSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 8,
  },
  actionSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  actionSheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionSheetItemText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  actionSheetGap: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  actionSheetCancelText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
