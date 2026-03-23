import { StyleSheet } from 'react-native';

export const textEntryDetailPageStyles = StyleSheet.create({
  contentContainer: {
    paddingTop: 24,
    gap: 24,
  },
  editButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6A89CC',
  },
  heroBlock: {
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  contentText: {
    fontSize: 18,
    lineHeight: 32,
    color: '#2F241E',
    letterSpacing: 0.2,
  },
  metaSection: {
    gap: 18,
    paddingBottom: 12,
  },
  metaRow: {
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#9A8A7D',
  },
  metaValue: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A4A4A',
  },
  tagsSection: {
    gap: 10,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F2EA',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A6758',
  },
});
