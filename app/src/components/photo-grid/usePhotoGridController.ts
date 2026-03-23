import { useState } from 'react';
import { Dimensions, LayoutChangeEvent } from 'react-native';
import type { MediaInfo } from '@/src/types/entry';
import { PHOTO_GRID_GAP, PHOTO_GRID_MAX_DISPLAY } from './photoGridConfig';

export function usePhotoGridController(photos: MediaInfo[]) {
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  const shouldRenderSinglePhoto = photos.length === 1;
  const numCols = photos.length === 0 ? 0 : photos.length <= 3 ? photos.length : 3;
  const cellSize =
    containerWidth > 0 && numCols > 0
      ? (containerWidth - PHOTO_GRID_GAP * (numCols - 1)) / numCols
      : 0;

  const overflow =
    photos.length > PHOTO_GRID_MAX_DISPLAY
      ? photos.length - (PHOTO_GRID_MAX_DISPLAY - 1)
      : 0;
  const displayPhotos =
    overflow > 0
      ? photos.slice(0, PHOTO_GRID_MAX_DISPLAY - 1)
      : photos;

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return {
    cellSize,
    displayPhotos,
    handleLayout,
    overflow,
    shouldRenderSinglePhoto,
  };
}
