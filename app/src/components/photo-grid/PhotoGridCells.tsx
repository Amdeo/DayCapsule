import React from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { MediaInfo } from '@/src/types/entry';
import { photoGridStyles as styles } from './PhotoGrid.styles';
import type { PhotoImageRadiusStyle } from './photoGridTypes';
import { usePhotoSource } from '@/src/hooks/usePhotoSource';

interface SinglePhotoProps {
  photo: MediaInfo;
  maxPhotoHeight: number;
  photoImageRadius: PhotoImageRadiusStyle;
  onPress: () => void;
}

interface GridCellProps {
  testID: string;
  photo: MediaInfo;
  cellSize: number;
  onPress: () => void;
}

interface TwoPhotoCellProps {
  testID: string;
  imageTestID: string;
  missingTestID: string;
  photo: MediaInfo;
  width: number;
  height: number;
  imageRadiusStyle: PhotoImageRadiusStyle;
  onPress: () => void;
}

export function SinglePhoto({
  photo,
  maxPhotoHeight,
  photoImageRadius,
  onPress,
}: SinglePhotoProps) {
  const { sourceUri, missing, pendingHydration, handleError } = usePhotoSource(photo, 'thumbnail');

  if (pendingHydration) {
    return (
      <View
        testID="photo-loading-0"
        style={[styles.singleLoading, photoImageRadius, { height: maxPhotoHeight }]}
      >
        <ActivityIndicator size="small" color="#A68D68" />
      </View>
    );
  }

  if (missing) {
    return (
      <View
        testID="photo-image-0"
        style={[styles.singleMissing, photoImageRadius, { height: maxPhotoHeight }]}
      />
    );
  }

  return (
    <Pressable onPress={onPress}>
      <Image
        testID="photo-image-0"
        source={{ uri: sourceUri }}
        style={[
          { width: '100%', height: maxPhotoHeight, backgroundColor: '#ECE7E0' },
          photoImageRadius,
        ]}
        resizeMode="cover"
        onError={handleError}
      />
    </Pressable>
  );
}

export function GridCell({ testID, photo, cellSize, onPress }: GridCellProps) {
  const { sourceUri, missing, pendingHydration, handleError } = usePhotoSource(photo, 'thumbnail');

  if (pendingHydration) {
    return (
      <View
        testID={`${testID}-loading`}
        style={[styles.gridCellLoading, { width: cellSize, height: cellSize }]}
      >
        <ActivityIndicator size="small" color="#A68D68" />
      </View>
    );
  }

  if (missing) {
    return (
      <View
        testID={testID}
        style={[styles.gridCellMissing, { width: cellSize, height: cellSize }]}
      />
    );
  }

  return (
    <Pressable testID={testID} onPress={onPress}>
      <Image
        source={{ uri: sourceUri }}
        style={{ width: cellSize, height: cellSize }}
        resizeMode="cover"
        onError={handleError}
      />
    </Pressable>
  );
}

export function TwoPhotoCell({
  testID,
  imageTestID,
  missingTestID,
  photo,
  width,
  height,
  imageRadiusStyle,
  onPress,
}: TwoPhotoCellProps) {
  const { sourceUri, missing, pendingHydration, handleError } = usePhotoSource(photo, 'thumbnail');
  const cellStyle = [{ width, height, backgroundColor: '#ECE7E0' }, imageRadiusStyle];

  if (pendingHydration) {
    return (
      <View testID={`${testID}-loading`}>
        <View style={[styles.twoPhotoLoading, ...cellStyle]}>
          <ActivityIndicator size="small" color="#A68D68" />
        </View>
      </View>
    );
  }

  if (missing) {
    return (
      <View testID={testID}>
        <View
          testID={missingTestID}
          style={[styles.twoPhotoMissing, ...cellStyle]}
        />
      </View>
    );
  }

  return (
    <Pressable testID={testID} onPress={onPress}>
      <Image
        testID={imageTestID}
        source={{ uri: sourceUri }}
        style={cellStyle}
        resizeMode="cover"
        onError={handleError}
      />
    </Pressable>
  );
}
