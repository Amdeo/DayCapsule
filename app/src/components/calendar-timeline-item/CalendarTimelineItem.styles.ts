import { StyleSheet } from 'react-native';
import {
  TIMELINE_CONTENT_PADDING_LEFT,
  TIMELINE_DOT_LEFT,
} from '@/src/components/timelineGeometry';

export const calendarTimelineItemStyles = StyleSheet.create({
  cardWrap: {
    flex: 1,
  },
  container: {
    paddingLeft: TIMELINE_CONTENT_PADDING_LEFT,
    paddingRight: 24,
    position: 'relative',
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dotOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2,
    height: 16,
    justifyContent: 'center',
    left: TIMELINE_DOT_LEFT,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    top: 1,
    width: 16,
    zIndex: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeWrap: {
    marginBottom: 8,
  },
});
