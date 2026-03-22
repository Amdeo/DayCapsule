import { getEntryCardVariant } from '../entryCardVariants';

describe('entryCardVariants', () => {
  it('returns stable shell classes for text, photo and voice entries', () => {
    expect(getEntryCardVariant('text', 'default')).toMatchObject({
      shellClassName: expect.stringContaining('bg-entry-text'),
    });
    expect(getEntryCardVariant('photo', 'default')).toMatchObject({
      shellClassName: expect.stringContaining('bg-entry-photo'),
    });
    expect(getEntryCardVariant('voice', 'default')).toMatchObject({
      shellClassName: expect.stringContaining('bg-entry-voice'),
    });
  });
});
