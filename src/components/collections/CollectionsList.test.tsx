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
import { useResponseStore } from '@/stores/response-store';
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

vi.mock('@/components/ui/select', async () => {
  const mocks = await import('@/__tests__/mock-select');
  return mocks;
});

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
  DropdownMenuSubTrigger: ({
    children,
    disabled,
  }: {
    children: ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
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
    useResponseStore.getState().resetResponse();
    useResponseStore.setState({
      sentRequest: {
        messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
        model: 'gpt-4',
        stream: true,
        temperature: 1,
        maxTokens: 4096,
      },
    });
  });

  function openSaveDialog() {
    fireEvent.click(
      screen.getByRole('button', { name: 'Save current request' }),
    );
  }

  it('disables save when no prompt has been sent', () => {
    useResponseStore.setState({ sentRequest: null });
    render(<CollectionsList />);

    expect(
      screen.getByRole('button', { name: 'Save current request' }),
    ).toBeDisabled();
  });

  it('disables save while a request is in flight', () => {
    useResponseStore.setState({ isLoading: true });
    render(<CollectionsList />);

    expect(
      screen.getByRole('button', { name: 'Save current request' }),
    ).toBeDisabled();
  });

  it('enables save when editing an active saved request without sending', () => {
    useResponseStore.setState({ sentRequest: null });
    useComposerStore
      .getState()
      .setSavedRequestContext('collection-1', 'saved-1');
    render(<CollectionsList />);

    expect(
      screen.getByRole('button', { name: 'Save current request' }),
    ).toBeEnabled();
  });

  it('saves to ungrouped by default when the dropdown is unchanged', async () => {
    render(<CollectionsList />);

    openSaveDialog();
    fireEvent.change(
      screen.getByPlaceholderText('Summarize customer support prompt'),
      { target: { value: 'Reusable prompt' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));

    await waitFor(() => {
      expect(mockCollectionState.saveCurrentRequest).toHaveBeenCalledWith(
        null,
        'Reusable prompt',
      );
    });
  });

  it('saves into a selected collection', async () => {
    render(<CollectionsList />);

    openSaveDialog();
    fireEvent.change(screen.getByLabelText('Select collection'), {
      target: { value: 'collection-1' },
    });
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

  it('saves to ungrouped when there are no collections', async () => {
    mockCollectionState.collections = [];
    render(<CollectionsList />);

    openSaveDialog();
    fireEvent.change(
      screen.getByPlaceholderText('Summarize customer support prompt'),
      { target: { value: 'Reusable prompt' } },
    );

    expect(screen.getByLabelText('Select collection')).toHaveTextContent(
      'Ungrouped',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));

    await waitFor(() => {
      expect(mockCollectionState.saveCurrentRequest).toHaveBeenCalledWith(
        null,
        'Reusable prompt',
      );
    });
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

  it('creates a collection from the new folder button in the header', async () => {
    render(<CollectionsList />);

    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Folder name'), {
      target: { value: 'Prompts' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockCollectionState.addCollection).toHaveBeenCalledWith('Prompts');
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Saved request actions' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));

    await waitFor(() => {
      expect(mockCollectionState.moveSavedRequest).toHaveBeenCalledWith(
        'saved-1',
        'collection-2',
      );
    });
  });

  it('disables Move to when a request is ungrouped and there are no other folders', () => {
    mockCollectionState.collections = [];
    mockCollectionState.savedRequests = [
      makeSavedRequest({
        id: 'saved-1',
        name: 'Loose request',
        collectionId: undefined,
      }),
    ];
    render(<CollectionsList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Saved request actions' }),
    );

    expect(screen.getByRole('button', { name: /move to/i })).toBeDisabled();
  });

  it('enables Move to when the request is already in a folder', () => {
    mockCollectionState.collections = [makeCollection()];
    mockCollectionState.savedRequests = [
      makeSavedRequest({
        id: 'saved-1',
        name: 'Folder request',
        collectionId: 'collection-1',
      }),
    ];
    render(<CollectionsList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Saved request actions' }),
    );

    expect(screen.getByRole('button', { name: /move to/i })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Ungrouped' }),
    ).toBeInTheDocument();
  });

  it('renders folders with their requests and an ungrouped section', () => {
    mockCollectionState.collections = [makeCollection()];
    mockCollectionState.savedRequests = [
      makeSavedRequest({
        id: 'saved-folder',
        name: 'Folder request',
        collectionId: 'collection-1',
      }),
      makeSavedRequest({
        id: 'saved-loose',
        name: 'Loose request',
        collectionId: undefined,
      }),
    ];
    render(<CollectionsList />);

    const [folderSection, ungroupedSection] =
      document.querySelectorAll('section');
    expect(
      within(folderSection as HTMLElement).getByText('My Collection'),
    ).toBeInTheDocument();
    expect(screen.getByText('Folder request')).toBeInTheDocument();
    expect(
      within(ungroupedSection as HTMLElement).getByText('Ungrouped'),
    ).toBeInTheDocument();
    expect(screen.getByText('Loose request')).toBeInTheDocument();
  });

  it('moves a saved request to ungrouped from the actions menu', async () => {
    mockCollectionState.collections = [makeCollection()];
    mockCollectionState.savedRequests = [
      makeSavedRequest({
        id: 'saved-1',
        name: 'Folder request',
        collectionId: 'collection-1',
      }),
    ];
    render(<CollectionsList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Saved request actions' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ungrouped' }));

    await waitFor(() => {
      expect(mockCollectionState.moveSavedRequest).toHaveBeenCalledWith(
        'saved-1',
        null,
      );
    });
  });
});
