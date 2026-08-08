import Dexie from 'dexie';
import { db } from './index';

describe('database schema', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('llm-tester');
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete('llm-tester');
  });

  it('upgrades v5 eval data to the current schema without data loss', async () => {
    const legacyDb = new Dexie('llm-tester');
    legacyDb.version(5).stores({
      evalRuns: 'id, createdAt',
    });
    await legacyDb.open();
    await legacyDb.table('evalRuns').put({
      id: 'run-1',
      createdAt: '2026-08-08T00:00:00.000Z',
    });
    legacyDb.close();

    await db.open();

    expect(db.verno).toBe(6);
    expect(db.tables.map((table) => table.name)).toContain('evalCollections');
    expect(db.evalRuns.schema.indexes.map((index) => index.name)).toContain(
      'collectionId',
    );
    expect(await db.evalRuns.get('run-1')).toMatchObject({ id: 'run-1' });
  });
});
