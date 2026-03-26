import { StyleSheet } from 'react-native';

export const SETTINGS_SWITCH_TRACK_COLORS = {
  false: '#D1D1D1',
  true: '#6A89CC',
} as const;

export const settingsPageStyles = StyleSheet.create({
  overviewCard: {
    backgroundColor: '#EEF8FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7EEF2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A3A3A3',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  storageInfo: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
  },
  storageCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A8A',
    marginBottom: 4,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  storageLabel: {
    fontSize: 15,
    color: '#737373',
  },
  storageValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  backendCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  backendInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#4A4A4A',
  },
  backendActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backendSecondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#77C9D4',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backendSecondaryButtonText: {
    color: '#4A9DAA',
    fontSize: 14,
    fontWeight: '600',
  },
  backendPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#77C9D4',
  },
  backendPrimaryButtonDisabled: {
    backgroundColor: '#CFE8EC',
  },
  backendPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  backendStatusText: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  backendStatusSuccess: {
    color: '#2F855A',
  },
  backendStatusError: {
    color: '#D64545',
  },
  backendHistorySection: {
    gap: 8,
  },
  backendHistoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
  },
  backendHistoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  backendHistoryChip: {
    borderRadius: 999,
    backgroundColor: '#E8F8FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backendHistoryChipText: {
    color: '#4A9DAA',
    fontSize: 12,
    fontWeight: '600',
  },
});

export const segmentedSelectorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#6A89CC',
    fontWeight: '600',
  },
});

export const photoHeightSelectorStyles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8FA',
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#A3A3A3',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#77C9D4',
    backgroundColor: '#EEF8FA',
  },
  previewBlock: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#D4EFF3',
  },
  previewBlockSelected: {
    backgroundColor: '#77C9D4',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#737373',
  },
  optionLabelSelected: {
    color: '#4A9DAA',
    fontWeight: '600',
  },
  optionValue: {
    fontSize: 11,
    color: '#B0B0B0',
  },
  optionValueSelected: {
    color: '#77C9D4',
  },
});
