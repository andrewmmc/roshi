import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface Toast {
  id: string;
  message: string;
  duration: number;
}

const DEFAULT_DURATION = 2000;

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, duration = DEFAULT_DURATION) => {
    const id = nanoid(8);
    set((s) => ({ toasts: [...s.toasts, { id, message, duration }] }));
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, duration?: number) {
  useToastStore.getState().addToast(message, duration);
}
