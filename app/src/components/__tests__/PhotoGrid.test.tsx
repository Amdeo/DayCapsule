jest.mock('@/src/services/photoService', () => {
  const PhotoService = {
    resolvePhotoUri: (uri: string) => uri,
    getPreferredPhotoUri: (media: any, kind: 'thumbnail' | 'full') => {
      const candidate = kind === 'thumbnail'
        ? (media.thumbnail || media.remoteThumbnail || media.uri || media.remoteUri || '')
        : (media.remoteUri || media.uri || '');
      return candidate ? PhotoService.resolvePhotoUri(candidate) : '';
    },
    getFallbackPhotoUri: (media: any, failedUri: string, kind: 'thumbnail' | 'full') => {
      const candidates = kind === 'thumbnail'
        ? [media.thumbnail, media.remoteThumbnail, media.uri, media.remoteUri]
        : [media.remoteUri, media.uri];
      const index = candidates.findIndex((candidate) => candidate === failedUri);
      const candidate = index >= 0 ? (candidates[index + 1] ?? null) : (candidates[0] ?? null);
      return candidate ? PhotoService.resolvePhotoUri(candidate) : null;
    },
  };

  return { PhotoService };
});
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: any) => <Text>{name}</Text> };
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { PhotoGrid } from '../PhotoGrid';
import { MediaInfo } from '@/src/types/entry';

const makePhoto = (i: number, aspectRatio?: number): MediaInfo => ({
  uri: `file://photo${i}.jpg`,
  mimeType: 'image/jpeg',
  size: 1000,
  metadata:
    aspectRatio !== undefined
      ? {
          aspectRatio,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        }
      : undefined,
});

const makeRemoteFallbackPhoto = (): MediaInfo => ({
  uri: 'file:///stale/photo.jpg',
  thumbnail: 'file:///stale/thumb.jpg',
  remoteUri: 'http://101.43.120.134:8081/api/media/photo-1',
  remoteThumbnail: 'http://101.43.120.134:8081/api/media/photo-1-thumb',
  mimeType: 'image/jpeg',
  size: 1000,
});

const radius = { borderRadius: 10 };

describe('PhotoGrid', () => {
  it('1 photo: renders photo-image-0, no photo-grid wrapper', () => {
    render(
      <PhotoGrid photos={[makePhoto(0)]} maxPhotoHeight={280} photoImageRadius={radius} />
    );
    expect(screen.getByTestId('photo-image-0')).toBeTruthy();
    expect(screen.queryByTestId('photo-grid')).toBeNull();
  });

  it('2 photos: renders two-photo collage instead of square grid', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 1), makePhoto(1, 1.8)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-collage-root')).toBeTruthy();
    expect(screen.getByTestId('photo-primary-cell')).toBeTruthy();
    expect(screen.getByTestId('photo-secondary-cell')).toBeTruthy();
    expect(screen.queryByTestId('photo-grid')).toBeNull();
  });

  it('keeps the first photo as primary by default', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 1), makePhoto(1, 1.1)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-primary-image').props.source).toEqual({
      uri: 'file://photo0.jpg',
    });
    expect(screen.getByTestId('photo-secondary-image').props.source).toEqual({
      uri: 'file://photo1.jpg',
    });
  });

  it('promotes the second photo to primary when it fits the primary slot much better', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 2.8), makePhoto(1, 0.8)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-primary-image').props.source).toEqual({
      uri: 'file://photo1.jpg',
    });
    expect(screen.getByTestId('photo-secondary-image').props.source).toEqual({
      uri: 'file://photo0.jpg',
    });
  });

  it('does not reorder two photos when aspect ratio metadata is missing', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0), makePhoto(1, 0.8)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-primary-image').props.source).toEqual({
      uri: 'file://photo0.jpg',
    });
  });

  it('maps taps back to original indexes after swapping display order', () => {
    const onPhotoPress = jest.fn();

    render(
      <PhotoGrid
        photos={[makePhoto(0, 2.8), makePhoto(1, 0.8)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
        onPhotoPress={onPhotoPress}
      />
    );

    fireEvent.press(screen.getByTestId('photo-primary-cell'));
    fireEvent.press(screen.getByTestId('photo-secondary-cell'));

    expect(onPhotoPress).toHaveBeenNthCalledWith(1, 1);
    expect(onPhotoPress).toHaveBeenNthCalledWith(2, 0);
  });

  it('keeps the primary slot when the primary image fails to load', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    fireEvent(screen.getByTestId('photo-primary-image'), 'error');

    expect(screen.getByTestId('photo-primary-missing')).toBeTruthy();
    expect(screen.getByTestId('photo-secondary-cell')).toBeTruthy();
  });

  it('falls back to remote thumbnail when the local thumbnail fails', () => {
    render(
      <PhotoGrid
        photos={[makeRemoteFallbackPhoto()]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-image-0').props.source).toEqual({
      uri: 'file:///stale/thumb.jpg',
    });

    fireEvent(screen.getByTestId('photo-image-0'), 'error');

    expect(screen.getByTestId('photo-image-0').props.source).toEqual({
      uri: 'http://101.43.120.134:8081/api/media/photo-1-thumb',
    });
  });

  it('keeps the secondary slot when the secondary image fails to load', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    fireEvent(screen.getByTestId('photo-secondary-image'), 'error');

    expect(screen.getByTestId('photo-secondary-missing')).toBeTruthy();
    expect(screen.getByTestId('photo-primary-cell')).toBeTruthy();
  });

  it('3 photos: renders 3 cells', () => {
    const photos = [makePhoto(0), makePhoto(1), makePhoto(2)];
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    expect(screen.getByTestId('photo-cell-2')).toBeTruthy();
  });

  it('4 photos: renders 4 cells, no overflow', () => {
    const photos = Array.from({ length: 4 }, (_, i) => makePhoto(i));
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    expect(screen.getByTestId('photo-cell-3')).toBeTruthy();
    expect(screen.queryByTestId('photo-overflow')).toBeNull();
  });

  it('9 photos: shows 7 normal cells + overflow cell displaying +2', () => {
    const photos = Array.from({ length: 9 }, (_, i) => makePhoto(i));
    render(<PhotoGrid photos={photos} maxPhotoHeight={280} photoImageRadius={radius} />);
    expect(screen.getByTestId('photo-cell-6')).toBeTruthy();
    expect(screen.queryByTestId('photo-cell-7')).toBeNull();
    expect(screen.getByTestId('photo-overflow')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('uses window width to estimate two-photo collage widths on first render', () => {
    const windowWidth = Dimensions.get('window').width;
    render(
      <PhotoGrid
        photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    const expectedPrimaryWidth = (windowWidth - 3) * 0.64;
    expect(screen.getByTestId('photo-primary-image').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: expectedPrimaryWidth,
          height: 280,
        }),
      ])
    );
  });

  it('stretches the two-photo collage root to the available card width', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 1), makePhoto(1, 1.2)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-collage-root').props.style).toEqual(
      expect.objectContaining({
        width: '100%',
      })
    );
  });
});
