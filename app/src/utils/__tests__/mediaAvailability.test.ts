import type { Entry, MediaInfo } from '@/src/types/entry';
import { isEntryMediaPendingHydration, isPhotoMediaPendingHydration, isVoiceMediaPendingHydration } from '../mediaAvailability';

function makeMedia(overrides: Partial<MediaInfo> = {}): MediaInfo {
  return {
    uri: 'file:///local/photo.jpg',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'test',
    timestamp: Date.now(),
    type: 'text',
    content: 'hello',
    ...overrides,
  } as Entry;
}

describe('isPhotoMediaPendingHydration', () => {
  it('returns false when local thumbnail exists', () => {
    expect(isPhotoMediaPendingHydration(makeMedia({ thumbnail: 'file:///thumb.jpg' }))).toBe(false);
  });

  it('returns true when only remote URIs exist', () => {
    expect(isPhotoMediaPendingHydration(
      makeMedia({
        uri: 'https://cdn.example/photo.jpg',
        thumbnail: undefined,
        remoteThumbnail: 'https://cdn.example/thumb.jpg',
      })
    )).toBe(true);
  });
});

describe('isVoiceMediaPendingHydration', () => {
  it('returns false when media is undefined', () => {
    expect(isVoiceMediaPendingHydration(undefined)).toBe(false);
  });

  it('returns false when local audio exists', () => {
    expect(isVoiceMediaPendingHydration(makeMedia({ uri: 'file:///audio.m4a' }))).toBe(false);
  });

  it('returns true when only remote audio exists', () => {
    expect(isVoiceMediaPendingHydration(
      makeMedia({ uri: 'https://cdn.example/audio.m4a', remoteUri: 'https://cdn.example/audio.m4a' })
    )).toBe(true);
  });
});

describe('isEntryMediaPendingHydration', () => {
  it('returns false for entries with no media', () => {
    expect(isEntryMediaPendingHydration(makeEntry({ type: 'photo', media: [] }))).toBe(false);
  });

  it('returns false for text entries', () => {
    expect(isEntryMediaPendingHydration(makeEntry({ type: 'text', media: [makeMedia()] }))).toBe(false);
  });

  it('handles voice entries', () => {
    expect(isEntryMediaPendingHydration(
      makeEntry({ type: 'voice', media: [makeMedia({ uri: 'file:///audio.m4a' })] })
    )).toBe(false);
  });

  it('handles photo entries', () => {
    expect(isEntryMediaPendingHydration(
      makeEntry({ type: 'photo', media: [makeMedia({ thumbnail: 'file:///thumb.jpg' })] })
    )).toBe(false);
  });
});
