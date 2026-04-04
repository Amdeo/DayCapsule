import {
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const SETTINGS_SWITCH_TRACK_COLORS = {
  false: '#D1D1D1',
  true: '#6A89CC',
} as const;

export const settingsPageStyles = {
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  groupDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  backendCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  backendInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#374151',
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
  advancedSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  advancedSectionEmbeddedCard: {
    marginBottom: 12,
  },
  advancedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  advancedSectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  advancedSectionHeaderText: {
    flex: 1,
  },
  advancedSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  advancedSectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  advancedSectionArrowExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  advancedSectionContent: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
} satisfies Record<string, ViewStyle | TextStyle>;

export const segmentedSelectorStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
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
} satisfies Record<string, ViewStyle | TextStyle>;

export const photoHeightSelectorStyles = {
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8FA',
    borderRadius: 10,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
} satisfies Record<string, ViewStyle | TextStyle>;
