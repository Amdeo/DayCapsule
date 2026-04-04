export const settingsProfileCardStyles = {
  container: {
    backgroundColor: '#EEF8FA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D7EEF2',
    marginTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6A89CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  email: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDotActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  syncLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unauthStatsRow: {
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  unauthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  unauthText: {
    flex: 1,
  },
  unauthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  unauthSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  loginButton: {
    backgroundColor: '#6A89CC',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
} as const;
