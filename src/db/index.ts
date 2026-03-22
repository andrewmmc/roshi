import Dexie, { type EntityTable } from 'dexie';
import type { ProviderConfig } from '@/types/provider';
import type { HistoryEntry } from '@/types/history';

const db = new Dexie('llm-tester') as Dexie & {
  providers: EntityTable<ProviderConfig, 'id'>;
  history: EntityTable<HistoryEntry, 'id'>;
};

db.version(2).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, createdAt',
  collections: null,
});

db.version(1).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, collectionId, createdAt',
  collections: 'id, parentId, sortOrder',
});

export { db };
