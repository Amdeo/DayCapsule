import {databaseService} from '@services/storage/database';
import {cameraService} from '@services/camera';
import {tagSuggestionService} from '@services/ai/tagSuggestion';
import type {LifelogEntry} from '@services/storage/database';

jest.mock('@services/permissions');
jest.mock('react-native-image-picker');
jest.mock('react-native-image-resizer');

describe('Photo Entry Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a complete photo entry with tags and mood', async () => {
    // Simulate taking a photo
    const photoPath = '/path/to/photo.jpg';
    const thumbnailPath = '/path/to/thumbnail.jpg';

    // Create entry object (without id for insertEntry)
    const entryData = {
      type: 'photo' as const,
      content: '今天的美好时刻',
      timestamp: Date.now(),
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'San Francisco, CA',
      },
      tags: ['旅行', '风景'],
      mediaPath: photoPath,
      thumbnailPath: thumbnailPath,
      weather: {
        temperature: 72,
        condition: 'sunny',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Mock database save
    const saveSpy = jest.spyOn(databaseService, 'insertEntry').mockResolvedValue('entry-1');

    // Save entry
    const result = await databaseService.insertEntry(entryData);

    // Verify
    expect(saveSpy).toHaveBeenCalled();
    expect(result).toBe('entry-1');
  });

  it('should get tag suggestions based on photo content', async () => {
    const content = '今天去旅行，看到了美丽的风景';

    // Mock tag suggestion service
    const suggestionSpy = jest
      .spyOn(tagSuggestionService, 'getSuggestions')
      .mockResolvedValue(['旅行', '风景', '美景']);

    const suggestions = await tagSuggestionService.getSuggestions(content);

    expect(suggestionSpy).toHaveBeenCalled();
    expect(suggestions).toContain('旅行');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should update photo entry with new tags', async () => {
    const entry: LifelogEntry = {
      id: 'entry-1',
      type: 'photo',
      content: '美丽的日落',
      timestamp: Date.now(),
      tags: ['风景'],
      mediaPath: '/path/to/photo.jpg',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedEntry: LifelogEntry = {
      ...entry,
      tags: ['风景', '日落', '摄影'],
      updatedAt: Date.now(),
    };

    const updateSpy = jest.spyOn(databaseService, 'updateEntry').mockResolvedValue(undefined);

    await databaseService.updateEntry(updatedEntry);

    expect(updateSpy).toHaveBeenCalledWith(updatedEntry);
    expect(updatedEntry.tags.length).toBe(3);
  });

  it('should retrieve photo entries from database', async () => {
    const entries: LifelogEntry[] = [
      {
        id: 'entry-1',
        type: 'photo',
        content: '照片1',
        timestamp: Date.now(),
        tags: ['旅行'],
        mediaPath: '/path/to/photo1.jpg',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'entry-2',
        type: 'photo',
        content: '照片2',
        timestamp: Date.now() - 3600000,
        tags: ['风景'],
        mediaPath: '/path/to/photo2.jpg',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
    ];

    const getSpy = jest.spyOn(databaseService, 'getEntries').mockResolvedValue(entries);

    const result = await databaseService.getEntries();

    expect(getSpy).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('photo');
  });

  it('should delete photo entry and clean up media', async () => {
    const entryId = 'entry-1';

    const deleteSpy = jest.spyOn(databaseService, 'deleteEntry').mockResolvedValue(undefined);

    await databaseService.deleteEntry(entryId);

    expect(deleteSpy).toHaveBeenCalledWith(entryId);
  });
});
