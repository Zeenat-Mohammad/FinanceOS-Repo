import { create } from 'zustand';

type CurrencyUiState = {
  converting: boolean;
  message: string;
  start: (message?: string) => void;
  setMessage: (message: string) => void;
  stop: () => void;
};

export const useCurrencyUiStore = create<CurrencyUiState>((set) => ({
  converting: false,
  message: 'Updating currency…',
  start: (message = 'Converting amounts to your selected currency…') => set({ converting: true, message }),
  setMessage: (message) => set({ message }),
  stop: () => set({ converting: false })
}));
