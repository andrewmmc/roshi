import { useMemo, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarRow } from '@/components/ui/sidebar-row';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDiscardDialog } from '@/components/ui/confirm-discard-dialog';
import { ConfirmDeleteDialog } from '@/components/collections/ConfirmDeleteDialog';
import { NameDialog } from '@/components/collections/NameDialog';
import { SaveRequestDialog } from '@/components/collections/SaveRequestDialog';
import { toast } from '@/stores/toast-store';
import { useCollections } from '@/hooks/use-collections';
import {
  useComposerStore,
  selectHasUnsavedChanges,
} from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { useResponseStore } from '@/stores/response-store';
import type { SavedRequest, Collection } from '@/types/history';

const TRIGGER_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

const UNGROUPED_ID = '__ungrouped__';

function SavedRequestItem({
  request,
  active,
  collections,
  onSelect,
  onRename,
  onMove,
  onDelete,
}: {
  request: SavedRequest;
  active: boolean;
  collections: Collection[];
  onSelect: (request: SavedRequest) => void;
  onRename: (request: SavedRequest) => void;
  onMove: (request: SavedRequest, collectionId: string | null) => void;
  onDelete: (request: SavedRequest) => void;
}) {
  const preview =
    request.request.messages.find((message) => message.role === 'user')
      ?.content ||
    request.request.systemPrompt ||
    'No prompt text';
  const currentCollectionId = request.collectionId ?? null;
  const moveTargets = collections.filter(
    (collection) => collection.id !== currentCollectionId,
  );
  const canMove = moveTargets.length > 0 || currentCollectionId !== null;

  return (
    <SidebarRow
      active={active}
      onClick={() => onSelect(request)}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Saved request actions"
            className={TRIGGER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(request)}>
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canMove}>
                <FolderOpen className="h-3.5 w-3.5" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {currentCollectionId !== null && (
                  <DropdownMenuItem onClick={() => onMove(request, null)}>
                    <Folder className="h-3.5 w-3.5" />
                    <span className="truncate">Ungrouped</span>
                  </DropdownMenuItem>
                )}
                {moveTargets.map((collection) => (
                  <DropdownMenuItem
                    key={collection.id}
                    onClick={() => onMove(request, collection.id)}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span className="truncate">{collection.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(request)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

function CollectionSection({
  collection,
  requests,
  collapsed,
  activeSavedRequestId,
  collections,
  onToggle,
  onRenameCollection,
  onDeleteCollection,
  onSelectRequest,
  onRenameRequest,
  onMoveRequest,
  onDeleteRequest,
}: {
  collection: Collection;
  requests: SavedRequest[];
  collapsed: boolean;
  activeSavedRequestId: string | null;
  collections: Collection[];
  onToggle: (id: string) => void;
  onRenameCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
  onSelectRequest: (request: SavedRequest) => void;
  onRenameRequest: (request: SavedRequest) => void;
  onMoveRequest: (request: SavedRequest, collectionId: string | null) => void;
  onDeleteRequest: (request: SavedRequest) => void;
}) {
  return (
    <section className="space-y-1">
      <div className="group hover:bg-sidebar-accent/50 flex items-center gap-1 rounded-md px-1 py-1">
        <button
          type="button"
          onClick={() => onToggle(collection.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={!collapsed}
        >
          <ChevronRight
            className={`text-muted-foreground h-3 w-3 shrink-0 transition-transform ${
              collapsed ? '' : 'rotate-90'
            }`}
          />
          <span className="text-muted-foreground flex-1 truncate text-[11px] font-medium tracking-wide uppercase">
            {collection.name}
          </span>
          <span className="text-muted-foreground/60 text-[11px]">
            {requests.length}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Collection actions"
            className={`${TRIGGER_CLASS} opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[popup-open]:opacity-100`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRenameCollection(collection)}>
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeleteCollection(collection)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!collapsed &&
        (requests.length === 0 ? (
          <p className="text-muted-foreground/70 px-2.5 pb-1 pl-6 text-[11px]">
            No saved requests
          </p>
        ) : (
          requests.map((request) => (
            <SavedRequestItem
              key={request.id}
              request={request}
              active={request.id === activeSavedRequestId}
              collections={collections}
              onSelect={onSelectRequest}
              onRename={onRenameRequest}
              onMove={onMoveRequest}
              onDelete={onDeleteRequest}
            />
          ))
        ))}
    </section>
  );
}

type NameDialogState =
  | { mode: 'create-collection' }
  | { mode: 'rename-collection'; id: string; initialValue: string }
  | { mode: 'rename-request'; id: string; initialValue: string };

type ConfirmState =
  | { kind: 'collection'; id: string; name: string }
  | { kind: 'request'; id: string; name: string };

export function CollectionsList({ headerSlot }: { headerSlot?: ReactNode }) {
  const {
    collections,
    savedRequests,
    addCollection,
    renameCollection,
    deleteCollection,
    saveCurrentRequest,
    updateSavedRequest,
    renameSavedRequest,
    moveSavedRequest,
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
  const isLoading = useResponseStore((s) => s.isLoading);
  const sentRequest = useResponseStore((s) => s.sentRequest);
  const selectProvider = useProviderStore((s) => s.selectProvider);
  const selectModel = useProviderStore((s) => s.selectModel);
  const resetResponse = useResponseStore((s) => s.resetResponse);
  const [saveOpen, setSaveOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const pendingRequestRef = useRef<SavedRequest | null>(null);

  const userCollections = useMemo(
    () => collections.filter((collection) => collection.kind !== 'templates'),
    [collections],
  );

  const activeSavedRequest = useMemo(
    () =>
      savedRequests.find((request) => request.id === activeSavedRequestId) ??
      null,
    [savedRequests, activeSavedRequestId],
  );

  const requestsByCollection = useMemo(() => {
    const grouped = new Map<string, SavedRequest[]>();
    for (const request of savedRequests.filter((item) => !item.isTemplate)) {
      const key = request.collectionId ?? UNGROUPED_ID;
      grouped.set(key, [...(grouped.get(key) ?? []), request]);
    }
    return grouped;
  }, [savedRequests]);

  const ungroupedRequests = requestsByCollection.get(UNGROUPED_ID) ?? [];
  const visibleRequestCount = savedRequests.filter(
    (request) => !request.isTemplate,
  ).length;
  const isEmpty = visibleRequestCount === 0 && userCollections.length === 0;

  const applySavedRequest = useCallback(
    (request: SavedRequest) => {
      selectProvider(request.providerId);
      selectModel(request.modelId);
      loadComposerFromHistory(request.request);
      setSavedRequestContext(request.collectionId ?? null, request.id);
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

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreateCollection = useCallback(
    async (name: string) => {
      const collection = await addCollection(name);
      toast('Collection created');
      return collection;
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

  const handleUpdateRequest = useCallback(
    async (name: string) => {
      if (!activeSavedRequestId) return;
      await updateSavedRequest(activeSavedRequestId, name);
      toast('Saved request updated');
    },
    [activeSavedRequestId, updateSavedRequest],
  );

  const handleMoveRequest = useCallback(
    async (request: SavedRequest, collectionId: string | null) => {
      await moveSavedRequest(request.id, collectionId);
      const target = collectionId
        ? collections.find((collection) => collection.id === collectionId)
        : null;
      toast(target ? `Moved to ${target.name}` : 'Moved to Ungrouped');
    },
    [collections, moveSavedRequest],
  );

  const handleNameSubmit = useCallback(
    async (name: string) => {
      if (!nameDialog) return;
      if (nameDialog.mode === 'create-collection') {
        await handleCreateCollection(name);
      } else if (nameDialog.mode === 'rename-collection') {
        await renameCollection(nameDialog.id, name);
        toast('Collection renamed');
      } else {
        await renameSavedRequest(nameDialog.id, name);
        toast('Request renamed');
      }
    },
    [handleCreateCollection, nameDialog, renameCollection, renameSavedRequest],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirm) return;
    if (confirm.kind === 'collection') {
      await deleteCollection(confirm.id);
      toast('Collection deleted');
    } else {
      await deleteSavedRequest(confirm.id);
      toast('Request deleted');
    }
  }, [confirm, deleteCollection, deleteSavedRequest]);

  const nameDialogConfig = nameDialog
    ? nameDialog.mode === 'create-collection'
      ? {
          title: 'New folder',
          label: 'Folder name',
          placeholder: 'Folder name',
          initialValue: '',
          submitLabel: 'Create',
        }
      : nameDialog.mode === 'rename-collection'
        ? {
            title: 'Rename collection',
            label: 'Collection name',
            placeholder: 'Collection name',
            initialValue: nameDialog.initialValue,
            submitLabel: 'Rename',
          }
        : {
            title: 'Rename request',
            label: 'Request name',
            placeholder: 'Request name',
            initialValue: nameDialog.initialValue,
            submitLabel: 'Rename',
          }
    : null;

  const saveDisabled =
    isLoading || (sentRequest === null && activeSavedRequestId === null);

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
            onClick={() => setNameDialog({ mode: 'create-collection' })}
            tooltip="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSaveOpen(true)}
            tooltip="Save current request"
            disabled={saveDisabled}
          >
            <Save className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isEmpty ? (
          <EmptyState
            compact
            icon={FolderOpen}
            title="No collections yet"
            description="Use Save current request to store a prompt and create your first collection."
          />
        ) : (
          <div className="flex flex-col gap-2 p-2">
            {userCollections.map((collection) => (
              <CollectionSection
                key={collection.id}
                collection={collection}
                requests={requestsByCollection.get(collection.id) ?? []}
                collapsed={collapsed.has(collection.id)}
                activeSavedRequestId={activeSavedRequestId}
                collections={userCollections}
                onToggle={toggleCollapse}
                onRenameCollection={(target) =>
                  setNameDialog({
                    mode: 'rename-collection',
                    id: target.id,
                    initialValue: target.name,
                  })
                }
                onDeleteCollection={(target) =>
                  setConfirm({
                    kind: 'collection',
                    id: target.id,
                    name: target.name,
                  })
                }
                onSelectRequest={handleSelect}
                onRenameRequest={(request) =>
                  setNameDialog({
                    mode: 'rename-request',
                    id: request.id,
                    initialValue: request.name,
                  })
                }
                onMoveRequest={handleMoveRequest}
                onDeleteRequest={(request) =>
                  setConfirm({
                    kind: 'request',
                    id: request.id,
                    name: request.name,
                  })
                }
              />
            ))}

            {ungroupedRequests.length > 0 && (
              <section className="space-y-1">
                <div className="group hover:bg-sidebar-accent/50 flex items-center gap-1 rounded-md px-1 py-1">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(UNGROUPED_ID)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    aria-expanded={!collapsed.has(UNGROUPED_ID)}
                  >
                    <ChevronRight
                      className={`text-muted-foreground h-3 w-3 shrink-0 transition-transform ${
                        collapsed.has(UNGROUPED_ID) ? '' : 'rotate-90'
                      }`}
                    />
                    <span className="text-muted-foreground flex-1 truncate text-[11px] font-medium tracking-wide uppercase">
                      Ungrouped
                    </span>
                    <span className="text-muted-foreground/60 text-[11px]">
                      {ungroupedRequests.length}
                    </span>
                  </button>
                </div>
                {!collapsed.has(UNGROUPED_ID) &&
                  ungroupedRequests.map((request) => (
                    <SavedRequestItem
                      key={request.id}
                      request={request}
                      active={request.id === activeSavedRequestId}
                      collections={userCollections}
                      onSelect={handleSelect}
                      onRename={(target) =>
                        setNameDialog({
                          mode: 'rename-request',
                          id: target.id,
                          initialValue: target.name,
                        })
                      }
                      onMove={handleMoveRequest}
                      onDelete={(target) =>
                        setConfirm({
                          kind: 'request',
                          id: target.id,
                          name: target.name,
                        })
                      }
                    />
                  ))}
              </section>
            )}
          </div>
        )}
      </ScrollArea>

      <SaveRequestDialog
        open={saveOpen}
        collections={userCollections}
        activeSavedRequest={activeSavedRequest}
        onOpenChange={setSaveOpen}
        onSaveRequest={handleSaveRequest}
        onUpdateRequest={handleUpdateRequest}
      />

      {nameDialogConfig && (
        <NameDialog
          open={nameDialog !== null}
          title={nameDialogConfig.title}
          label={nameDialogConfig.label}
          placeholder={nameDialogConfig.placeholder}
          initialValue={nameDialogConfig.initialValue}
          submitLabel={nameDialogConfig.submitLabel}
          onOpenChange={(open) => {
            if (!open) setNameDialog(null);
          }}
          onSubmit={handleNameSubmit}
        />
      )}

      <ConfirmDeleteDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'collection'
            ? 'Delete collection?'
            : 'Delete saved request?'
        }
        description={
          confirm?.kind === 'collection'
            ? `"${confirm.name}" and all of its saved requests will be permanently deleted.`
            : confirm
              ? `"${confirm.name}" will be permanently deleted.`
              : ''
        }
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={handleDiscardConfirm}
      />
    </div>
  );
}
