jest.mock('@/src/services/photoService', () => ({
  PhotoService: { resolvePhotoUri: (uri: string) => uri },
}));
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
import { render, screen } from '@testing-library/react-native';
import { PhotoGrid } from '../PhotoGrid';
import { MediaInfo } from '@/src/types/entry';

const makePhoto = (i: number): MediaInfo => ({
  uri: `file://photo${i}.jpg`,
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

  it('2 photos: renders photo-grid with 2 cells', () => {
    render(
      <PhotoGrid photos={[makePhoto(0), makePhoto(1)]} maxPhotoHeight={280} photoImageRadius={radius} />
    );
    expect(screen.getByTestId('photo-grid')).toBeTruthy();
    expect(screen.getByTestId('photo-cell-0')).toBeTruthy();
    expect(screen.getByTestId('photo-cell-1')).toBeTruthy();
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
});
