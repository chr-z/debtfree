// DebtFree - currency formatting + baseline/order helper tests.
import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../src/lib/currency';
import { naiveBaseline, debtLabel } from '../src/lib/plan';
import type { DebtLike } from '../src/lib/plan';

describe('formatCurrency', () => {
  it('formats with Intl for the given code/locale', () => {
    expect(formatCurrency(1234.5, { code: 'USD', locale: 'en-US' })).toMatch(/1,234\.50/);
    expect(formatCurrency(1234.5, { code: 'BRL', locale: 'pt-BR' })).toContain('1.234,50');
  });

  it('falls back gracefully on bad input and unknown locales', () => {
    expect(formatCurrency(NaN)).toContain('0.00');
    expect(formatCurrency(5, { code: 'USD', locale: 'xx-XX' })).toBeTruthy();
  });
});

describe('naiveBaseline', () => {
  it('frozen minimums take longer than roll-down', () => {
    const debts: DebtLike[] = [
      { name: 'a', balance: 1000, apr: 12, minPayment: 100 },
      { name: 'b', balance: 300, apr: 0, minPayment: 50 },
    ];
    const naive = naiveBaseline(debts);
    expect(naive).not.toBeNull();
    expect(naive!.months).toBeGreaterThan(9); // roll-down plan dies in 9 months
  });

  it('returns null when a leg never converges', () => {
    const debts: DebtLike[] = [{ name: 'x', balance: 100000, apr: 120, minPayment: 50 }];
    expect(naiveBaseline(debts)).toBeNull();
  });

  it('ignores zero balances', () => {
    const debts: DebtLike[] = [
      { name: 'paid', balance: 0, apr: 30, minPayment: 25 },
      { name: 'live', balance: 100, apr: 0, minPayment: 100 },
    ];
    expect(naiveBaseline(debts)).toEqual({ months: 1, interest: 0 });
  });
});

describe('debtLabel', () => {
  const debts: DebtLike[] = [
    { name: 'Card', balance: 1, apr: 1, minPayment: 1 },
    { name: '', balance: 2, apr: 2, minPayment: 2 },
  ];
  it('uses the debt name when present', () => {
    expect(debtLabel(debts, '0')).toBe('Card');
  });
  it('falls back to positional label when name is blank', () => {
    expect(debtLabel(debts, '1')).toBe('#2');
    expect(debtLabel(debts, '9')).toBe('#10');
  });
});
