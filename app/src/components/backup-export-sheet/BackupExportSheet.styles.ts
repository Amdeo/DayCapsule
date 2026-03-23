import { StyleSheet } from 'react-native';

export const backupExportSheetStyles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
  },
  actionText: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '500',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 12,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 17,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#CFCFCF',
    borderRadius: 999,
    height: 5,
    marginBottom: 16,
    width: 40,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
});
