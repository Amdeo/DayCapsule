/**
 * PhotoGrid - adaptive photo grid
 * 1 photo: full-width fixed height; 2-3 photos: N-column; 4+: 3-column, max 8 cells + overflow
 */

import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MediaInfo } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';

const GAP = 3;
const MAX_DISPLAY = 8;

type PhotoImageRadiusStyle = {
  borderRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
};

interface PhotoGridProps {
  photos: MediaInfo[];
  maxPhotoHeight: number;
  photoImageRadius: PhotoImageRadiusStyle;
  onPhotoPress?: (index: number) => void;
}

export function PhotoGrid({ photos, maxPhotoHeight, photoImageRadius, onPhotoPress }: PhotoGridProps) {
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  if (!photos || photos.length === 0) return null;

  // Single photo: full-width, no grid wrapper
  if (photos.length === 1) {
    return (
      <SinglePhoto
        photo={photos[0]}
        maxPhotoHeight={maxPhotoHeight}
        photoImageRadius={photoImageRadius}
        onPress={() => onPhotoPress?.(0)}
      />
    );
  }

  // Multi-photo grid
  const numCols = photos.length <= 3 ? photos.length : 3;
  const cellSize = containerWidth > 0
    ? (containerWidth - GAP * (numCols - 1)) / numCols
    : 0;

  const overflow = photos.length > MAX_DISPLAY ? photos.length - (MAX_DISPLAY - 1) : 0;
  const displayPhotos = overflow > 0 ? photos.slice(0, MAX_DISPLAY - 1) : photos;

  return (
    <View testID="photo-grid-root">
      <View
        className="flex-row flex-wrap gap-[3px]"
        testID="photo-grid"
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
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
            className="items-center justify-center rounded bg-black/45"
            style={{ width: cellSize, height: cellSize }}
          >
            <Text className="text-[20px] font-bold text-white">+{overflow}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface SinglePhotoProps {
  photo: MediaInfo;
  maxPhotoHeight: number;
  photoImageRadius: PhotoImageRadiusStyle;
  onPress: () => void;
}

function SinglePhoto({ photo, maxPhotoHeight, photoImageRadius, onPress }: SinglePhotoProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View
        testID="photo-image-0"
        className="w-full bg-[#ECE7E0]"
        style={[photoImageRadius, { height: maxPhotoHeight }]}
      />
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Image
        testID="photo-image-0"
        source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
        style={[{ width: '100%', height: maxPhotoHeight, backgroundColor: '#ECE7E0' }, photoImageRadius]}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    </TouchableOpacity>
  );
}

interface GridCellProps {
  testID: string;
  photo: MediaInfo;
  cellSize: number;
  onPress: () => void;
}

function GridCell({ testID, photo, cellSize, onPress }: GridCellProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View
        testID={testID}
        className="rounded bg-[#ECE7E0]"
        style={{ width: cellSize, height: cellSize }}
      />
    );
  }

  return (
    <TouchableOpacity testID={testID} activeOpacity={0.9} onPress={onPress}>
      <Image
        source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
        style={{ width: cellSize, height: cellSize }}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    </TouchableOpacity>
  );
}
