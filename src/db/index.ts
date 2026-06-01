import Dexie, { type EntityTable } from 'dexie';
import type { ProviderConfig } from '@/types/provider';
import type {
  HistoryEntry,
  Collection,
  Environment,
  SavedRequest,
} from '@/types/history';

export interface AppSetting {
  key: string;
  value: unknown;
}

const db = new Dexie('llm-tester') as Dexie & {
  providers: EntityTable<ProviderConfig, 'id'>;
  history: EntityTable<HistoryEntry, 'id'>;
  collections: EntityTable<Collection, 'id'>;
  savedRequests: EntityTable<SavedRequest, 'id'>;
  environments: EntityTable<Environment, 'id'>;
  settings: EntityTable<AppSetting, 'key'>;
};

db.version(1).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, collectionId, createdAt',
  collections: 'id, parentId, sortOrder',
});

db.version(2).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, collectionId, createdAt',
  collections: 'id, parentId, sortOrder',
  settings: 'key',
});

db.version(3).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, collectionId, savedRequestId, createdAt',
  collections: 'id, parentId, sortOrder',
  savedRequests: 'id, collectionId, providerId, modelId, updatedAt',
  settings: 'key',
});

db.version(4).stores({
  providers: 'id, name, type, isBuiltIn',
  history: 'id, providerId, collectionId, savedRequestId, createdAt',
  collections: 'id, parentId, sortOrder',
  savedRequests: 'id, collectionId, providerId, modelId, updatedAt',
  environments: 'id, name, updatedAt',
  settings: 'key',
});

export { db };
