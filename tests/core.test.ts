// DebtFree - business logic tests (vitest). Port of the v1 suite, same cases.
import { describe, expect, it } from 'vitest';
import {
  round,
  amortize,
  minPayment,
  portfolioSummary,
  simulatePayoff,
} from '../src/lib/core';

describe('round', () => {
  it('cent-safe rounding', () => {
    expect(round(10.005)).toBe(10.01);
    expect(round(2.675, 2)).toBe(2.68);
    expect(round(1.005)).toBe(1.01);
  });
});

describe('amortize', () => {
  it('known loan pays off with exact interest math', () => {
    const r = amortize({ balance: 1000, apr: 12, payment: 100 });
    expect(r?.months).toBe(11);
    expect(Math.abs((r?.totalInterest ?? 0) - 58.98)).toBeLessThan(0.01);
  });

  it('0 percent APR divides evenly', () => {
    const r = amortize({ balance: 1000, apr: 0, payment: 250 });
    expect(r?.months).toBe(4);
    expect(r?.totalInterest).toBe(0);
  });

  it('payment below monthly interest never converges', () => {
    const r = amortize({ balance: 500, apr: 1200, payment: 50 });
    expect(r?.months).toBeNull();
  });

  it('rejects negatives and non-numbers', () => {
    expect(amortize({ balance: -5, apr: 10, payment: 50 })).toBeNull();
    expect(amortize({ balance: 'x', apr: 10, payment: 50 })).toBeNull();
    expect(amortize({})).toBeNull();
    expect(amortize({ balance: 0, apr: 18, payment: 50 })).toEqual({ months: 0, totalInterest: 0 });
  });
});

describe('minPayment', () => {
  it('max(floor value, pct times balance)', () => {
    expect(minPayment(2000)).toBe(25);
    expect(minPayment(10000)).toBe(100);
    expect(minPayment(2000, 2, 40)).toBe(40);
    expect(minPayment(-1)).toBe(0);
  });
});

describe('portfolioSummary', () => {
  it('totals and balance-weighted APR', () => {
    const s = portfolioSummary([
      { balance: 1000, apr: 5, minPayment: 100 },
      { balance: 300, apr: 20, minPayment: 50 },
    ]);
    expect(s?.totalBalance).toBe(1300);
    expect(s?.weightedApr).toBe(8.46);
    expect(s?.totalMin).toBe(150);
    expect(s?.count).toBe(2);
    expect(portfolioSummary([])?.totalBalance).toBe(0);
    expect(portfolioSummary(null)).toBeNull();
  });
});

describe('simulatePayoff', () => {
  it('snowball kills smallest debt first, then cascades', () => {
    const r = simulatePayoff(
      [
        { id: 'card', balance: 1000, apr: 0, minPayment: 100 },
        { id: 'store', balance: 300, apr: 0, minPayment: 50 },
      ],
      0,
      'snowball',
    );
    expect(r?.months).toBe(9);
    expect(r?.order).toEqual(['store', 'card']);
    expect(r?.budget).toBe(150);
    if (r) {
      for (let i = 1; i < r.balances.length; i++) {
        const prev = r.balances[i - 1];
        const cur = r.balances[i];
        expect(cur && prev ? cur.total < prev.total : false).toBe(true);
      }
      expect(r.balances.at(-1)?.total).toBe(0);
    }
  });

  it('roll-down beats frozen-minimum payments', () => {
    const debts = [
      { id: 'a', balance: 1000, apr: 12, minPayment: 100 },
      { id: 'b', balance: 300, apr: 0, minPayment: 50 },
    ];
    const plan = simulatePayoff(debts, 0, 'snowball');
    const naive = amortizeSum(debts);
    expect(plan && naive ? plan.months < naive.months : false).toBe(true);
    expect(plan && naive ? plan.totalInterest < naive.totalInterest : false).toBe(true);
  });

  it('avalanche saves vs snowball when APR order differs', () => {
    const debts = [
      { id: 'a', balance: 500, apr: 5, minPayment: 50 },
      { id: 'b', balance: 600, apr: 30, minPayment: 60 },
    ];
    const sb = simulatePayoff(debts, 40, 'snowball');
    const av = simulatePayoff(debts, 40, 'avalanche');
    expect(sb?.order[0]).toBe('a');
    expect(av?.order[0]).toBe('b');
    expect(sb?.budget).toBe(150);
    expect(av?.budget).toBe(150);
    expect(av && sb ? av.totalInterest < sb.totalInterest : false).toBe(true);
    expect(Math.abs((sb?.totalInterest ?? 0) - 89.94)).toBeLessThan(0.02);
    expect(Math.abs((av?.totalInterest ?? 0) - 69.33)).toBeLessThan(0.02);
  });

  it('impossible plan returns null (budget below interest)', () => {
    const r = simulatePayoff([{ id: 'x', balance: 100000, apr: 120, minPayment: 50 }], 0);
    expect(r).toBeNull();
  });

  it('validates inputs', () => {
    expect(simulatePayoff([], 0)).toBeNull();
    expect(simulatePayoff(null, 0)).toBeNull();
    expect(simulatePayoff([{ balance: 100, apr: 10 }], NaN)).toBeNull();
    expect(simulatePayoff([{ balance: -1, apr: 10, minPayment: 10 }], 0)).toBeNull();
  });

  it('already-debt-free is instant', () => {
    const r = simulatePayoff([{ id: 'z', balance: 0, apr: 30, minPayment: 25 }], 0);
    expect(r).toEqual({ months: 0, totalInterest: 0, budget: 0, order: [], balances: [] });
  });
});

/** Sum of independent fixed-payment loans - the "no roll-down" baseline. */
function amortizeSum(debts: Array<{ balance: number; apr: number; minPayment: number }>) {
  let months = 0;
  let interest = 0;
  let alive = debts.length;
  let guard = 0;
  const state = debts.map((d) => ({ bal: d.balance, apr: d.apr, pay: d.minPayment }));
  while (alive > 0 && guard++ < 1440) {
    let died = false;
    for (const s of state) {
      if (s.bal <= 0) continue;
      const i = (s.bal * s.apr) / 1200;
      s.bal = s.bal + i - s.pay;
      if (s.bal <= 0) {
        alive--;
        died = true;
      } else {
        interest += i;
      }
    }
    if (died) months = guard;
  }
  return { months, totalInterest: Math.round(interest * 100) / 100 };
}
