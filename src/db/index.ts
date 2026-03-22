import Dexie, { type EntityTable } from 'dexie';
import type { ProviderConfig } from '@/types/provider';
import type { HistoryEntry, Collection } from '@/types/history';

const db = new Dexie('llm-tester') as Dexie & {
  providers: EntityTable<ProviderConfig, 'id'>;
  history: EntityTable<HistoryEntry, 'id'>;
  collections: EntityTable<Collection, 'id'>;
};

db.version(1).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, collectionId, createdAt',
  collections: 'id, parentId, sortOrder',
});

export { db };
