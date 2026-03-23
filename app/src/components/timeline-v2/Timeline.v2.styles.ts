import { StyleSheet } from 'react-native';

export const viewModeToggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6A89CC',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A3A3A3',
  },
  labelActive: {
    color: '#6A89CC',
    fontWeight: '700',
  },
});

export const filterBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE5F8',
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D7F5',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A89CC',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D7F5',
    maxWidth: 140,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A6FA5',
    flexShrink: 1,
  },
  clearAll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
