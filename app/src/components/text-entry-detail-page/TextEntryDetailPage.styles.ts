import {
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const textEntryDetailPageStyles = {
  contentContainer: {
    paddingTop: 20,
    gap: 16,
  },
  topMetaSection: {
    gap: 4,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  // Read mode — content card
  heroBlock: {
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  contentText: {
    fontSize: 17,
    lineHeight: 30,
    color: '#2F241E',
    letterSpacing: 0.2,
  },
  selectableContentInput: {
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },
  // Edit mode — content card (matches TextEditor's contentCard)
  editContentCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  editContentInput: {
    padding: 16,
    fontSize: 16,
    color: '#2F241E',
    minHeight: 200,
    lineHeight: 26,
  },
  // Shared meta
  metaSection: {
    gap: 4,
    paddingBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#B0A498',
    letterSpacing: 0.3,
  },
  // Read mode — tags
  tagsSection: {
    gap: 8,
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
  // Bottom bar (fixed, outside ScrollView)
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
    backgroundColor: '#FAF8F5',
  },
  editButton: {
    backgroundColor: '#6A89CC',
    borderRadius: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editBarRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EDEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6F6257',
  },
  saveButton: {
    flex: 2,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6A89CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: '#A3A3A3',
  },
  // Header elements (for edit mode)
  headerCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8A7C70',
  },
  headerSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A89CC',
  },
  headerSaveTextDisabled: {
    color: '#C0B8B0',
  },
} satisfies Record<string, ViewStyle | TextStyle>;
