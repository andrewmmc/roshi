import { useMemo, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Folder, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { toast } from '@/stores/toast-store';
import { useCollections } from '@/hooks/use-collections';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { useResponseStore } from '@/stores/response-store';
import type { SavedRequest } from '@/types/history';

function SaveRequestDialog({
  open,
  collections,
  activeSavedRequestId,
  onOpenChange,
  onCreateCollection,
  onSaveRequest,
  onUpdateRequest,
}: {
  open: boolean;
  collections: ReturnType<typeof useCollections>['collections'];
  activeSavedRequestId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreateCollection: (name: string) => Promise<void>;
  onSaveRequest: (collectionId: string, name: string) => Promise<void>;
  onUpdateRequest: () => Promise<void>;
}) {
  const [collectionName, setCollectionName] = useState('');
  const [requestName, setRequestName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');

  const reset = useCallback(() => {
    setCollectionName('');
    setRequestName('');
    setSelectedCollectionId(collections[0]?.id ?? '');
  }, [collections]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) reset();
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset],
  );

  const handleCreateCollection = useCallback(async () => {
    await onCreateCollection(collectionName);
    setCollectionName('');
  }, [collectionName, onCreateCollection]);

  const handleSave = useCallback(async () => {
    await onSaveRequest(selectedCollectionId, requestName);
    onOpenChange(false);
  }, [onOpenChange, onSaveRequest, requestName, selectedCollectionId]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save request</DialogTitle>
          <DialogDescription>
            Store the current composer in a collection so it can be reused
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {activeSavedRequestId && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                await onUpdateRequest();
                onOpenChange(false);
              }}
            >
              Update current saved request
            </Button>
          )}

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              New collection
            </label>
            <div className="flex gap-2">
              <Input
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Collection name"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateCollection}
                disabled={!collectionName.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              Save into
            </label>
            <select
              aria-label="Select collection"
              value={selectedCollectionId || collections[0]?.id || ''}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="border-input bg-muted/20 text-foreground focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2 text-sm outline-none focus-visible:ring-3"
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              Request name
            </label>
            <Input
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="Summarize customer support prompt"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!collections.length || !requestName.trim()}
          >
            Save request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SavedRequestItem({
  request,
  active,
  onSelect,
  onDelete,
}: {
  request: SavedRequest;
  active: boolean;
  onSelect: (request: SavedRequest) => void;
  onDelete: (id: string) => void;
}) {
  const preview =
    request.request.messages.find((message) => message.role === 'user')
      ?.content ||
    request.request.systemPrompt ||
    'No prompt text';

  return (
    <div className="group relative">
      <button
        className={`hover:bg-sidebar-accent/70 w-full cursor-pointer rounded px-2.5 py-1.5 pr-9 text-left transition-colors ${
          active ? 'bg-sidebar-accent/80' : ''
        }`}
        onClick={() => onSelect(request)}
      >
        <div className="text-foreground/85 truncate text-[13px] leading-snug">
          {request.name}
        </div>
        <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
          {request.providerName} / {request.modelId}
        </div>
        <div className="text-muted-foreground/70 mt-0.5 truncate text-[10px]">
          {preview}
        </div>
      </button>
      <div className="absolute top-1/2 right-0.5 -translate-y-1/2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-7 w-7"
          tooltip="Delete saved request"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(request.id);
          }}
        >
          <Trash2 className="h-2.5 w-2.5" />
        </IconButton>
      </div>
    </div>
  );
}

