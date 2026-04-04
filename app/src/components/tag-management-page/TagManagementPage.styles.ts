import {
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const tagManagementPageStyles = {
  page: {
    flex: 1,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12,
  },
  resetText: {
    fontSize: 15,
    color: '#6A89CC',
    fontWeight: '500',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F3A4A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7A8797',
  },
  hint: {
    fontSize: 12,
    color: '#A3A3A3',
    marginBottom: 8,
  },
  tagList: {
    flex: 1,
  },
  tagListContent: {
    paddingBottom: 8,
  },
  tagRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#FFFFFF',
  },
  tagRowActive: {
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragHandle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagName: {
    fontSize: 15,
    color: '#4A4A4A',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#4A4A4A',
  },
  addInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#C0C0C0',
  },
  addButton: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: '#6A89CC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#A3A3A3',
  },
} satisfies Record<string, ViewStyle | TextStyle>;
