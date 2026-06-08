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

function getDateLabel(value: string): string {
  if (value === 'today') return 'Today';
  if (value === '7d') return 'Last 7 days';
  if (value === '30d') return 'Last 30 days';
  return 'Any time';
}

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
  const providerLabel =
    filters.providerId === 'all'
      ? 'All providers'
      : (providerOptions.find((provider) => provider.id === filters.providerId)
          ?.name ?? 'Provider');
  const modelLabel = filters.modelId === 'all' ? 'All models' : filters.modelId;
  const collectionLabel =
    filters.collectionId === 'all'
      ? 'All collections'
      : (collectionOptions.find(
          (collection) => collection.id === filters.collectionId,
        )?.name ?? 'Collection');
  const savedRequestLabel =
    filters.savedRequestId === 'all'
      ? 'All requests'
      : (savedRequestOptions.find(
          (request) => request.id === filters.savedRequestId,
        )?.name ?? 'Request');

  const handleClearFilters = () => {
    onClearFilters();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="history-filters-description">
        <SheetHeader className="pr-12">
          <SheetTitle>History filters</SheetTitle>
          <SheetDescription id="history-filters-description">
            Narrow history by provider, model, date, response, collection, or
            saved request.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Provider
            </span>
            <Select
              value={filters.providerId}
              onValueChange={(providerId) =>
                onFilterChange({ providerId: providerId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by provider"
                className="h-8 w-full text-xs"
              >
                <SelectValue>{providerLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
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
              Model
            </span>
            <Select
              value={filters.modelId}
              onValueChange={(modelId) =>
                onFilterChange({ modelId: modelId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by model"
                className="h-8 w-full text-xs"
              >
                <SelectValue>{modelLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
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
              Date range
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
                aria-label="Filter by date"
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
              Status code
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
                aria-label="Filter by status code"
                className="h-8 w-full text-xs"
              >
                <SelectValue>
                  {filters.statusCodeClass === 'all'
                    ? 'Any HTTP'
                    : filters.statusCodeClass === 'none'
                      ? 'No status'
                      : filters.statusCodeClass}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_CODE_FILTERS.map((statusCodeClass) => (
                  <SelectItem key={statusCodeClass} value={statusCodeClass}>
                    {statusCodeClass === 'all'
                      ? 'Any HTTP status'
                      : statusCodeClass === 'none'
                        ? 'No status'
                        : statusCodeClass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Collection
            </span>
            <Select
              value={filters.collectionId}
              onValueChange={(collectionId) =>
                onFilterChange({ collectionId: collectionId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by collection"
                className="h-8 w-full text-xs"
              >
                <SelectValue>{collectionLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
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
              Saved request
            </span>
            <Select
              value={filters.savedRequestId}
              onValueChange={(savedRequestId) =>
                onFilterChange({ savedRequestId: savedRequestId ?? 'all' })
              }
            >
              <SelectTrigger
                aria-label="Filter by saved request"
                className="h-8 w-full text-xs"
              >
                <SelectValue>{savedRequestLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All requests</SelectItem>
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
            Clear all filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
