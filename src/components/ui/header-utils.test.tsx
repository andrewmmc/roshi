import { describe, it, expect } from 'vitest';
import { headersToRecord, recordToHeaders } from './header-utils';
import type { HeaderEntry } from './header-list-editor';

describe('header-utils', () => {
  describe('headersToRecord', () => {
    it('filters out entries with empty keys', () => {
      const headers: HeaderEntry[] = [
        { id: '1', key: 'x-api-key', value: 'secret' },
        { id: '2', key: '', value: 'should-be-filtered' },
        { id: '3', key: '   ', value: 'also-filtered' },
        { id: '4', key: 'x-custom', value: 'value' },
      ];
      const result = headersToRecord(headers);
      expect(result).toEqual({
        'x-api-key': 'secret',
        'x-custom': 'value',
      });
    });

    it('handles empty array', () => {
      expect(headersToRecord([])).toEqual({});
    });

    it('keeps trailing empty values as long as key is present', () => {
      const headers: HeaderEntry[] = [
        { id: '1', key: 'x-empty-value', value: '' },
      ];
      const result = headersToRecord(headers);
      expect(result).toEqual({
        'x-empty-value': '',
      });
    });
  });

  describe('recordToHeaders', () => {
    it('converts record to header entries', () => {
      const record = {
        'x-api-key': 'secret',
        'x-custom': 'value',
      };
      const result = recordToHeaders(record);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ key: 'x-api-key', value: 'secret' });
      expect(result[1]).toMatchObject({ key: 'x-custom', value: 'value' });
      // Each entry should have a unique id
      expect(result[0].id).not.toBe(result[1].id);
    });

    it('always includes at least one empty entry when record is empty', () => {
      const result = recordToHeaders({});
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: expect.any(String), key: '', value: '' });
    });

    it('does not include empty entry when record has values', () => {
      const record = { 'x-api-key': 'secret' };
      const result = recordToHeaders(record);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ key: 'x-api-key', value: 'secret' });
    });

    it('handles undefined input', () => {
      const result = recordToHeaders(undefined);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: expect.any(String), key: '', value: '' });
    });
  });
});
