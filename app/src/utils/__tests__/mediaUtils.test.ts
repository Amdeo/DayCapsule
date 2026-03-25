import { normalizeCloudMediaItem } from '../mediaUtils';
import type { MediaInfo } from '@/src/types/entry';

const base: MediaInfo = {
  uri: '',
  mimeType: 'image/jpeg',
  size: 1000,
};

describe('normalizeCloudMediaItem', () => {
  it('replaces stale file:// uri with remoteUri', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'file:///old-device/media/photos/original/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('replaces stale absolute path uri with remoteUri', () => {
    const item: MediaInfo = {
      ...base,
      uri: '/var/mobile/Containers/Data/Application/OLD/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('keeps uri unchanged when no remoteUri', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'file:///old-device/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('file:///old-device/photo.jpg');
  });

  it('keeps uri unchanged when uri is already a remote URL', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'https://cdn.example.com/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
    };
    expect(normalizeCloudMediaItem(item).uri).toBe('https://cdn.example.com/photo.jpg');
  });

  it('preserves all other fields', () => {
    const item: MediaInfo = {
      ...base,
      uri: 'file:///old/photo.jpg',
      remoteUri: 'https://cdn.example.com/photo.jpg',
      thumbnail: 'file:///old/thumb.jpg',
      remoteThumbnail: 'https://cdn.example.com/thumb.jpg',
    };
    const result = normalizeCloudMediaItem(item);
    expect(result.remoteUri).toBe('https://cdn.example.com/photo.jpg');
    expect(result.thumbnail).toBe('file:///old/thumb.jpg');
    expect(result.remoteThumbnail).toBe('https://cdn.example.com/thumb.jpg');
  });
});
