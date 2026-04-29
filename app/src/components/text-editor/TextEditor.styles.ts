import {
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const textEditorStyles = {
  editor: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: 'column',
  },
  // Body scroll
  scrollView: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  // Content input card
  contentCard: {
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
  contentInput: {
    padding: 16,
    fontSize: 16,
    color: '#2F241E',
    minHeight: 200,
    lineHeight: 26,
  },
  hiddenInput: {
    height: 0,
  },
  // Tag toolbar (collapsed)
  tagToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  tagToolbarScrollContent: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  tagToolbarChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E0DAFA',
    borderRadius: 14,
  },
  tagToolbarChipSelected: {
    backgroundColor: '#A491D3',
    borderColor: '#A491D3',
  },
  tagToolbarChipText: {
    fontSize: 12,
    color: '#6A5ACD',
  },
  tagToolbarChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  tagToolbarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EDE9F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8D0F0',
  },
  tagToolbarToggleText: {
    fontSize: 12,
    color: '#8B7AC8',
    fontWeight: '600',
  },
  // Suggestions row (shown in collapsed toolbar when suggestions exist)
  tagSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 6,
  },
  tagSuggestionLabel: {
    fontSize: 11,
    color: '#9E9084',
  },
  tagSuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#C7D7F5',
    borderRadius: 10,
    gap: 3,
  },
  tagSuggestionChipText: {
    fontSize: 12,
    color: '#6A89CC',
  },
  // Tag panel (expanded)
  tagPanel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tagPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tagPanelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPanelHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F6257',
  },
  tagPanelSectionLabel: {
    fontSize: 11,
    color: '#9E9084',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagPanelSelectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagPanelSelectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#A491D3',
    borderRadius: 16,
  },
  tagPanelSelectedChipText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  tagPanelDivider: {
    height: 1,
    backgroundColor: '#E8E4DF',
    marginBottom: 10,
  },
  tagPanelPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagPanelPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E0DAFA',
    borderRadius: 16,
  },
  tagPanelPresetChipSelected: {
    backgroundColor: '#A491D3',
    borderColor: '#A491D3',
  },
  tagPanelPresetChipText: {
    fontSize: 13,
    color: '#6A5ACD',
  },
  tagPanelPresetChipTextSelected: {
    color: '#FFFFFF',
  },
  tagPanelCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tagPanelCustomInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0DAFA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#3F332A',
  },
  tagPanelAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A491D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPanelSuggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tagPanelSuggestionLabel: {
    fontSize: 11,
    color: '#9E9084',
  },
  tagPanelSuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#C7D7F5',
    borderRadius: 10,
    gap: 3,
  },
  tagPanelSuggestionChipText: {
    fontSize: 12,
    color: '#6A89CC',
  },
  tagPanelCollapseRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  tagPanelCollapseText: {
    fontSize: 12,
    color: '#A491D3',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  cancelButton: {
    backgroundColor: '#F0EDEA',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6F6257',
  },
  saveButton: {
    backgroundColor: '#6A89CC',
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
} satisfies Record<string, ViewStyle | TextStyle>;
