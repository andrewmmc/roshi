import { describe, expect, it } from 'vitest';
import {
  createEmptyHeaderEntry,
  headersToHistoryEntries,
  headersToRecord,
  historyEntriesToHeaders,
  recordToHeaders,
} from './headers';

describe('headers utils', () => {
  it('creates an empty header entry with a unique id', () => {
    const first = createEmptyHeaderEntry();
    const second = createEmptyHeaderEntry();

    expect(first).toEqual({ id: expect.any(String), key: '', value: '' });
    expect(second.id).not.toBe(first.id);
  });

  it('converts header entries to a record, skipping blank keys', () => {
    expect(
      headersToRecord([
        { key: ' Authorization ', value: 'Bearer secret' },
        { key: '', value: 'ignored' },
        { key: '  ', value: 'ignored' },
      ]),
    ).toEqual({ Authorization: 'Bearer secret' });
  });

  it('converts header entries to history entries', () => {
    expect(
      headersToHistoryEntries([
        { key: 'X-Trace', value: 'abc' },
        { key: '', value: 'ignored' },
      ]),
    ).toEqual([{ key: 'X-Trace', value: 'abc' }]);
  });

  it('converts history entries to editable headers', () => {
    const headers = historyEntriesToHeaders([
      { key: 'X-Trace', value: 'abc' },
      { key: '  ', value: 'ignored' },
    ]);

    expect(headers).toHaveLength(1);
    expect(headers[0]).toMatchObject({ key: 'X-Trace', value: 'abc' });
  });

  it('returns a blank header row when history entries are empty', () => {
    expect(historyEntriesToHeaders([])).toHaveLength(1);
    expect(historyEntriesToHeaders([])[0]).toMatchObject({
      key: '',
      value: '',
    });
  });

  it('converts a record to header entries', () => {
    const headers = recordToHeaders({ Accept: 'application/json' });

    expect(headers).toHaveLength(1);
    expect(headers[0]).toMatchObject({
      key: 'Accept',
      value: 'application/json',
    });
  });

  it('returns a blank header row when the record is empty', () => {
    expect(recordToHeaders({})).toHaveLength(1);
    expect(recordToHeaders()).toHaveLength(1);
  });

  it('assigns ids when restoring headers from history', () => {
    const headers = historyEntriesToHeaders([{ key: 'X-Test', value: '1' }]);

    expect(headers[0].id).toEqual(expect.any(String));
  });
});
