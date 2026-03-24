/**
 * PhotoGrid - adaptive photo grid
 * 1 photo: full-width fixed height; 2-3 photos: N-column; 4+: 3-column, max 8 cells + overflow
 */

import React from 'react';
import { Text, View } from 'react-native';
import { MediaInfo } from '@/src/types/entry';
import { GridCell, SinglePhoto, TwoPhotoCell } from './photo-grid/PhotoGridCells';
import { photoGridStyles as styles } from './photo-grid/PhotoGrid.styles';
import { PhotoImageRadiusStyle } from './photo-grid/photoGridTypes';
import { usePhotoGridController } from './photo-grid/usePhotoGridController';

interface PhotoGridProps {
  photos: MediaInfo[];
  maxPhotoHeight: number;
  photoImageRadius: PhotoImageRadiusStyle;
  onPhotoPress?: (index: number) => void;
}

export function PhotoGrid({ photos, maxPhotoHeight, photoImageRadius, onPhotoPress }: PhotoGridProps) {
  const {
    cellSize,
    displayPhotos,
    handleLayout,
    overflow,
    primaryPhoto,
    primaryPhotoIndex,
    primaryWidth,
    secondaryPhoto,
    secondaryPhotoIndex,
    secondaryWidth,
    shouldRenderSinglePhoto,
    shouldRenderTwoPhotoCollage,
  } = usePhotoGridController(photos, maxPhotoHeight);

  if (!photos || photos.length === 0) return null;

  if (shouldRenderSinglePhoto) {
    return (
      <SinglePhoto
        photo={photos[0]}
        maxPhotoHeight={maxPhotoHeight}
        photoImageRadius={photoImageRadius}
        onPress={() => onPhotoPress?.(0)}
      />
    );
  }

  if (shouldRenderTwoPhotoCollage && primaryPhoto && secondaryPhoto) {
    return (
      <View testID="photo-collage-root" style={styles.twoPhotoRow} onLayout={handleLayout}>
        <TwoPhotoCell
          testID="photo-primary-cell"
          imageTestID="photo-primary-image"
          missingTestID="photo-primary-missing"
          photo={primaryPhoto}
          width={primaryWidth}
          height={maxPhotoHeight}
          imageRadiusStyle={{
            ...photoImageRadius,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
          onPress={() => onPhotoPress?.(primaryPhotoIndex)}
        />
        <TwoPhotoCell
          testID="photo-secondary-cell"
          imageTestID="photo-secondary-image"
          missingTestID="photo-secondary-missing"
          photo={secondaryPhoto}
          width={secondaryWidth}
          height={maxPhotoHeight}
          imageRadiusStyle={{
            ...photoImageRadius,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
          onPress={() => onPhotoPress?.(secondaryPhotoIndex)}
        />
      </View>
    );
  }

  return (
    <View
      testID="photo-grid-root"
      style={styles.grid}
      onLayout={handleLayout}
    >
      <View
        testID="photo-grid"
        style={styles.grid}
      >
        {displayPhotos.map((photo, index) => (
          <GridCell
            key={index}
            testID={`photo-cell-${index}`}
            photo={photo}
            cellSize={cellSize}
            onPress={() => onPhotoPress?.(index)}
          />
        ))}
        {overflow > 0 && (
          <View
            testID="photo-overflow"
            style={[styles.overflowCell, { width: cellSize, height: cellSize }]}
          >
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
