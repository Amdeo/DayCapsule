import { StyleSheet } from 'react-native';

export const filterBarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A3A3A3',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#F0F4FF',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  filterLabelActive: {
    color: '#4A4A4A',
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A3A3A3',
  },
  filterCountActive: {
    color: '#6A89CC',
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  dateButtonActive: {
    backgroundColor: '#6A89CC',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  dateLabelActive: {
    color: '#FFFFFF',
  },
  resetSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    gap: 6,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    gap: 6,
  },
  tagButtonActive: {
    backgroundColor: '#6A89CC',
  },
  tagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  tagButtonTextActive: {
    color: '#FFFFFF',
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A89CC',
  },
  removeTagButton: {
    padding: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContentBody: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A89CC',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tagList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A3A3A3',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#D1D1D1',
    marginTop: 8,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  tagChipSelected: {
    backgroundColor: '#6A89CC',
  },
  tagChipCheckmark: {
    marginRight: 4,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  tagChipTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  doneButton: {
    backgroundColor: '#6A89CC',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
