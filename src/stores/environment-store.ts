import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { AppError } from '@/lib/errors';
import {
  loadSetting,
  persistSetting,
  removeById,
  replaceById,
} from '@/stores/store-helpers';
import type { Environment, EnvironmentVariable } from '@/types/history';

const ENVIRONMENT_SELECTION_KEY = 'environment-selection';

interface EnvironmentStore {
  environments: Environment[];
  selectedEnvironmentId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  addEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (
    id: string,
    updates: Pick<Environment, 'name' | 'variables'>,
  ) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  selectEnvironment: (id: string | null) => void;
  getSelectedEnvironment: () => Environment | null;
}

function sortEnvironments(environments: Environment[]): Environment[] {
  return [...environments].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeVariables(
  variables: readonly Pick<EnvironmentVariable, 'id' | 'key' | 'value'>[],
): EnvironmentVariable[] {
  return variables
    .map((variable) => ({
      id: variable.id || nanoid(),
      key: variable.key.trim(),
      value: variable.value,
    }))
    .filter((variable) => variable.key);
}

async function saveSelection(id: string | null) {
  await persistSetting(ENVIRONMENT_SELECTION_KEY, id);
}

async function loadSelection(): Promise<string | null> {
  const value = await loadSetting<string | null>(ENVIRONMENT_SELECTION_KEY);
  return typeof value === 'string' ? value : null;
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  selectedEnvironmentId: null,
  loaded: false,

  load: async () => {
    if (get().loaded) return;

    const [environments, savedSelection] = await Promise.all([
      db.environments.toArray(),
      loadSelection(),
    ]);
    const selectedEnvironmentId = environments.some(
      (environment) => environment.id === savedSelection,
    )
      ? savedSelection
      : null;

    if (selectedEnvironmentId !== savedSelection) {
      await saveSelection(selectedEnvironmentId);
    }

    set({
      environments: sortEnvironments(environments),
      selectedEnvironmentId,
      loaded: true,
    });
  },

  addEnvironment: async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('ENVIRONMENT_NAME_REQUIRED');

    const now = new Date();
    const environment: Environment = {
      id: nanoid(),
      name: trimmedName,
      variables: [],
      createdAt: now,
      updatedAt: now,
    };

    const shouldSelect = get().selectedEnvironmentId === null;
    const prevEnvironments = get().environments;
    const prevSelectedEnvironmentId = get().selectedEnvironmentId;
    try {
      await db.environments.add(environment);
      set((state) => ({
        environments: sortEnvironments([...state.environments, environment]),
        selectedEnvironmentId: shouldSelect
          ? environment.id
          : state.selectedEnvironmentId,
      }));

      if (shouldSelect) {
        await saveSelection(environment.id);
      }

      return environment;
    } catch (error) {
      set({
        environments: prevEnvironments,
        selectedEnvironmentId: prevSelectedEnvironmentId,
      });
      throw error;
    }
  },

  updateEnvironment: async (id, updates) => {
    const name = updates.name.trim();
    if (!name) throw new AppError('ENVIRONMENT_NAME_REQUIRED');

    const nextUpdates = {
      name,
      variables: normalizeVariables(updates.variables),
      updatedAt: new Date(),
    };

    const prevEnvironments = get().environments;
    try {
      await db.environments.update(id, nextUpdates);
      set((state) => ({
        environments: sortEnvironments(
          replaceById(state.environments, id, (environment) => ({
            ...environment,
            ...nextUpdates,
          })),
        ),
      }));
    } catch (error) {
      set({ environments: prevEnvironments });
      throw error;
    }
  },

  deleteEnvironment: async (id) => {
    const prevEnvironments = get().environments;
    const prevSelectedEnvironmentId = get().selectedEnvironmentId;
    try {
      await db.environments.delete(id);

      let nextSelection: string | null = null;
      set((state) => {
        const environments = removeById(state.environments, id);
        nextSelection =
          state.selectedEnvironmentId === id
            ? (environments[0]?.id ?? null)
            : state.selectedEnvironmentId;
        return {
          environments,
          selectedEnvironmentId: nextSelection,
        };
      });

      await saveSelection(nextSelection);
    } catch (error) {
      set({
        environments: prevEnvironments,
        selectedEnvironmentId: prevSelectedEnvironmentId,
      });
      throw error;
    }
  },

  selectEnvironment: (id) => {
    const nextId = id || null;
    set({ selectedEnvironmentId: nextId });
    void saveSelection(nextId);
  },

  getSelectedEnvironment: () => {
    const { environments, selectedEnvironmentId } = get();
    return (
      environments.find(
        (environment) => environment.id === selectedEnvironmentId,
      ) ?? null
    );
  },
}));

export const useSelectedEnvironment = () =>
  useEnvironmentStore(
    (state) =>
      state.environments.find(
        (environment) => environment.id === state.selectedEnvironmentId,
      ) ?? null,
  );
