import { useState } from 'react';
import { Dimensions, LayoutChangeEvent } from 'react-native';
import type { MediaInfo } from '@/src/types/entry';
import {
  PHOTO_GRID_GAP,
  PHOTO_GRID_MAX_DISPLAY,
  PHOTO_GRID_TWO_PHOTO_PRIMARY_RATIO,
  PHOTO_GRID_TWO_PHOTO_SWAP_THRESHOLD,
} from './photoGridConfig';

function getTwoPhotoDisplayOrder(
  photos: MediaInfo[],
  primaryTargetAspect: number
): [number, number] {
  if (photos.length !== 2) {
    return [0, 1];
  }

  const firstAspect = photos[0]?.metadata?.aspectRatio;
  const secondAspect = photos[1]?.metadata?.aspectRatio;

  if (!firstAspect || !secondAspect || primaryTargetAspect <= 0) {
    return [0, 1];
  }

  const firstLoss = Math.abs(firstAspect - primaryTargetAspect);
  const secondLoss = Math.abs(secondAspect - primaryTargetAspect);

  if (firstLoss - secondLoss > PHOTO_GRID_TWO_PHOTO_SWAP_THRESHOLD) {
    return [1, 0];
  }

  return [0, 1];
}

export function usePhotoGridController(photos: MediaInfo[], maxPhotoHeight: number) {
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  const shouldRenderSinglePhoto = photos.length === 1;
  const shouldRenderTwoPhotoCollage = photos.length === 2;
  const numCols = photos.length === 0 ? 0 : photos.length <= 3 ? photos.length : 3;
  const cellSize =
    containerWidth > 0 && numCols > 0
      ? (containerWidth - PHOTO_GRID_GAP * (numCols - 1)) / numCols
      : 0;
  const primaryWidth =
    containerWidth > 0
      ? (containerWidth - PHOTO_GRID_GAP) * PHOTO_GRID_TWO_PHOTO_PRIMARY_RATIO
      : 0;
  const secondaryWidth =
    containerWidth > 0 ? containerWidth - PHOTO_GRID_GAP - primaryWidth : 0;

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

  const twoPhotoDisplayOrder = shouldRenderTwoPhotoCollage
    ? getTwoPhotoDisplayOrder(photos, primaryWidth / maxPhotoHeight)
    : [0, 1];
  const primaryPhotoIndex = twoPhotoDisplayOrder[0] ?? 0;
  const secondaryPhotoIndex = twoPhotoDisplayOrder[1] ?? 1;

  return {
    cellSize,
    displayPhotos,
    handleLayout,
    overflow,
    primaryPhoto: photos[primaryPhotoIndex],
    primaryPhotoIndex,
    primaryWidth,
    secondaryPhoto: photos[secondaryPhotoIndex],
    secondaryPhotoIndex,
    secondaryWidth,
    shouldRenderSinglePhoto,
    shouldRenderTwoPhotoCollage,
  };
}
