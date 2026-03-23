import { StyleSheet } from 'react-native';

export const tagsPageStyles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyHint: {
    color: '#D1D1D1',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#A3A3A3',
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    color: '#A3A3A3',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  tagCount: {
    color: '#A3A3A3',
    fontSize: 14,
  },
  tagDot: {
    backgroundColor: '#A491D3',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  tagLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  tagName: {
    color: '#4A4A4A',
    fontSize: 16,
    fontWeight: '500',
  },
  tagRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tagRow: {
    borderBottomColor: '#F0F0F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
});
