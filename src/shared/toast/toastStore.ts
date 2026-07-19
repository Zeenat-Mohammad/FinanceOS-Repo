import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
};

type ToastStore = {
  toasts: ToastItem[];
  push: (input: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  dismiss: (id: string) => void;
};

const AUTO_DISMISS_MS = 4500;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (input) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...input, id, createdAt: Date.now() }].slice(-4)
    }));
    window.setTimeout(() => {
      if (get().toasts.some((toast) => toast.id === id)) {
        get().dismiss(id);
      }
    }, AUTO_DISMISS_MS);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));

export function toast(title: string, options?: { description?: string; variant?: ToastVariant }) {
  return useToastStore.getState().push({
    title,
    description: options?.description,
    variant: options?.variant ?? 'default'
  });
}
