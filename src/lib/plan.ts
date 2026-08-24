// DebtFree - baseline comparison + payoff-order helpers.
import type { Plan } from './core';

export type DebtLike = { name: string; balance: number; apr: number; minPayment: number };

/**
 * Baseline: each debt amortized independently with its frozen minimum.
 * Returns {months, interest} or null when any leg never converges.
 */
export function naiveBaseline(debts: readonly DebtLike[]): { months: number; interest: number } | null {
  let months = 0;
  let interest = 0;
  for (const d of debts) {
    if (!(d.balance > 0)) continue;
    let bal = d.balance;
    let tot = 0;
    let n = 0;
    const r = d.apr / 1200;
    while (bal > 0 && n < 1440) {
      const i = bal * r;
      if (d.minPayment <= i) return null; // that leg never converges
      tot += i;
      bal -= d.minPayment - i;
      n++;
    }
    if (bal > 0) return null;
    months = Math.max(months, n);
    interest += tot;
  }
  return { months, interest };
}

/** Human name for a debt id ("2" -> user name or "#3"). */
export function debtLabel(debts: readonly DebtLike[], id: string): string {
  const i = Number(id);
  const d = Number.isInteger(i) ? debts[i] : undefined;
  if (d && d.name.trim()) return d.name.trim();
  return `#${i + 1}`;
}
