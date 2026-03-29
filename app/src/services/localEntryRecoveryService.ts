import type { Entry } from '@/src/types/entry';
import * as DB from '@/src/database/operations';
import { deleteFile } from '@/src/utils/fileSystem';

export interface LocalEntryRecoveryDeps {
  getEntriesByLocalReadyState: (states: Array<NonNullable<Entry['localReadyState']>>) => Promise<Entry[]>;
  deleteLocalFile: (uri: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

const defaultDeps: LocalEntryRecoveryDeps = {
  getEntriesByLocalReadyState: (states) => DB.getEntriesByLocalReadyState(states),
  deleteLocalFile: (uri) => deleteFile(uri),
  deleteEntry: (id) => DB.deleteEntry(id),
};

const collectLocalMediaUris = (entry: Entry): string[] =>
  Array.from(
    new Set(
      (entry.media ?? []).flatMap((media) =>
        [media.uri, media.thumbnail].filter((uri): uri is string => Boolean(uri))
      )
    )
  );

export async function cleanupIncompleteLocalEntries(deps: LocalEntryRecoveryDeps = defaultDeps): Promise<void> {
  const entries = await deps.getEntriesByLocalReadyState(['processing']);

  for (const entry of entries) {
    for (const uri of collectLocalMediaUris(entry)) {
      await deps.deleteLocalFile(uri).catch(() => {});
    }
    await deps.deleteEntry(entry.id);
  }
}
