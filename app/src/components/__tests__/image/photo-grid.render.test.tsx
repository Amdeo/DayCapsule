import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PhotoGrid } from '../../PhotoGrid';
import { MediaInfo } from '@/src/types/entry';

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

const radius = { borderRadius: 10 };

describe('PhotoGrid render matrix', () => {
  it('renders a single photo without the grid wrapper', () => {
    render(
      <PhotoGrid photos={[makePhoto(0)]} maxPhotoHeight={280} photoImageRadius={radius} />
    );

    expect(screen.getByTestId('photo-image-0')).toBeTruthy();
    expect(screen.queryByTestId('photo-grid')).toBeNull();
  });

  it('renders a two-photo collage and promotes the better primary fit for tall images', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0, 2.8), makePhoto(1, 0.8)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-collage-root')).toBeTruthy();
    expect(screen.getByTestId('photo-primary-image').props.source).toEqual(
      expect.arrayContaining([expect.objectContaining({ uri: 'file://photo1.jpg' })])
    );
    expect(screen.getByTestId('photo-secondary-image').props.source).toEqual(
      expect.arrayContaining([expect.objectContaining({ uri: 'file://photo0.jpg' })])
    );
  });

  it('renders a multi-photo grid for three photos', () => {
    render(
      <PhotoGrid
        photos={[makePhoto(0), makePhoto(1), makePhoto(2)]}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-grid-root')).toBeTruthy();
    expect(screen.getByTestId('photo-cell-2')).toBeTruthy();
    expect(screen.queryByTestId('photo-overflow')).toBeNull();
  });

  it('renders an overflow cell for large photo collections', () => {
    render(
      <PhotoGrid
        photos={Array.from({ length: 9 }, (_, i) => makePhoto(i))}
        maxPhotoHeight={280}
        photoImageRadius={radius}
      />
    );

    expect(screen.getByTestId('photo-overflow')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
