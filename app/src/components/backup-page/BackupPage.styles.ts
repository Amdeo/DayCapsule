export const backupPageStyles = {
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#A3A3A3',
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  rowNoDivider: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    color: '#737373',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#4A4A4A',
  },
  historyMeta: {
    flex: 1,
  },
  actionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#A3A3A3',
    lineHeight: 16,
  },
  actionButton: {
    backgroundColor: '#6A89CC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#D1D1D1',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
};
