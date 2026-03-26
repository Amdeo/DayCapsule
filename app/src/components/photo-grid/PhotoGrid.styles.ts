import { StyleSheet } from 'react-native';
import { PHOTO_GRID_GAP } from './photoGridConfig';

export const photoGridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
  },
  twoPhotoRow: {
    flexDirection: 'row',
    gap: PHOTO_GRID_GAP,
    width: '100%',
  },
  overflowCell: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  singleMissing: {
    width: '100%',
    backgroundColor: '#ECE7E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleLoading: {
    width: '100%',
    backgroundColor: '#ECE7E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellMissing: {
    backgroundColor: '#ECE7E0',
    borderRadius: 4,
  },
  gridCellLoading: {
    backgroundColor: '#ECE7E0',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoPhotoMissing: {
    backgroundColor: '#ECE7E0',
  },
  twoPhotoLoading: {
    backgroundColor: '#ECE7E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
