import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { EvalRunsList } from './EvalRunsList';
import { useEvalRunsStore } from '@/stores/eval-runs-store';
import { useEvalStore } from '@/stores/eval-store';
import { emptyResult } from '@/types/eval';
import type { EvalCollection, EvalRunRecord } from '@/types/eval';

// Render the base-ui dropdown menu inline so menu items are always present and
// clickable in jsdom (avoids portal / pointer-event complexity).
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    ...props
  }: {
    children: ReactNode;
    'aria-label'?: string;
  }) => <button {...props}>{children}</button>,
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

function makeCollection(overrides?: Partial<EvalCollection>): EvalCollection {
  return {
    id: 'collection-1',
    name: 'Pricing',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeRecord(overrides?: Partial<EvalRunRecord>): EvalRunRecord {
  return {
    id: 'rec-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    request: {
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      topP: 1,
      topK: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: true,
      customHeaders: [],
    },
    runners: [
      {
        id: 'r1',
        providerId: 'p1',
        providerName: 'P',
        modelId: 'm1',
        label: 'P / m1',
      },
    ],
    results: [{ ...emptyResult('r1'), status: 'success', content: 'ok' }],
    judgeConfig: { enabled: false, runner: null, rubric: '' },
    judgeResult: null,
    ...overrides,
  };
}

describe('EvalRunsList', () => {
  beforeEach(() => {
    useEvalRunsStore.setState({
      records: [],
      collections: [],
      loaded: true,
    });
    useEvalStore.setState({
      runners: [
        {
          id: 'r1',
          providerId: 'p1',
          providerName: 'P',
          modelId: 'm1',
          label: 'P / m1',
        },
      ],
      isRunning: false,
    });
  });

  it('shows an empty state when there are no runs or folders', () => {
    render(<EvalRunsList />);

    expect(screen.getByText('No saved runs')).toBeInTheDocument();
  });

  it('renders folders with their runs and an ungrouped section', () => {
    useEvalRunsStore.setState({
      collections: [makeCollection()],
      records: [
        makeRecord({
          id: 'rec-folder',
          name: 'Pricing run',
          collectionId: 'collection-1',
        }),
        makeRecord({
          id: 'rec-loose',
          name: 'Loose run',
          collectionId: undefined,
        }),
      ],
    });

    render(<EvalRunsList />);

    const [folderSection, ungroupedSection] =
      document.querySelectorAll('section');
    expect(
      within(folderSection as HTMLElement).getByText('Pricing'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pricing run')).toBeInTheDocument();
    expect(
      within(ungroupedSection as HTMLElement).getByText('Ungrouped'),
    ).toBeInTheDocument();
    expect(screen.getByText('Loose run')).toBeInTheDocument();
  });

  it('disables Move to when a run is ungrouped and there are no other folders', () => {
    useEvalRunsStore.setState({
      records: [makeRecord({ id: 'rec-loose', name: 'Loose run' })],
    });

    render(<EvalRunsList />);

    fireEvent.click(screen.getByRole('button', { name: 'Eval run actions' }));

    expect(screen.getByRole('button', { name: /move to/i })).toBeDisabled();
  });

  it('enables Move to when the run is already in a folder', () => {
    useEvalRunsStore.setState({
      collections: [makeCollection()],
      records: [
        makeRecord({
          id: 'rec-folder',
          name: 'Pricing run',
          collectionId: 'collection-1',
        }),
      ],
    });

    render(<EvalRunsList />);

    fireEvent.click(screen.getByRole('button', { name: 'Eval run actions' }));

    expect(screen.getByRole('button', { name: /move to/i })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Ungrouped' }),
    ).toBeInTheDocument();
  });

  it('moves a run to another folder from the actions menu', async () => {
    const moveRun = vi.spyOn(useEvalRunsStore.getState(), 'moveRun');
    useEvalRunsStore.setState({
      collections: [
        makeCollection({ id: 'collection-1', name: 'Pricing' }),
        makeCollection({ id: 'collection-2', name: 'Latency', sortOrder: 1 }),
      ],
      records: [
        makeRecord({
          id: 'rec-folder',
          name: 'Pricing run',
          collectionId: 'collection-1',
        }),
      ],
    });

    render(<EvalRunsList />);

    fireEvent.click(screen.getByRole('button', { name: 'Eval run actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Latency' }));

    await waitFor(() => {
      expect(moveRun).toHaveBeenCalledWith('rec-folder', 'collection-2');
    });
  });

  it('shows an empty folder message when a folder has no runs', () => {
    useEvalRunsStore.setState({
      collections: [makeCollection({ name: 'Empty folder' })],
    });

    render(<EvalRunsList />);

    const section = screen.getByText('Empty folder').closest('section');
    expect(section).not.toBeNull();
    expect(within(section!).getByText('No saved runs')).toBeInTheDocument();
  });
});
