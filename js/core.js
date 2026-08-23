// DebtFree — pure payoff engine (no DOM). Testable with `node --test`.
'use strict';

/** Round to `d` decimals, cent-safe. */
function round(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}

/**
 * Amortization math for a single loan.
 * @param {object} p
 * @param {number} p.balance     current balance
 * @param {number} p.apr         annual percentage rate (e.g. 18.9)
 * @param {number} p.payment     fixed monthly payment
 * @returns {{months:number|null,totalInterest:number,schedule:number}|null}
 *          months=null when the payment can never outgrow the interest.
 */
function amortize(p = {}) {
  const balance = Number(p.balance);
  const apr = Number(p.apr);
  const pay = Number(p.payment);

  if (![balance, apr, pay].every((v) => Number.isFinite(v))) return null;
  if (balance < 0 || apr < 0 || pay < 0) return null;
  if (balance === 0) return { months: 0, totalInterest: 0 };

  const r = apr / 100 / 12;
  let bal = balance;
  let totalInterest = 0;
  const MAX_N = 1440; // 120 years safety valve

  for (let n = 1; n <= MAX_N; n++) {
    const interest = bal * r;
    if (pay <= interest) return { months: null, totalInterest: null };
    totalInterest += interest;
    bal = bal - pay + interest;
    if (bal <= 0) {
      // last payment is partial; interest on it is proportional
      return { months: n, totalInterest: round(totalInterest) };
    }
  }
  return { months: null, totalInterest: null };
}

/**
 * Minimum payment by common card rules: max(floorValue, floorPct% × balance).
 * @returns {number} rounded to cents
 */
function minPayment(balance, floorPct = 1, floorValue = 25) {
  const b = Number(balance);
  const fp = Number(floorPct);
  const fv = Number(floorValue);
  if (![b, fp, fv].every((v) => Number.isFinite(v)) || b < 0 || fp < 0 || fv < 0) return 0;
  return round(Math.max(fv, (b * fp) / 100));
}

/**
 * Dashboard summary across all debts.
 * @param {Array<{balance:number,apr:number,minPayment:number}>} debts
 * @returns {{totalBalance:number,weightedApr:number,totalMin:number,count:number}|null}
 */
function portfolioSummary(debts) {
  if (!Array.isArray(debts)) return null;
  const list = debts.map((d) => ({
    balance: Number(d.balance),
    apr: Number(d.apr),
    minPayment: Number(d.minPayment),
  }));
  if (!list.every((d) => [d.balance, d.apr, d.minPayment].every(Number.isFinite))) return null;
  const totalBalance = round(list.reduce((s, d) => s + d.balance, 0));
  if (totalBalance <= 0) {
    return { totalBalance: 0, weightedApr: 0, totalMin: round(list.reduce((s, d) => s + d.minPayment, 0)), count: list.length };
  }
  const weightedApr = round(
    list.reduce((s, d) => s + d.apr * d.balance, 0) / totalBalance,
    2
  );
  return {
    totalBalance,
    weightedApr,
    totalMin: round(list.reduce((s, d) => s + d.minPayment, 0)),
    count: list.length,
  };
}

/**
 * Snowball/Avalanche payoff simulation across debts.
 *
 * The monthly budget is CONSTANT: every original minimum + extra. Each month
 * interest accrues, each live debt pays its minimum, and whatever is left
 * cascades into the "focus" debt — lowest balance (snowball) or highest APR
 * (avalanche). When a debt dies, its minimum stops being consumed, so the
 * freed money automatically rolls into the next focus (the classic snowball).
 *
 * @param {Array<{id?:string,name?:string,balance:number,apr:number,minPayment:number}>} debts
 * @param {number} extraMonthly  additional money beyond all minimums
 * @param {'snowball'|'avalanche'} strategy
 * @returns {{months:number,totalInterest:number,budget:number,
 *             order:string[],balances:[{month:number,total:number}[]]}|null}
 *          order = ids in the sequence debts died. null when input is invalid
 *          or the plan never converges (budget below accrued interest).
 */
function simulatePayoff(debts, extraMonthly, strategy = 'snowball') {
  if (!Array.isArray(debts) || debts.length === 0) return null;
  const extra = Number(extraMonthly);
  if (!Number.isFinite(extra) || extra < 0) return null;

  const EPS = 0.005;
  const start = debts.map((d, i) => ({
    id: d.id != null ? String(d.id) : String(i),
    balance: Number(d.balance),
    apr: Number(d.apr),
    minPayment: Number(d.minPayment),
  }));
  if (!start.every((d) => [d.balance, d.apr, d.minPayment].every(Number.isFinite))) return null;
  if (start.some((d) => d.balance < 0 || d.apr < 0 || d.minPayment < 0)) return null;

  const live = start.filter((d) => d.balance > EPS).map((d) => ({ ...d }));
  if (live.length === 0) {
    return { months: 0, totalInterest: 0, budget: 0, order: [], balances: [] };
  }

  const budget = round(start.reduce((s, d) => s + d.minPayment, 0) + extra);

  const pickFocus = () => {
    if (strategy === 'avalanche') {
      return live.reduce((b, d) => (d.apr > b.apr ? d : b));
    }
    return live.reduce((b, d) =>
      d.balance < b.balance || (d.balance === b.balance && d.apr > b.apr) ? d : b
    );
  };

  const balances = [];
  const order = [];
  let totalInterest = 0;
  let month = 0;
  const MAX_N = 1440;

  while (live.length > 0 && month < MAX_N) {
    month++;

    // 1) interest accrues on every live debt
    for (const d of live) {
      const i = round(d.balance * (d.apr / 1200));
      d.balance = round(d.balance + i);
      totalInterest = round(totalInterest + i);
    }

    // 2) pay minimums (capped at balance; unused money stays in the pool)
    let spent = 0;
    for (const d of [...live]) {
      const pay = Math.min(d.minPayment, d.balance);
      d.balance = round(d.balance - pay);
      spent = round(spent + pay);
      if (d.balance <= EPS) {
        live.splice(live.indexOf(d), 1);
        order.push(d.id);
      }
    }

    // 3) cascade everything left through focus debts until the pool empties
    let pool = round(budget - spent);
    while (live.length > 0 && pool > EPS) {
      const focus = pickFocus();
      const applied = Math.min(pool, focus.balance);
      focus.balance = round(focus.balance - applied);
      pool = round(pool - applied);
      if (focus.balance <= EPS) {
        live.splice(live.indexOf(focus), 1);
        order.push(focus.id);
      }
    }

    balances.push({ month, total: round(live.reduce((s, d) => s + d.balance, 0)) });
  }

  if (live.length > 0) return null; // budget below interest — plan impossible

  return { months: month, totalInterest: round(totalInterest), budget, order, balances };
}

export { round, amortize, minPayment, portfolioSummary, simulatePayoff };
