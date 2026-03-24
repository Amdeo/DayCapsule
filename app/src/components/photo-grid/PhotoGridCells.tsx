import React, { useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import type { MediaInfo } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';
import { photoGridStyles as styles } from './PhotoGrid.styles';
import type { PhotoImageRadiusStyle } from './photoGridTypes';

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
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View
        testID="photo-image-0"
        style={[styles.singleMissing, photoImageRadius, { height: maxPhotoHeight }]}
      />
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Image
        testID="photo-image-0"
        source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
        style={[
          { width: '100%', height: maxPhotoHeight, backgroundColor: '#ECE7E0' },
          photoImageRadius,
        ]}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    </TouchableOpacity>
  );
}

export function GridCell({ testID, photo, cellSize, onPress }: GridCellProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View
        testID={testID}
        style={[styles.gridCellMissing, { width: cellSize, height: cellSize }]}
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
  const [error, setError] = useState(false);
  const cellStyle = [{ width, height, backgroundColor: '#ECE7E0' }, imageRadiusStyle];

  if (error) {
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
    <TouchableOpacity testID={testID} activeOpacity={0.9} onPress={onPress}>
      <Image
        testID={imageTestID}
        source={{ uri: PhotoService.resolvePhotoUri(photo.thumbnail || photo.uri) }}
        style={cellStyle}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    </TouchableOpacity>
  );
}
