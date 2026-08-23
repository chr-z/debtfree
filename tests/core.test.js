// DebtFree — business logic tests (node --test, zero deps)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  round,
  amortize,
  minPayment,
  portfolioSummary,
  simulatePayoff,
} from '../js/core.js';

// ---------- round ----------
test('round: cent-safe rounding', () => {
  assert.equal(round(10.005), 10.01);
  assert.equal(round(2.675, 2), 2.68);
  assert.equal(round(1.005), 1.01);
});

// ---------- amortize ----------
test('amortize: known loan pays off with exact interest math', () => {
  // $1000 @12% APR, $100/mo → interest month1 = 10; classic textbook case
  const r = amortize({ balance: 1000, apr: 12, payment: 100 });
  assert.equal(r.months, 11);
  assert.ok(Math.abs(r.totalInterest - 58.98) < 0.01);
});

test('amortize: 0% APR divides evenly', () => {
  const r = amortize({ balance: 1000, apr: 0, payment: 250 });
  assert.equal(r.months, 4);
  assert.equal(r.totalInterest, 0);
});

test('amortize: payment below monthly interest never converges → null', () => {
  const r = amortize({ balance: 500, apr: 1200, payment: 50 }); // 500% a month!
  assert.equal(r.months, null);
});

test('amortize: rejects negatives and non-numbers', () => {
  assert.equal(amortize({ balance: -5, apr: 10, payment: 50 }), null);
  assert.equal(amortize({ balance: 'x', apr: 10, payment: 50 }), null);
  assert.equal(amortize({}), null);
  const zero = amortize({ balance: 0, apr: 18, payment: 50 });
  assert.deepEqual(zero, { months: 0, totalInterest: 0 });
});

// ---------- minPayment ----------
test('minPayment: max(floor value, pct × balance)', () => {
  assert.equal(minPayment(2000), 25);        // floor wins
  assert.equal(minPayment(10000), 100);      // 1% wins
  assert.equal(minPayment(2000, 2, 40), 40); // custom rules
  assert.equal(minPayment(-1), 0);           // invalid → 0
});

// ---------- portfolioSummary ----------
test('portfolioSummary: totals and balance-weighted APR', () => {
  const s = portfolioSummary([
    { balance: 1000, apr: 5, minPayment: 100 },
    { balance: 300, apr: 20, minPayment: 50 },
  ]);
  assert.equal(s.totalBalance, 1300);
  assert.equal(s.weightedApr, 8.46); // (5×1000 + 20×300)/1300
  assert.equal(s.totalMin, 150);
  assert.equal(s.count, 2);
  assert.equal(portfolioSummary([]).totalBalance, 0);
  assert.equal(portfolioSummary(null), null);
});

// ---------- simulatePayoff ----------
test('simulatePayoff: snowball kills smallest debt first, then cascades', () => {
  const r = simulatePayoff(
    [
      { id: 'card', balance: 1000, apr: 0, minPayment: 100 },
      { id: 'store', balance: 300, apr: 0, minPayment: 50 },
    ],
    0,
    'snowball'
  );
  assert.equal(r.months, 9);
  assert.deepEqual(r.order, ['store', 'card']);
  // constant budget = sum of minimums
  assert.equal(r.budget, 150);
  // balances strictly decreasing to zero
  for (let i = 1; i < r.balances.length; i++) {
    assert.ok(r.balances[i].total < r.balances[i - 1].total);
  }
  assert.equal(r.balances[r.balances.length - 1].total, 0);
});

test('simulatePayoff: roll-down beats frozen-minimum payments', () => {
  const debts = [
    { id: 'a', balance: 1000, apr: 12, minPayment: 100 },
    { id: 'b', balance: 300, apr: 0, minPayment: 50 },
  ];
  const plan = simulatePayoff(debts, 0, 'snowball');   // freed $50 keeps rolling into 'a'
  const naive = amortizeSum(debts);                     // each minimum frozen forever
  assert.ok(plan.months < naive.months, `${plan.months} !< ${naive.months}`);
  assert.ok(plan.totalInterest < naive.totalInterest);
});

/** Sum of independent fixed-payment loans — the "no roll-down" baseline. */
function amortizeSum(debts) {
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
      if (s.bal <= 0) { alive--; died = true; }
      else interest += i;
    }
    if (died) months = guard;
  }
  return { months, totalInterest: Math.round(interest * 100) / 100 };
}

test('simulatePayoff: avalanche saves vs snowball when APR order differs', () => {
  const debts = [
    { id: 'a', balance: 500, apr: 5, minPayment: 50 },
    { id: 'b', balance: 600, apr: 30, minPayment: 60 },
  ];
  const sb = simulatePayoff(debts, 40, 'snowball');
  const av = simulatePayoff(debts, 40, 'avalanche');
  assert.equal(sb.order[0], 'a');
  assert.equal(av.order[0], 'b');
  assert.equal(sb.budget, 150);
  assert.equal(av.budget, 150);
  assert.ok(av.totalInterest < sb.totalInterest);
  assert.ok(Math.abs(sb.totalInterest - 89.94) < 0.02);
  assert.ok(Math.abs(av.totalInterest - 69.33) < 0.02);
});

test('simulatePayoff: impossible plan returns null (budget below interest)', () => {
  const r = simulatePayoff([{ id: 'x', balance: 100000, apr: 120, minPayment: 50 }], 0);
  assert.equal(r, null);
});

test('simulatePayoff: validates inputs', () => {
  assert.equal(simulatePayoff([], 0), null);
  assert.equal(simulatePayoff(null, 0), null);
  assert.equal(simulatePayoff([{ balance: 100, apr: 10 }], NaN), null);
  assert.equal(simulatePayoff([{ balance: -1, apr: 10, minPayment: 10 }], 0), null);
});

test('simulatePayoff: already-debt-free is instant', () => {
  const r = simulatePayoff([{ id: 'z', balance: 0, apr: 30, minPayment: 25 }], 0);
  assert.deepEqual(r, { months: 0, totalInterest: 0, budget: 0, order: [], balances: [] });
});
