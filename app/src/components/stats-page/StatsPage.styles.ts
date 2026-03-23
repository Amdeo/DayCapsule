import { StyleSheet } from 'react-native';

export const statsPageStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A3A3A3',
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  statLabel: {
    fontSize: 12,
    color: '#A3A3A3',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    color: '#737373',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
    paddingVertical: 16,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    height: 88,
    justifyContent: 'flex-end',
  },
  barCount: {
    fontSize: 11,
    color: '#6A89CC',
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: '#E8ECF5',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#6A89CC',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: '#A3A3A3',
    marginTop: 6,
  },
  bottomPadding: {
    height: 40,
  },
});
