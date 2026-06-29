import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { CollectionsList } from './CollectionsList';
import { useComposerStore } from '@/stores/composer-store';
import type { Collection, SavedRequest } from '@/types/history';

const { mockCollectionState } = vi.hoisted(() => ({
  mockCollectionState: {
    collections: [] as Collection[],
    savedRequests: [] as SavedRequest[],
    addCollection: vi.fn(),
    renameCollection: vi.fn(),
    deleteCollection: vi.fn(),
    saveCurrentRequest: vi.fn(),
    updateSavedRequest: vi.fn(),
    renameSavedRequest: vi.fn(),
    moveSavedRequest: vi.fn(),
    deleteSavedRequest: vi.fn(),
  },
}));

vi.mock('@/hooks/use-collections', () => ({
  useCollections: () => mockCollectionState,
}));

// Render the base-ui dropdown menu inline so menu items are always present and
// clickable in jsdom (avoids portal / pointer-event complexity).
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children, ...props }: { children: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

function makeCollection(overrides?: Partial<Collection>): Collection {
  return {
    id: 'collection-1',
    name: 'My Collection',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeSavedRequest(overrides?: Partial<SavedRequest>): SavedRequest {
  return {
    id: 'saved-1',
    collectionId: 'collection-1',
    name: 'Saved Request',
    providerId: 'provider-1',
    providerName: 'TestProvider',
    modelId: 'gpt-4',
    request: {
      messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: false,
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('CollectionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionState.collections = [makeCollection()];
    mockCollectionState.savedRequests = [];
    mockCollectionState.addCollection.mockResolvedValue(
      makeCollection({ id: 'collection-2', name: 'Prompts' }),
    );
    mockCollectionState.renameCollection.mockResolvedValue(undefined);
    mockCollectionState.deleteCollection.mockResolvedValue(undefined);
    mockCollectionState.saveCurrentRequest.mockResolvedValue({});
    mockCollectionState.updateSavedRequest.mockResolvedValue(undefined);
    mockCollectionState.renameSavedRequest.mockResolvedValue(undefined);
    mockCollectionState.moveSavedRequest.mockResolvedValue(undefined);
    mockCollectionState.deleteSavedRequest.mockResolvedValue(undefined);
    useComposerStore.getState().resetComposer();
  });

  function openSaveDialog() {
    fireEvent.click(
      screen.getByRole('button', { name: 'Save current request' }),
    );
  }

  it('saves into the displayed default collection when the dropdown is unchanged', async () => {
    render(<CollectionsList />);

    openSaveDialog();
    fireEvent.change(
      screen.getByPlaceholderText('Summarize customer support prompt'),
      { target: { value: 'Reusable prompt' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));

    await waitFor(() => {
      expect(mockCollectionState.saveCurrentRequest).toHaveBeenCalledWith(
        'collection-1',
        'Reusable prompt',
      );
    });
  });

  it('creates a collection inline from the save dialog', async () => {
    render(<CollectionsList />);

    openSaveDialog();
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    fireEvent.change(screen.getByLabelText('New collection name'), {
      target: { value: 'Prompts' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));

    await waitFor(() => {
      expect(mockCollectionState.addCollection).toHaveBeenCalledWith('Prompts');
    });
  });

  it('starts in inline-create mode when there are no collections', () => {
    mockCollectionState.collections = [];
    render(<CollectionsList />);

    openSaveDialog();

    expect(screen.getByLabelText('New collection name')).toBeInTheDocument();
  });

  it('shows Update and Save as new when editing an existing saved request', async () => {
    mockCollectionState.savedRequests = [
      makeSavedRequest({ id: 'saved-1', name: 'Existing' }),
    ];
    useComposerStore
      .getState()
      .setSavedRequestContext('collection-1', 'saved-1');
    render(<CollectionsList />);

    openSaveDialog();

    expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(mockCollectionState.updateSavedRequest).toHaveBeenCalledWith(
        'saved-1',
        'Existing',
      );
    });
  });

  it('creates a named collection from the sidebar header button', async () => {
    render(<CollectionsList />);

    fireEvent.click(screen.getByRole('button', { name: 'New collection' }));
    fireEvent.change(screen.getByLabelText('Collection name'), {
      target: { value: 'Team prompts' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockCollectionState.addCollection).toHaveBeenCalledWith(
        'Team prompts',
      );
    });
  });

  it('confirms before deleting a collection', async () => {
    render(<CollectionsList />);

    // Collection actions menu is first in DOM order.
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/all of its saved requests/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockCollectionState.deleteCollection).toHaveBeenCalledWith(
        'collection-1',
      );
    });
  });

  it('renames a saved request through its actions menu', async () => {
    mockCollectionState.savedRequests = [
      makeSavedRequest({ id: 'saved-1', name: 'Old name' }),
    ];
    render(<CollectionsList />);

    // [0] is the collection rename, [1] is the saved request rename.
    fireEvent.click(screen.getAllByRole('button', { name: 'Rename' })[1]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Request name'), {
      target: { value: 'New name' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rename' }));

    await waitFor(() => {
      expect(mockCollectionState.renameSavedRequest).toHaveBeenCalledWith(
        'saved-1',
        'New name',
      );
    });
  });

  it('moves a saved request into another collection', async () => {
    mockCollectionState.collections = [
      makeCollection({ id: 'collection-1', name: 'My Collection' }),
      makeCollection({ id: 'collection-2', name: 'Other', sortOrder: 1 }),
    ];
    mockCollectionState.savedRequests = [
      makeSavedRequest({ id: 'saved-1', collectionId: 'collection-1' }),
    ];
    render(<CollectionsList />);

    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    await waitFor(() => {
      expect(mockCollectionState.moveSavedRequest).toHaveBeenCalledWith(
        'saved-1',
        'collection-2',
      );
    });
  });
});
