import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTranslation } from '@/i18n';
import type { HistoryFilters } from '@/utils/history-filter';

const STATUS_CODE_FILTERS = [
  'all',
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'none',
] as const;
const DATE_FILTERS = ['all', 'today', '7d', '30d'] as const;

export function HistoryFiltersSheet({
  open,
  filters,
  isFiltering,
  providerOptions,
  modelOptions,
  collectionOptions,
  savedRequestOptions,
  onOpenChange,
  onFilterChange,
  onClearFilters,
}: {
  open: boolean;
  filters: HistoryFilters;
  isFiltering: boolean;
  providerOptions: { id: string; name: string }[];
  modelOptions: string[];
  collectionOptions: { id: string; name: string }[];
  savedRequestOptions: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onFilterChange: (updates: Partial<HistoryFilters>) => void;
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  const getDateLabel = (value: string): string => {
    if (value === 'today') return t('history.dateToday');
    if (value === '7d') return t('history.dateLast7Days');
    if (value === '30d') return t('history.dateLast30Days');
    return t('history.dateAnyTime');
  };
  const providerLabel =
    filters.providerId === 'all'
      ? t('history.allProviders')
      : (providerOptions.find((provider) => provider.id === filters.providerId)
          ?.name ?? t('history.provider'));
  const modelLabel =
    filters.modelId === 'all' ? t('history.allModels') : filters.modelId;
  const collectionLabel =
    filters.collectionId === 'all'
      ? t('history.allFolders')
      : (collectionOptions.find(
          (collection) => collection.id === filters.collectionId,
        )?.name ?? t('history.folder'));
  const savedRequestLabel =
    filters.savedRequestId === 'all'
      ? t('history.allRequests')
      : (savedRequestOptions.find(
          (request) => request.id === filters.savedRequestId,
        )?.name ?? t('history.request'));

  const handleClearFilters = () => {
    onClearFilters();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="history-filters-description">
        <SheetHeader className="pr-12">
          <SheetTitle>{t('history.filtersTitle')}</SheetTitle>
          <SheetDescription id="history-filters-description">
            {t('history.filtersDescription')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t('history.provider')}
            </span>
            <Select
              value={filters.providerId}
              onValueChange={(providerId) =>
                onFilterChange({ providerId: providerId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label={t('history.filterByProvider')}
                className="h-8 w-full text-xs"
              >
                <SelectValue>{providerLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allProviders')}</SelectItem>
                {providerOptions.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t('history.model')}
            </span>
            <Select
              value={filters.modelId}
              onValueChange={(modelId) =>
                onFilterChange({ modelId: modelId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label={t('history.filterByModel')}
                className="h-8 w-full text-xs"
              >
                <SelectValue>{modelLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allModels')}</SelectItem>
                {modelOptions.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>
                    {modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t('history.dateRange')}
            </span>
            <Select
              value={filters.dateRange}
              onValueChange={(dateRange) =>
                onFilterChange({
                  dateRange: (dateRange ??
                    'all') as HistoryFilters['dateRange'],
                })
              }
            >
              <SelectTrigger
                aria-label={t('history.filterByDate')}
                className="h-8 w-full text-xs"
              >
                <SelectValue>{getDateLabel(filters.dateRange)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((dateRange) => (
                  <SelectItem key={dateRange} value={dateRange}>
                    {getDateLabel(dateRange)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t('history.statusCode')}
            </span>
            <Select
              value={filters.statusCodeClass}
              onValueChange={(statusCodeClass) =>
                onFilterChange({
                  statusCodeClass: (statusCodeClass ??
                    'all') as HistoryFilters['statusCodeClass'],
                })
              }
            >
              <SelectTrigger
                aria-label={t('history.filterByStatusCode')}
                className="h-8 w-full text-xs"
              >
                <SelectValue>
                  {filters.statusCodeClass === 'all'
                    ? t('history.anyHttp')
                    : filters.statusCodeClass === 'none'
                      ? t('history.noStatus')
                      : filters.statusCodeClass}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_CODE_FILTERS.map((statusCodeClass) => (
                  <SelectItem key={statusCodeClass} value={statusCodeClass}>
                    {statusCodeClass === 'all'
                      ? t('history.anyHttpStatus')
                      : statusCodeClass === 'none'
                        ? t('history.noStatus')
                        : statusCodeClass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t('history.folder')}
            </span>
            <Select
              value={filters.collectionId}
              onValueChange={(collectionId) =>
                onFilterChange({ collectionId: collectionId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label={t('history.filterByFolder')}
                className="h-8 w-full text-xs"
              >
                <SelectValue>{collectionLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allFolders')}</SelectItem>
                {collectionOptions.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {t('history.savedRequest')}
            </span>
            <Select
              value={filters.savedRequestId}
              onValueChange={(savedRequestId) =>
                onFilterChange({ savedRequestId: savedRequestId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label={t('history.filterBySavedRequest')}
                className="h-8 w-full text-xs"
              >
                <SelectValue>{savedRequestLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allRequests')}</SelectItem>
                {savedRequestOptions.map((request) => (
                  <SelectItem key={request.id} value={request.id}>
                    {request.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button
            variant="outline"
            className="w-full"
            disabled={!isFiltering}
            onClick={handleClearFilters}
          >
            {t('history.clearAllFilters')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
