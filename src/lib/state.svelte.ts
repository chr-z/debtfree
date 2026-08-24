// DebtFree - global reactive state via Svelte 5 runes ($state).
// Single source of truth; persistence + simulation are derived from it.
import { simulatePayoff, portfolioSummary, type Plan, type Summary, type PayoffStrategy } from './core';
import { loadState, saveState } from './storage';
import type { CurrencyPref } from './currency';

export type Debt = { name: string; balance: number; apr: number; minPayment: number };

export type AppState = {
  debts: Debt[];
  extra: number;
  strategy: PayoffStrategy;
  currency: CurrencyPref;
};

export type CurrencyOption = {
  code: string;
  locale: string;
  label: string;
};

export const CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', locale: 'en-US', label: 'USD $' },
  { code: 'EUR', locale: 'de-DE', label: 'EUR €' },
  { code: 'GBP', locale: 'en-GB', label: 'GBP £' },
  { code: 'BRL', locale: 'pt-BR', label: 'BRL R$' },
  { code: 'JPY', locale: 'ja-JP', label: 'JPY ¥' },
  { code: 'INR', locale: 'en-IN', label: 'INR ₹' },
];

export const SAMPLE_DEBTS: Debt[] = [
  { name: 'Credit card', balance: 3200, apr: 21.9, minPayment: 95 },
  { name: 'Store card', balance: 780, apr: 27.5, minPayment: 35 },
  { name: 'Personal loan', balance: 4500, apr: 14.9, minPayment: 150 },
  { name: 'Medical bill', balance: 1200, apr: 0, minPayment: 60 },
];

function initialState(): AppState {
  const base: AppState = {
    debts: [],
    extra: 0,
    strategy: 'snowball',
    currency: { code: 'USD', locale: 'en-US' },
  };
  return Object.assign(base, loadState());
}

export const app = $state<AppState>(initialState());

export function persist(): void {
  saveState($state.snapshot(app));
}

export function parseAmount(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function hasDebt(): boolean {
  return app.debts.some((d) => d.balance > 0);
}

export function plan(): Plan | null {
  return hasDebt() ? simulatePayoff(app.debts, app.extra, app.strategy) : null;
}

export function summary(): Summary {
  return portfolioSummary(app.debts);
}
