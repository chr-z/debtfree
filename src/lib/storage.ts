// DebtFree - localStorage persistence (safe against private-mode failures).
export const STORE_KEY = 'df_state_v1';

/** Minimal structural type to avoid importing the Svelte rune module from plain TS. */
export type StoredState = {
  debts: unknown[];
  extra?: number;
  strategy?: string;
  currency?: { code: string; locale: string };
};

export function loadState(): StoredState | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object' && Array.isArray((saved as StoredState).debts)) {
      return saved as StoredState;
    }
  } catch {
    /* fresh start */
  }
  return null;
}

export function saveState(state: unknown): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota/private-mode errors */
  }
}
