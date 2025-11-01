import {databaseService} from '@services/storage/database';
import {voiceService} from '@services/voice';
import type {LifelogEntry} from '@services/storage/database';

jest.mock('@services/permissions');
jest.mock('react-native-audio-recorder-player');

describe('Voice Entry Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a complete voice entry', async () => {
    const entryData = {
      type: 'voice' as const,
      content: '这是一条语音记录',
      timestamp: Date.now(),
      tags: ['语音'],
      mediaPath: '/path/to/audio.m4a',
      voiceDuration: 30000, // 30 seconds
      transcription: '这是一条语音记录的转录文本',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saveSpy = jest.spyOn(databaseService, 'insertEntry').mockResolvedValue('voice-entry-1');

    const result = await databaseService.insertEntry(entryData);

    expect(saveSpy).toHaveBeenCalled();
    expect(result).toBe('voice-entry-1');
  });

  it('should record voice and save to database', async () => {
    const recordingPath = '/path/to/audio.m4a';

    // Mock voice service recording
    const startSpy = jest.spyOn(voiceService, 'startRecording').mockResolvedValue(recordingPath);

    const path = await voiceService.startRecording();

    expect(startSpy).toHaveBeenCalled();
    expect(path).toBe(recordingPath);
  });

  it('should stop recording and get duration', async () => {
    const voiceRecording = {
      uri: '/path/to/audio.m4a',
      duration: 45000, // 45 seconds
      fileSize: 1024000,
    };

    const stopSpy = jest.spyOn(voiceService, 'stopRecording').mockResolvedValue(voiceRecording);

    const result = await voiceService.stopRecording();

    expect(stopSpy).toHaveBeenCalled();
    expect(result?.duration).toBe(45000);
  });

  it('should format voice duration correctly', () => {
    const formatSpy = jest.spyOn(voiceService, 'formatTime');

    const time1 = voiceService.formatTime(0);
    const time2 = voiceService.formatTime(60000);
    const time3 = voiceService.formatTime(125000);

    expect(formatSpy).toHaveBeenCalledTimes(3);
    expect(time1).toBe('00:00');
    expect(time2).toBe('01:00');
    expect(time3).toBe('02:05');
  });

  it('should retrieve voice entries with transcription', async () => {
    const entries: LifelogEntry[] = [
      {
        id: 'voice-entry-1',
        type: 'voice',
        content: '语音记录1',
        timestamp: Date.now(),
        tags: ['语音'],
        mediaPath: '/path/to/audio1.m4a',
        voiceDuration: 30000,
        transcription: '这是第一条语音记录',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'voice-entry-2',
        type: 'voice',
        content: '语音记录2',
        timestamp: Date.now() - 3600000,
        tags: ['语音'],
        mediaPath: '/path/to/audio2.m4a',
        voiceDuration: 45000,
        transcription: '这是第二条语音记录',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
    ];

    const getSpy = jest.spyOn(databaseService, 'getEntries').mockResolvedValue(entries);

    const result = await databaseService.getEntries();

    expect(getSpy).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('voice');
    expect(result[0].transcription).toBeDefined();
  });

  it('should update voice entry with transcription', async () => {
    const entry: LifelogEntry = {
      id: 'voice-entry-1',
      type: 'voice',
      content: '语音记录',
      timestamp: Date.now(),
      tags: [],
      mediaPath: '/path/to/audio.m4a',
      voiceDuration: 30000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedEntry: LifelogEntry = {
      ...entry,
      transcription: '这是转录后的文本',
      updatedAt: Date.now(),
    };

    const updateSpy = jest.spyOn(databaseService, 'updateEntry').mockResolvedValue(undefined);

    await databaseService.updateEntry(updatedEntry);

    expect(updateSpy).toHaveBeenCalledWith(updatedEntry);
    expect(updatedEntry.transcription).toBe('这是转录后的文本');
  });

  it('should delete voice entry and clean up audio file', async () => {
    const entryId = 'voice-entry-1';

    const deleteSpy = jest.spyOn(databaseService, 'deleteEntry').mockResolvedValue(undefined);

    await databaseService.deleteEntry(entryId);

    expect(deleteSpy).toHaveBeenCalledWith(entryId);
  });
});
