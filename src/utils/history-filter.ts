import type { HistoryEntry } from '@/types/history';

export type HistoryStatusFilter = 'all' | 'success' | 'error';
export type HistoryStatusCodeClassFilter =
  | 'all'
  | '2xx'
  | '3xx'
  | '4xx'
  | '5xx'
  | 'none';
export type HistoryDateRangeFilter = 'all' | 'today' | '7d' | '30d';

export interface HistoryFilters {
  searchQuery: string;
  status: HistoryStatusFilter;
  providerId: string;
  modelId: string;
  statusCodeClass: HistoryStatusCodeClassFilter;
  dateRange: HistoryDateRangeFilter;
  collectionId: string;
  savedRequestId: string;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  searchQuery: '',
  status: 'all',
  providerId: 'all',
  modelId: 'all',
  statusCodeClass: 'all',
  dateRange: 'all',
  collectionId: 'all',
  savedRequestId: 'all',
};

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function entrySearchText(entry: HistoryEntry): string {
  return [
    entry.providerName,
    entry.modelId,
    entry.request.systemPrompt,
    entry.requestUrl,
    entry.statusCode,
    entry.error,
    entry.response?.content,
    ...entry.request.messages.map((message) => message.content),
    ...Object.keys(entry.requestHeaders ?? {}),
    ...(entry.customHeaders ?? []).map((header) => header.key),
  ]
    .map(normalize)
    .join('\n');
}

function matchesStatus(
  entry: HistoryEntry,
  status: HistoryStatusFilter,
): boolean {
  if (status === 'all') return true;
  if (status === 'error') return entry.error !== null;
  return entry.error === null;
}

function matchesStatusCodeClass(
  entry: HistoryEntry,
  statusCodeClass: HistoryStatusCodeClassFilter,
): boolean {
  if (statusCodeClass === 'all') return true;
  if (statusCodeClass === 'none') return entry.statusCode === null;
  if (entry.statusCode === null) return false;
  return Math.floor(entry.statusCode / 100) === Number(statusCodeClass[0]);
}

function getDateCutoff(
  dateRange: HistoryDateRangeFilter,
  now: Date,
): Date | null {
  if (dateRange === 'all') return null;
  const cutoff = new Date(now);
  if (dateRange === 'today') {
    cutoff.setHours(0, 0, 0, 0);
  } else if (dateRange === '7d') {
    cutoff.setDate(cutoff.getDate() - 7);
  } else {
    cutoff.setDate(cutoff.getDate() - 30);
  }
  return cutoff;
}

export function isDefaultHistoryFilters(filters: HistoryFilters): boolean {
  return Object.entries(DEFAULT_HISTORY_FILTERS).every(
    ([key, value]) => filters[key as keyof HistoryFilters] === value,
  );
}

export function filterHistoryEntries(
  entries: HistoryEntry[],
  filters: HistoryFilters,
  now = new Date(),
): HistoryEntry[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const dateCutoff = getDateCutoff(filters.dateRange, now);

  return entries.filter((entry) => {
    if (!matchesStatus(entry, filters.status)) return false;
    if (!matchesStatusCodeClass(entry, filters.statusCodeClass)) return false;
    if (
      filters.providerId !== 'all' &&
      entry.providerId !== filters.providerId
    ) {
      return false;
    }
    if (filters.modelId !== 'all' && entry.modelId !== filters.modelId) {
      return false;
    }
    if (
      filters.collectionId !== 'all' &&
      entry.collectionId !== filters.collectionId
    ) {
      return false;
    }
    if (
      filters.savedRequestId !== 'all' &&
      entry.savedRequestId !== filters.savedRequestId
    ) {
      return false;
    }
    if (dateCutoff && new Date(entry.createdAt) < dateCutoff) return false;
    if (query && !entrySearchText(entry).includes(query)) return false;
    return true;
  });
}
