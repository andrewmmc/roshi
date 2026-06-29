import { useMemo, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { Copy, Folder, FolderOpen, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarRow } from '@/components/ui/sidebar-row';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { SavedRequest, Collection } from '@/types/history';
import { TEMPLATE_COLLECTION_ID } from '@/constants/request-templates';

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
  const selectedCollection =
    collections.find((collection) => collection.id === selectedCollectionId) ??
    collections[0] ??
    null;
  const effectiveSelectedCollectionId = selectedCollection?.id ?? '';

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
    await onSaveRequest(effectiveSelectedCollectionId, requestName);
    onOpenChange(false);
  }, [effectiveSelectedCollectionId, onOpenChange, onSaveRequest, requestName]);

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
            <Select
              value={effectiveSelectedCollectionId}
              onValueChange={(value) => setSelectedCollectionId(value ?? '')}
            >
              <SelectTrigger aria-label="Select collection" className="w-full">
                <SelectValue>{selectedCollection?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  onDuplicate,
  isTemplate = false,
}: {
  request: SavedRequest;
  active: boolean;
  onSelect: (request: SavedRequest) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (request: SavedRequest) => void;
  isTemplate?: boolean;
}) {
  const preview =
    request.request.messages.find((message) => message.role === 'user')
      ?.content ||
    request.request.systemPrompt ||
    'No prompt text';

  return (
    <SidebarRow
      active={active}
      onClick={() => onSelect(request)}
      actions={
        <>
          {isTemplate && onDuplicate && (
            <IconButton
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              tooltip="Duplicate into collection"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(request);
              }}
            >
              <Copy className="h-3 w-3" />
            </IconButton>
          )}
          {!isTemplate && (
            <IconButton
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              tooltip="Delete saved request"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(request.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </IconButton>
          )}
        </>
      }
    >
      <div className="min-w-0 flex-1 pr-8">
        <div className="text-foreground/85 truncate text-[13px] leading-snug">
          {request.name}
        </div>
        <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
          {request.providerName} / {request.modelId}
        </div>
        <div className="text-muted-foreground/70 mt-0.5 truncate text-xs">
          {preview}
        </div>
      </div>
    </SidebarRow>
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
    duplicateTemplate,
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
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateTemplateId, setDuplicateTemplateId] = useState<string | null>(
    null,
  );
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateCollectionId, setDuplicateCollectionId] = useState('');
  const pendingRequestRef = useRef<SavedRequest | null>(null);

  const userCollections = useMemo(
    () => collections.filter((collection) => collection.kind !== 'templates'),
    [collections],
  );
  const templateCollection = useMemo(
    () =>
      collections.find(
        (collection) => collection.id === TEMPLATE_COLLECTION_ID,
      ),
    [collections],
  );
  const templateRequests = useMemo(
    () =>
      savedRequests.filter(
        (request) => request.collectionId === TEMPLATE_COLLECTION_ID,
      ),
    [savedRequests],
  );

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
    if (!request || request.isTemplate) return;
    await updateSavedRequest(request.id, request.name);
    toast('Saved request updated');
  }, [activeSavedRequestId, savedRequests, updateSavedRequest]);

  const openDuplicateDialog = useCallback(
    (template: SavedRequest) => {
      setDuplicateTemplateId(template.id);
      setDuplicateName(`${template.name} copy`);
      setDuplicateCollectionId(userCollections[0]?.id ?? '');
      setDuplicateOpen(true);
    },
    [userCollections],
  );

  const handleDuplicateTemplate = useCallback(async () => {
    if (!duplicateTemplateId || !duplicateCollectionId) return;
    await duplicateTemplate(
      duplicateTemplateId,
      duplicateCollectionId,
      duplicateName,
    );
    toast('Template duplicated into collection');
    setDuplicateOpen(false);
  }, [
    duplicateCollectionId,
    duplicateName,
    duplicateTemplateId,
    duplicateTemplate,
  ]);

  const renderCollectionSection = (collection: Collection) => {
    const requests = requestsByCollection.get(collection.id) ?? [];
    const isTemplateCollection = collection.kind === 'templates';

    return (
      <section key={collection.id} className="space-y-1">
        <div className="group flex items-center gap-1 px-1.5 py-1">
          <Folder className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground flex-1 truncate text-[11px] font-medium tracking-wide uppercase">
            {collection.name}
          </span>
          <span className="text-muted-foreground/60 text-[11px]">
            {requests.length}
          </span>
          {!isTemplateCollection && (
            <IconButton
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
              tooltip="Delete collection"
              onClick={() => deleteCollection(collection.id)}
            >
              <Trash2 className="h-3 w-3" />
            </IconButton>
          )}
        </div>
        {isTemplateCollection && (
          <p className="text-muted-foreground/70 px-2.5 pb-1 text-[11px]">
            Built-in examples. Load one or duplicate into your collections.
          </p>
        )}
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
              onDuplicate={openDuplicateDialog}
              isTemplate={Boolean(request.isTemplate)}
            />
          ))
        )}
      </section>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border flex h-11 shrink-0 items-center justify-between border-b px-3">
        {headerSlot ?? (
          <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            Collections
          </span>
        )}
        <div className="flex items-center">
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSaveOpen(true)}
            tooltip="Save current request"
          >
            <Save className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await handleCreateCollection('New collection');
            }}
            tooltip="New collection"
          >
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-2">
          {templateCollection && templateRequests.length > 0
            ? renderCollectionSection(templateCollection)
            : null}
          {userCollections.length === 0 && (
            <EmptyState
              compact
              icon={FolderOpen}
              title="No collections yet"
              description="Save requests into collections for quick reuse, or duplicate a starter template above."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveOpen(true)}
                >
                  Save current request
                </Button>
              }
            />
          )}
          {userCollections.map((collection) =>
            renderCollectionSection(collection),
          )}
        </div>
      </ScrollArea>

      <SaveRequestDialog
        open={saveOpen}
        collections={userCollections}
        activeSavedRequestId={activeSavedRequestId}
        onOpenChange={setSaveOpen}
        onCreateCollection={handleCreateCollection}
        onSaveRequest={handleSaveRequest}
        onUpdateRequest={handleUpdateRequest}
      />

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate template</DialogTitle>
            <DialogDescription>
              Copy this starter template into one of your collections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                Collection
              </label>
              <Select
                value={duplicateCollectionId || userCollections[0]?.id || ''}
                onValueChange={(value) => setDuplicateCollectionId(value ?? '')}
              >
                <SelectTrigger
                  aria-label="Select collection"
                  className="w-full"
                >
                  <SelectValue>
                    {
                      userCollections.find(
                        (collection) =>
                          collection.id ===
                          (duplicateCollectionId || userCollections[0]?.id),
                      )?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {userCollections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                Request name
              </label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDuplicateTemplate()}
              disabled={!duplicateCollectionId || !duplicateName.trim()}
            >
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}
