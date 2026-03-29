jest.mock('../voiceService', () => ({
  VoiceService: {
    saveVoiceToCache: jest.fn(),
  },
}));

import { prepareVoiceEntryMedia } from '../voiceEntryPreparationService';

const AUDIO_FILE = {
  uri: 'file:///cache/recording.m4a',
  size: 2048,
  duration: 12,
  mimeType: 'audio/m4a',
};

describe('prepareVoiceEntryMedia', () => {
  it('prepares voice media once per entryId and returns created files for rollback', async () => {
    let resolveSave!: (value: string) => void;
    const savePromise = new Promise<string>((resolve) => {
      resolveSave = resolve;
    });
    const saveVoiceToCache = jest.fn(() => savePromise);

    const first = prepareVoiceEntryMedia('voice-entry-1', AUDIO_FILE, {
      saveVoiceToCache,
    });
    const second = prepareVoiceEntryMedia('voice-entry-1', AUDIO_FILE, {
      saveVoiceToCache,
    });

    resolveSave('file:///cache/final.m4a');

    const [firstPrepared, secondPrepared] = await Promise.all([first, second]);

    expect(saveVoiceToCache).toHaveBeenCalledTimes(1);
    expect(firstPrepared).toEqual({
      media: [
        {
          uri: 'file:///cache/final.m4a',
          mimeType: 'audio/m4a',
          size: 2048,
          duration: 12000,
        },
      ],
      createdFiles: ['file:///cache/final.m4a'],
    });
    expect(secondPrepared).toEqual(firstPrepared);
  });
});
