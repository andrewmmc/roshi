import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BarChart2,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconButton } from '@/components/ui/icon-button';
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
import { NameDialog } from '@/components/collections/NameDialog';
import { ConfirmDeleteDialog } from '@/components/collections/ConfirmDeleteDialog';
import { SaveEvalRunDialog } from '@/components/eval/SaveEvalRunDialog';
import { useEvalRunsStore } from '@/stores/eval-runs-store';
import { useEvalStore } from '@/stores/eval-store';
import { useUiStore } from '@/stores/ui-store';
import { toast } from '@/stores/toast-store';
import { formatRelativeTime } from '@/utils/relative-time';
import type { EvalCollection, EvalRunRecord } from '@/types/eval';

const TRIGGER_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none';

const UNGROUPED_ID = '__ungrouped__';

function winnerLabelFor(record: EvalRunRecord): string | null {
  if (!record.judgeResult?.winnerRunnerId) return null;
  return (
    record.runners.find((r) => r.id === record.judgeResult?.winnerRunnerId)
      ?.label ?? null
  );
}

function EvalRunItem({
  record,
  collections,
  onSelect,
  onRename,
  onMove,
  onDelete,
}: {
  record: EvalRunRecord;
  collections: EvalCollection[];
  onSelect: (record: EvalRunRecord) => void;
  onRename: (record: EvalRunRecord) => void;
  onMove: (record: EvalRunRecord, collectionId: string | null) => void;
  onDelete: (record: EvalRunRecord) => void;
}) {
  const successCount = record.results.filter(
    (r) => r.status === 'success',
  ).length;
  const winnerLabel = winnerLabelFor(record);
  const displayName = record.name ?? 'Untitled eval run';
  const currentCollectionId = record.collectionId ?? null;
  const moveTargets = collections.filter(
    (collection) => collection.id !== currentCollectionId,
  );
  const canMove = moveTargets.length > 0 || currentCollectionId !== null;

  return (
    <SidebarRow
      onClick={() => onSelect(record)}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Eval run actions"
            className={TRIGGER_CLASS}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(record)}>
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
                  <DropdownMenuItem onClick={() => onMove(record, null)}>
                    <Folder className="h-3.5 w-3.5" />
                    <span className="truncate">Ungrouped</span>
                  </DropdownMenuItem>
                )}
                {moveTargets.map((collection) => (
                  <DropdownMenuItem
                    key={collection.id}
                    onClick={() => onMove(record, collection.id)}
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
              onClick={() => onDelete(record)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="min-w-0 flex-1 pr-8">
        <div className="text-foreground/85 truncate text-[13px] leading-snug font-medium">
          {displayName}
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-[11px]">
          <span>
            {record.runners.length} runner
            {record.runners.length === 1 ? '' : 's'} · {successCount} ok
          </span>
          <span>{formatRelativeTime(record.createdAt)}</span>
        </div>
        {winnerLabel && (
          <div className="text-muted-foreground text-[11px]">
            Winner: <span className="font-mono">{winnerLabel}</span>
          </div>
        )}
      </div>
    </SidebarRow>
  );
}

function EvalRunSection({
  name,
  count,
  collapsed,
  onToggle,
  actions,
  children,
}: {
  name: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <div className="group hover:bg-sidebar-accent/50 flex items-center gap-1 rounded-md px-1 py-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={!collapsed}
        >
          <ChevronRight
            className={`text-muted-foreground h-3 w-3 shrink-0 transition-transform ${
              collapsed ? '' : 'rotate-90'
            }`}
          />
          <span className="text-muted-foreground flex-1 truncate text-[11px] font-medium tracking-wide uppercase">
            {name}
          </span>
          <span className="text-muted-foreground/60 text-[11px]">{count}</span>
        </button>
        {actions}
      </div>
      {!collapsed && children}
    </section>
  );
}

type NameDialogState =
  | { mode: 'create-folder' }
  | { mode: 'rename-folder'; id: string; initialValue: string }
  | { mode: 'rename-run'; id: string; initialValue: string };

type ConfirmState =
  | { kind: 'folder'; id: string; name: string }
  | { kind: 'run'; id: string; name: string };

interface EvalRunsListProps {
  headerSlot?: ReactNode;
}

export function EvalRunsList({ headerSlot }: EvalRunsListProps) {
  const records = useEvalRunsStore((s) => s.records);
  const collections = useEvalRunsStore((s) => s.collections);
  const loaded = useEvalRunsStore((s) => s.loaded);
  const load = useEvalRunsStore((s) => s.load);
  const remove = useEvalRunsStore((s) => s.remove);
  const rename = useEvalRunsStore((s) => s.rename);
  const moveRun = useEvalRunsStore((s) => s.moveRun);
  const saveRecord = useEvalRunsStore((s) => s.save);
  const addCollection = useEvalRunsStore((s) => s.addCollection);
  const renameCollection = useEvalRunsStore((s) => s.renameCollection);
  const deleteCollection = useEvalRunsStore((s) => s.deleteCollection);
  const loadRun = useEvalStore((s) => s.loadRun);
  const buildRecord = useEvalStore((s) => s.buildRecord);
  const runners = useEvalStore((s) => s.runners);
  const isRunning = useEvalStore((s) => s.isRunning);
  const setMainView = useUiStore((s) => s.setMainView);

  const [saveOpen, setSaveOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const recordsByCollection = useMemo(() => {
    const grouped = new Map<string, EvalRunRecord[]>();
    for (const record of records) {
      const key = record.collectionId ?? UNGROUPED_ID;
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }
    return grouped;
  }, [records]);

  const ungroupedRecords = recordsByCollection.get(UNGROUPED_ID) ?? [];

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (record: EvalRunRecord) => {
      loadRun(record);
      setMainView('eval');
    },
    [loadRun, setMainView],
  );

  const handleMove = useCallback(
    async (record: EvalRunRecord, collectionId: string | null) => {
      await moveRun(record.id, collectionId);
      const target = collectionId
        ? collections.find((collection) => collection.id === collectionId)
        : null;
      toast(target ? `Moved to ${target.name}` : 'Moved to Ungrouped');
    },
    [collections, moveRun],
  );

  const handleSave = useCallback(
    async (name: string, collectionId: string | null) => {
      const record = buildRecord(name || undefined);
      await saveRecord({
        ...record,
        collectionId: collectionId ?? undefined,
      });
      toast('Saved eval run');
    },
    [buildRecord, saveRecord],
  );

  const handleCreateCollection = useCallback(
    async (name: string) => {
      const collection = await addCollection(name);
      toast('Folder created');
      return collection;
    },
    [addCollection],
  );

  const handleNameSubmit = useCallback(
    async (name: string) => {
      if (!nameDialog) return;
      if (nameDialog.mode === 'create-folder') {
        await addCollection(name);
        toast('Folder created');
      } else if (nameDialog.mode === 'rename-folder') {
        await renameCollection(nameDialog.id, name);
        toast('Folder renamed');
      } else {
        await rename(nameDialog.id, name);
        toast('Eval run renamed');
      }
    },
    [addCollection, nameDialog, rename, renameCollection],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirm) return;
    if (confirm.kind === 'folder') {
      await deleteCollection(confirm.id);
      toast('Folder deleted');
    } else {
      await remove(confirm.id);
      toast('Eval run deleted');
    }
  }, [confirm, deleteCollection, remove]);

  const saveDisabled = isRunning || runners.length === 0;
  const isEmpty = records.length === 0 && collections.length === 0;

  const nameDialogConfig = nameDialog
    ? nameDialog.mode === 'create-folder'
      ? {
          title: 'New folder',
          label: 'Folder name',
          placeholder: 'Folder name',
          initialValue: '',
          submitLabel: 'Create',
        }
      : nameDialog.mode === 'rename-folder'
        ? {
            title: 'Rename folder',
            label: 'Folder name',
            placeholder: 'Folder name',
            initialValue: nameDialog.initialValue,
            submitLabel: 'Rename',
          }
        : {
            title: 'Rename eval run',
            label: 'Run name',
            placeholder: 'Run name',
            initialValue: nameDialog.initialValue,
            submitLabel: 'Rename',
          }
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
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
            onClick={() => setNameDialog({ mode: 'create-folder' })}
            tooltip="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSaveOpen(true)}
            tooltip="Save current eval run"
            disabled={saveDisabled}
          >
            <Save className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isEmpty ? (
          <EmptyState
            compact
            icon={BarChart2}
            title="No saved runs"
            description="Compare one prompt across multiple models, then save the run here."
          />
        ) : (
          <div className="flex flex-col gap-2 p-2">
            {collections.map((collection) => {
              const folderRecords =
                recordsByCollection.get(collection.id) ?? [];
              return (
                <EvalRunSection
                  key={collection.id}
                  name={collection.name}
                  count={folderRecords.length}
                  collapsed={collapsed.has(collection.id)}
                  onToggle={() => toggleCollapse(collection.id)}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label="Folder actions"
                        className={`${TRIGGER_CLASS} opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[popup-open]:opacity-100`}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setNameDialog({
                              mode: 'rename-folder',
                              id: collection.id,
                              initialValue: collection.name,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            setConfirm({
                              kind: 'folder',
                              id: collection.id,
                              name: collection.name,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                >
                  {folderRecords.length === 0 ? (
                    <p className="text-muted-foreground/70 px-2.5 pb-1 pl-6 text-[11px]">
                      No saved runs
                    </p>
                  ) : (
                    folderRecords.map((record) => (
                      <EvalRunItem
                        key={record.id}
                        record={record}
                        collections={collections}
                        onSelect={handleSelect}
                        onRename={(target) =>
                          setNameDialog({
                            mode: 'rename-run',
                            id: target.id,
                            initialValue: target.name ?? '',
                          })
                        }
                        onMove={handleMove}
                        onDelete={(target) =>
                          setConfirm({
                            kind: 'run',
                            id: target.id,
                            name: target.name ?? 'Untitled eval run',
                          })
                        }
                      />
                    ))
                  )}
                </EvalRunSection>
              );
            })}

            {ungroupedRecords.length > 0 && (
              <EvalRunSection
                name="Ungrouped"
                count={ungroupedRecords.length}
                collapsed={collapsed.has(UNGROUPED_ID)}
                onToggle={() => toggleCollapse(UNGROUPED_ID)}
              >
                {ungroupedRecords.map((record) => (
                  <EvalRunItem
                    key={record.id}
                    record={record}
                    collections={collections}
                    onSelect={handleSelect}
                    onRename={(target) =>
                      setNameDialog({
                        mode: 'rename-run',
                        id: target.id,
                        initialValue: target.name ?? '',
                      })
                    }
                    onMove={handleMove}
                    onDelete={(target) =>
                      setConfirm({
                        kind: 'run',
                        id: target.id,
                        name: target.name ?? 'Untitled eval run',
                      })
                    }
                  />
                ))}
              </EvalRunSection>
            )}
          </div>
        )}
      </ScrollArea>

      <SaveEvalRunDialog
        open={saveOpen}
        collections={collections}
        onOpenChange={setSaveOpen}
        onSave={handleSave}
        onCreateCollection={handleCreateCollection}
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
          confirm?.kind === 'folder' ? 'Delete folder?' : 'Delete eval run?'
        }
        description={
          confirm?.kind === 'folder'
            ? `"${confirm.name}" and all of its saved runs will be permanently deleted.`
            : confirm
              ? `"${confirm.name}" will be permanently deleted.`
              : ''
        }
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
