import { useMediaRepairStore } from '../mediaRepairStore';

describe('mediaRepairStore', () => {
  beforeEach(() => {
    useMediaRepairStore.setState({ issues: [] });
  });

  it('replaces and clears repair issues', () => {
    const issues = [
      {
        entryId: 'entry-1',
        mediaIndex: 0,
        localMediaId: 'local-1',
        localUri: 'file:///local/photo.jpg',
        remoteUri: 'https://cdn.example.com/photo.jpg',
        persistedHash: 'persisted-hash',
        remoteHash: 'remote-hash',
        downloadedHash: 'downloaded-hash',
        integrityStatus: 'repair_prompt_required' as const,
        integrityReason: 'cloud hash mismatch while local original is still healthy',
      },
    ];

    useMediaRepairStore.getState().replaceIssues(issues);
    expect(useMediaRepairStore.getState().issues).toEqual(issues);

    useMediaRepairStore.getState().clearIssues();
    expect(useMediaRepairStore.getState().issues).toEqual([]);
  });

  it('dismisses one repair issue by entryId and localMediaId', () => {
    useMediaRepairStore.getState().replaceIssues([
      {
        entryId: 'entry-1',
        mediaIndex: 0,
        localMediaId: 'local-1',
        localUri: 'file:///local/photo-1.jpg',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'suspect one',
      },
      {
        entryId: 'entry-2',
        mediaIndex: 0,
        localMediaId: 'local-2',
        localUri: 'file:///local/photo-2.jpg',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'suspect two',
      },
    ]);

    useMediaRepairStore.getState().dismissIssue('entry-1', 'local-1');

    expect(useMediaRepairStore.getState().issues).toEqual([
      expect.objectContaining({
        entryId: 'entry-2',
        localMediaId: 'local-2',
      }),
    ]);
  });

  it('dismisses one repair issue by entryId and mediaIndex when localMediaId is missing', () => {
    useMediaRepairStore.getState().replaceIssues([
      {
        entryId: 'entry-1',
        mediaIndex: 1,
        localMediaId: undefined,
        localUri: 'file:///local/photo-1.jpg',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'suspect one',
      },
      {
        entryId: 'entry-1',
        mediaIndex: 2,
        localMediaId: undefined,
        localUri: 'file:///local/photo-2.jpg',
        integrityStatus: 'repair_prompt_required',
        integrityReason: 'suspect two',
      },
    ]);

    useMediaRepairStore.getState().dismissIssue('entry-1', undefined, 1);

    expect(useMediaRepairStore.getState().issues).toEqual([
      expect.objectContaining({
        entryId: 'entry-1',
        mediaIndex: 2,
      }),
    ]);
  });
});
