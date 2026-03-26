import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, TouchableOpacity, View } from 'react-native';
import type { MediaInfo } from '@/src/types/entry';
import { PhotoService } from '@/src/services/photoService';
import { photoGridStyles as styles } from './PhotoGrid.styles';
import type { PhotoImageRadiusStyle } from './photoGridTypes';
import { isPhotoMediaPendingHydration } from '@/src/utils/mediaAvailability';

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

function usePhotoSource(
  photo: MediaInfo,
  kind: 'thumbnail' | 'full' = 'thumbnail'
) {
  const [sourceUri, setSourceUri] = useState(() =>
    PhotoService.getPreferredPhotoUri(photo, kind)
  );
  const [missing, setMissing] = useState(() => sourceUri.length === 0);
  const pendingHydration = isPhotoMediaPendingHydration(photo);

  useEffect(() => {
    const nextSourceUri = PhotoService.getPreferredPhotoUri(photo, kind);
    setSourceUri(nextSourceUri);
    setMissing(nextSourceUri.length === 0);
  }, [kind, photo.remoteThumbnail, photo.remoteUri, photo.thumbnail, photo.uri]);

  const handleError = () => {
    const fallbackUri = PhotoService.getFallbackPhotoUri(photo, sourceUri, kind);
    if (fallbackUri && fallbackUri !== sourceUri) {
      setSourceUri(fallbackUri);
      return;
    }

    setMissing(true);
  };

  return {
    sourceUri,
    missing,
    pendingHydration,
    handleError,
  };
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
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
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
    </TouchableOpacity>
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
    <TouchableOpacity testID={testID} activeOpacity={0.9} onPress={onPress}>
      <Image
        source={{ uri: sourceUri }}
        style={{ width: cellSize, height: cellSize }}
        resizeMode="cover"
        onError={handleError}
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
    <TouchableOpacity testID={testID} activeOpacity={0.9} onPress={onPress}>
      <Image
        testID={imageTestID}
        source={{ uri: sourceUri }}
        style={cellStyle}
        resizeMode="cover"
        onError={handleError}
      />
    </TouchableOpacity>
  );
}
