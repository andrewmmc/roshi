import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CollectionsList } from './CollectionsList';
import { useComposerStore } from '@/stores/composer-store';
import type { Collection, SavedRequest } from '@/types/history';

const { mockCollectionState } = vi.hoisted(() => ({
  mockCollectionState: {
    collections: [] as Collection[],
    savedRequests: [] as SavedRequest[],
    addCollection: vi.fn(),
    deleteCollection: vi.fn(),
    saveCurrentRequest: vi.fn(),
    updateSavedRequest: vi.fn(),
    deleteSavedRequest: vi.fn(),
  },
}));

vi.mock('@/hooks/use-collections', () => ({
  useCollections: () => mockCollectionState,
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

describe('CollectionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionState.collections = [makeCollection()];
    mockCollectionState.savedRequests = [];
    mockCollectionState.addCollection.mockResolvedValue(makeCollection());
    mockCollectionState.saveCurrentRequest.mockResolvedValue({});
    mockCollectionState.updateSavedRequest.mockResolvedValue(undefined);
    useComposerStore.getState().resetComposer();
  });

  it('saves into the displayed default collection when the dropdown is unchanged', async () => {
    render(<CollectionsList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Save current request' }),
    );
    fireEvent.change(
      screen.getByPlaceholderText('Summarize customer support prompt'),
      {
        target: { value: 'Reusable prompt' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));

    await waitFor(() => {
      expect(mockCollectionState.saveCurrentRequest).toHaveBeenCalledWith(
        'collection-1',
        'Reusable prompt',
      );
    });
  });

  it('creates a new collection from the save dialog and selects it', async () => {
    mockCollectionState.addCollection.mockImplementation(
      async (name: string) => {
        const collection = makeCollection({
          id: 'collection-2',
          name,
          sortOrder: 1,
        });
        mockCollectionState.collections = [
          ...mockCollectionState.collections,
          collection,
        ];
        return collection;
      },
    );
    render(<CollectionsList />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Save current request' }),
    );
    fireEvent.change(screen.getByLabelText('Request name'), {
      target: { value: 'Reusable prompt' },
    });
    fireEvent.change(screen.getByLabelText('New collection name'), {
      target: { value: 'Research prompts' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create & select' }));

    await waitFor(() => {
      expect(mockCollectionState.addCollection).toHaveBeenCalledWith(
        'Research prompts',
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: 'Select collection' }),
      ).toHaveTextContent('Research prompts');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save request' }));

    await waitFor(() => {
      expect(mockCollectionState.saveCurrentRequest).toHaveBeenCalledWith(
        'collection-2',
        'Reusable prompt',
      );
    });
  });
});
