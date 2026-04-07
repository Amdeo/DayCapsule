import { StyleSheet } from 'react-native';
export const calendarViewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#A3A3A3',
    paddingVertical: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: '#6A89CC',
  },
  dayCellToday: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#6A89CC',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#6A89CC',
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  sectionDivider: {
    height: 1,
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: '#E7DED3',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  deselectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  deselectText: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  dayGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#968878',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#A3A3A3',
    textAlign: 'center',
    marginTop: 24,
  },
  timelineGroup: {
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 2,
  },
});
