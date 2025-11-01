import {transcriptionStatsService} from '../transcriptionStats';
import {databaseService} from '@services/storage/database';
import type {LifelogEntry} from '@services/storage/database';

// Mock database service
jest.mock('@services/storage/database', () => ({
  databaseService: {
    getEntries: jest.fn(),
    getEntriesByDateRange: jest.fn(),
  },
}));

const mockEntries: LifelogEntry[] = [
  {
    id: '1',
    type: 'voice',
    content: 'Voice entry 1',
    transcription: 'Hello world',
    transcriptionLanguage: 'en-US',
    transcriptionConfidence: 0.95,
    tags: [],
    timestamp: Date.now(),
    voiceDuration: 30,
    mediaPath: '/path/to/audio1.m4a',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '2',
    type: 'voice',
    content: 'Voice entry 2',
    transcription: 'This is a test',
    transcriptionLanguage: 'en-US',
    transcriptionConfidence: 0.88,
    tags: [],
    timestamp: Date.now(),
    voiceDuration: 45,
    mediaPath: '/path/to/audio2.m4a',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '3',
    type: 'text',
    content: 'Text entry',
    tags: [],
    timestamp: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe('TranscriptionStatsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate stats correctly', async () => {
    (databaseService.getEntries as jest.Mock).mockResolvedValue(mockEntries);

    const stats = await transcriptionStatsService.getStats();

    expect(stats.totalEntries).toBe(3);
    expect(stats.totalTranscribedEntries).toBe(2);
    // "Hello world" = 11 chars, "This is a test" = 14 chars, total = 25
    expect(stats.totalCharacters).toBe(25);
    // 25 / 2 = 12.5, Math.round(12.5) = 13
    expect(stats.averageCharactersPerEntry).toBe(13);
    expect(stats.averageConfidence).toBeCloseTo(0.915, 2);
  });

  it('should calculate confidence distribution', async () => {
    (databaseService.getEntries as jest.Mock).mockResolvedValue(mockEntries);

    const stats = await transcriptionStatsService.getStats();

    expect(stats.confidenceDistribution.excellent).toBe(1); // 0.95
    expect(stats.confidenceDistribution.good).toBe(1); // 0.88
    expect(stats.confidenceDistribution.fair).toBe(0);
    expect(stats.confidenceDistribution.poor).toBe(0);
  });

  it('should calculate language distribution', async () => {
    (databaseService.getEntries as jest.Mock).mockResolvedValue(mockEntries);

    const stats = await transcriptionStatsService.getStats();

    expect(stats.languageDistribution['en-US']).toBe(2);
  });

  it('should find longest and shortest transcriptions', async () => {
    (databaseService.getEntries as jest.Mock).mockResolvedValue(mockEntries);

    const stats = await transcriptionStatsService.getStats();

    // "This is a test" = 14 chars (longest)
    expect(stats.longestTranscription?.entryId).toBe('2');
    expect(stats.longestTranscription?.characters).toBe(14);
    // "Hello world" = 11 chars (shortest)
    expect(stats.shortestTranscription?.entryId).toBe('1');
    expect(stats.shortestTranscription?.characters).toBe(11);
  });

  it('should handle empty transcriptions', async () => {
    (databaseService.getEntries as jest.Mock).mockResolvedValue([
      {
        id: '1',
        type: 'text',
        content: '文字记录',
        tags: [],
        timestamp: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    const stats = await transcriptionStatsService.getStats();

    expect(stats.totalTranscribedEntries).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.averageCharactersPerEntry).toBe(0);
  });

  it('should get stats by date range', async () => {
    (databaseService.getEntriesByDateRange as jest.Mock).mockResolvedValue(mockEntries);

    const startDate = Date.now() - 86400000; // 1 day ago
    const endDate = Date.now();

    const stats = await transcriptionStatsService.getStatsByDateRange(startDate, endDate);

    expect(stats.totalTranscribedEntries).toBe(2);
    expect(databaseService.getEntriesByDateRange).toHaveBeenCalledWith(startDate, endDate);
  });

  it('should get stats by language', async () => {
    (databaseService.getEntries as jest.Mock).mockResolvedValue(mockEntries);

    const stats = await transcriptionStatsService.getStatsByLanguage('en-US');

    expect(stats.totalTranscribedEntries).toBe(2);
    expect(stats.languageDistribution['en-US']).toBe(2);
  });

  it('should handle errors gracefully', async () => {
    (databaseService.getEntries as jest.Mock).mockRejectedValue(new Error('Database error'));

    await expect(transcriptionStatsService.getStats()).rejects.toThrow('Database error');
  });
});