export function CollectionsList({ headerSlot }: { headerSlot?: ReactNode }) {
  const {
    collections,
    savedRequests,
    addCollection,
    deleteCollection,
    saveCurrentRequest,
    updateSavedRequest,
    deleteSavedRequest,
  } = useCollections();
  const loadComposerFromHistory = useComposerStore(
    (s) => s.loadComposerFromHistory,
  );
  const setSavedRequestContext = useComposerStore(
    (s) => s.setSavedRequestContext,
  );
  const activeSavedRequestId = useComposerStore((s) => s.activeSavedRequestId);
  const hasUnsavedChanges = useComposerStore(selectHasUnsavedChanges);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const resetResponse = useResponseStore((s) => s.resetResponse);
  const [saveOpen, setSaveOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingRequestRef = useRef<SavedRequest | null>(null);

  const requestsByCollection = useMemo(() => {
    const grouped = new Map<string, SavedRequest[]>();
    for (const request of savedRequests) {
      grouped.set(request.collectionId, [
        ...(grouped.get(request.collectionId) ?? []),
        request,
      ]);
    }
    return grouped;
  }, [savedRequests]);

  const applySavedRequest = useCallback(
    (request: SavedRequest) => {
      selectProvider(request.providerId);
      selectModel(request.modelId);
      loadComposerFromHistory(request.request);
      setSavedRequestContext(request.collectionId, request.id);
      resetResponse();
    },
    [
      loadComposerFromHistory,
      resetResponse,
      selectModel,
      selectProvider,
      setSavedRequestContext,
    ],
  );

  const handleSelect = useCallback(
    (request: SavedRequest) => {
      if (hasUnsavedChanges) {
        pendingRequestRef.current = request;
        setDiscardOpen(true);
      } else {
        applySavedRequest(request);
      }
    },
    [applySavedRequest, hasUnsavedChanges],
  );

  const handleDiscardConfirm = useCallback(() => {
    if (pendingRequestRef.current) {
      applySavedRequest(pendingRequestRef.current);
      pendingRequestRef.current = null;
    }
  }, [applySavedRequest]);

  const handleCreateCollection = useCallback(
    async (name: string) => {
      await addCollection(name);
      toast('Collection created');
    },
    [addCollection],
  );

  const handleSaveRequest = useCallback(
    async (collectionId: string, name: string) => {
      await saveCurrentRequest(collectionId, name);
      toast('Request saved');
    },
    [saveCurrentRequest],
  );

  const handleUpdateRequest = useCallback(async () => {
    const request = savedRequests.find(
      (item) => item.id === activeSavedRequestId,
    );
    if (!request) return;
    await updateSavedRequest(request.id, request.name);
    toast('Saved request updated');
  }, [activeSavedRequestId, savedRequests, updateSavedRequest]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border flex h-9 shrink-0 items-center justify-between border-b px-3">
        {headerSlot ?? (
          <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Collections
          </span>
        )}
        <div className="flex items-center">
          <IconButton
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={() => setSaveOpen(true)}
            tooltip="Save current request"
          >
            <Save className="h-3 w-3" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={async () => {
              await handleCreateCollection('New collection');
            }}
            tooltip="New collection"
          >
            <Plus className="h-3 w-3" />
          </IconButton>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-2">
          {collections.length === 0 && (
            <div className="text-muted-foreground px-3 py-8 text-center text-xs">
              Save requests into collections for quick reuse.
            </div>
          )}
          {collections.map((collection) => {
            const requests = requestsByCollection.get(collection.id) ?? [];
            return (
              <section key={collection.id} className="space-y-1">
                <div className="group flex items-center gap-1 px-1.5 py-1">
                  <Folder className="text-muted-foreground h-3 w-3" />
                  <span className="text-muted-foreground flex-1 truncate text-[11px] font-medium tracking-wide uppercase">
                    {collection.name}
                  </span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    {requests.length}
                  </span>
                  <IconButton
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    tooltip="Delete collection"
                    onClick={() => deleteCollection(collection.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </IconButton>
                </div>
                {requests.length === 0 ? (
                  <p className="text-muted-foreground/70 px-2.5 pb-1 text-[11px]">
                    No saved requests
                  </p>
                ) : (
                  requests.map((request) => (
                    <SavedRequestItem
                      key={request.id}
                      request={request}
                      active={request.id === activeSavedRequestId}
                      onSelect={handleSelect}
                      onDelete={deleteSavedRequest}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      </ScrollArea>

      <SaveRequestDialog
        open={saveOpen}
        collections={collections}
        activeSavedRequestId={activeSavedRequestId}
        onOpenChange={setSaveOpen}
        onCreateCollection={handleCreateCollection}
        onSaveRequest={handleSaveRequest}
        onUpdateRequest={handleUpdateRequest}
      />

      <ConfirmDiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}
