// DebtFree — UI wiring. All payoff math lives in core.js (tested); this file only glues DOM.
'use strict';

import {
  simulatePayoff,
  portfolioSummary,
} from './core.js';
import { formatCurrency } from './currency.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'df_state_v1';

// ---------- state ----------
let state = { debts: [], extra: 0, strategy: 'snowball', currency: { code: 'USD', locale: 'en-US' } };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && Array.isArray(saved.debts)) state = Object.assign(state, saved);
  } catch { /* fresh start */ }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const SAMPLE = {
  debts: [
    { name: 'Credit card', balance: 3200, apr: 21.9, minPayment: 95 },
    { name: 'Store card', balance: 780, apr: 27.5, minPayment: 35 },
    { name: 'Personal loan', balance: 4500, apr: 14.9, minPayment: 150 },
    { name: 'Medical bill', balance: 1200, apr: 0, minPayment: 60 },
  ],
  extra: 200,
  strategy: 'snowball',
};

// ---------- currency ----------
function initCurrency() {
  const sel = $('currency-select');
  if (!sel) return;
  const wanted = `${state.currency.code}|${state.currency.locale}`;
  for (const opt of sel.options) if (opt.value === wanted) sel.value = wanted;
  sel.addEventListener('change', () => {
    const [code, locale] = sel.value.split('|');
    state.currency = { code, locale };
    save();
    render();
  });
}

function fmt(n) {
  return formatCurrency(n, state.currency);
}

// ---------- debt rows ----------
function debtRow(d = {}) {
  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `
    <div class="grid">
      <label class="wide"><span data-i18n="debts.name">Name</span><input class="d-name" type="text" maxlength="40" /></label>
      <label><span data-i18n="debts.balance">Balance</span><input class="d-balance" type="number" min="0" step="any" /></label>
      <label><span data-i18n="debts.apr">APR %</span><input class="d-apr" type="number" min="0" step="any" /></label>
      <label><span data-i18n="debts.minPayment">Min payment</span><input class="d-min" type="number" min="0" step="any" /></label>
    </div>
    <button type="button" class="btn ghost danger sm remove-btn" data-i18n="debts.remove">Remove</button>`;
  div.querySelector('.d-name').value = d.name || '';
  div.querySelector('.d-balance').value = d.balance ?? '';
  div.querySelector('.d-apr').value = d.apr ?? '';
  div.querySelector('.d-min').value = d.minPayment ?? '';
  return div;
}

function readRowsIntoState() {
  state.debts = [...document.querySelectorAll('#debts-list .item')].map((div) => ({
    name: div.querySelector('.d-name').value.trim(),
    balance: num(div.querySelector('.d-balance').value),
    apr: num(div.querySelector('.d-apr').value),
    minPayment: num(div.querySelector('.d-min').value),
  }));
}

function num(v) {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function rebuildForms() {
  const list = $('debts-list');
  list.innerHTML = '';
  (state.debts.length ? state.debts : [{}]).forEach((d) => list.appendChild(debtRow(d)));
  $('extra-input').value = state.extra || '';
  document.querySelectorAll('input[name="strategy"]').forEach((r) => {
    r.checked = r.value === state.strategy;
  });
}

// ---------- chart (inline SVG, no deps) ----------
function renderChart(balances) {
  const svg = $('chart');
  const W = 560;
  const H = 240;
  const PADL = 8;
  const PADR = 8;
  const PADT = 14;
  const PADB = 26;

  if (!balances || balances.length === 0) {
    svg.innerHTML = '';
    return;
  }
  const maxTotal = Math.max(...balances.map((b) => b.total), 1);
  const x = (m) => PADL + (m / balances.length) * (W - PADL - PADR);
  const y = (v) => PADT + (1 - v / maxTotal) * (H - PADT - PADB);

  const pts = [{ m: 0, total: maxTotal }, ...balances];
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  const area = `${path} L${x(balances.length).toFixed(1)},${y(0)} L${PADL},${y(0)} Z`;

  // gridlines at 25/50/75%
  let grid = '';
  for (const f of [0.25, 0.5, 0.75]) {
    const gy = y(maxTotal * f);
    grid += `<line x1="${PADL}" y1="${gy}" x2="${W - PADR}" y2="${gy}" stroke="#e5e7eb" stroke-width="1"/>`;
  }
  // x labels every ~6 months
  let labels = '';
  const step = Math.max(1, Math.ceil(balances.length / 8));
  for (let m = step; m <= balances.length; m += step) {
    labels += `<text x="${x(m)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6b7280">${m}</text>`;
  }

  svg.innerHTML = `
    ${grid}
    <path d="${area}" fill="#059669" opacity="0.12"/>
    <path d="${path}" fill="none" stroke="#059669" stroke-width="3" stroke-linejoin="round"/>
    ${labels}
  `;
}

// ---------- render ----------
let lastPlan = null;

function render() {
  const t = window.RFI18N.t;
  readRowsIntoState();

  const valid = state.debts.some((d) => d.balance > 0);
  const plan = valid ? simulatePayoff(state.debts, state.extra, state.strategy) : null;
  lastPlan = plan;

  const warning = $('plan-warning');
  if (plan === null && valid) {
    warning.classList.remove('hidden');
    $('st-months').textContent = '–';
    $('st-interest').textContent = '–';
    $('st-budget').textContent = '–';
    $('st-saved').textContent = '–';
    $('payoff-order').innerHTML = '';
    renderChart(null);
    return;
  }
  warning.classList.add('hidden');

  if (!plan) {
    $('st-months').textContent = '–';
    $('st-interest').textContent = '–';
    $('st-budget').textContent = '–';
    $('st-saved').textContent = '–';
    $('payoff-order').innerHTML = `<li class="empty">${t('order.empty')}</li>`;
    renderChart(null);
    return;
  }

  const summary = portfolioSummary(state.debts);
  $('st-months').textContent = t('summary.months').replace('{n}', String(plan.months));
  $('st-budget').textContent = fmt(plan.budget);
  $('st-interest').textContent = fmt(plan.totalInterest);

  // savings vs frozen minimums (naive independent loans)
  const naive = naiveBaseline(state.debts);
  const saved = naive !== null ? Math.max(0, naive.interest - plan.totalInterest) : null;
  $('st-saved').textContent = saved !== null ? `${fmt(saved)} ▾` : '—';

  renderChart(plan.balances);

  // payoff order with names
  const byId = new Map(state.debts.map((d, i) => [String(i), d.name]));
  const ol = $('payoff-order');
  ol.innerHTML = '';
  plan.order.forEach((id, i) => {
    const li = document.createElement('li');
    li.textContent = byId.get(id) || `#${Number(id) + 1}`;
    li.className = i === 0 ? 'first' : '';
    ol.appendChild(li);
  });
}

/**
 * Baseline: each debt amortized independently with its frozen minimum.
 * Returns {months, interest} or null when any leg never converges.
 */
function naiveBaseline(debts) {
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

// ---------- import/export ----------
function exportJSON() {
  const blob = new Blob([JSON.stringify({ app: 'debtfree', version: 1, state }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'debtfree-plan.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const s = data && data.app === 'debtfree' ? data.state : (data && Array.isArray(data.debts) ? data : null);
      if (!s || !Array.isArray(s.debts)) throw new Error('bad');
      state = Object.assign({ debts: [], extra: 0, strategy: 'snowball', currency: state.currency }, s);
      rebuildForms();
      save();
      render();
    } catch {
      alert(window.RFI18N.t('import.badfile'));
    }
  };
  reader.readAsText(file);
}

// ---------- wiring ----------
function wire() {
  const list = $('debts-list');
  list.addEventListener('input', () => { save(); render(); });
  list.addEventListener('click', (ev) => {
    if (ev.target.classList.contains('remove-btn')) {
      ev.target.closest('.item').remove();
      save();
      render();
    }
  });
  $('debts-add').addEventListener('click', () => {
    list.appendChild(debtRow());
    window.RFI18N.applyStatic?.();
  });

  $('extra-input').addEventListener('input', () => {
    state.extra = num($('extra-input').value);
    save();
    render();
  });
  document.querySelectorAll('input[name="strategy"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) {
        state.strategy = r.value;
        save();
        render();
      }
    });
  });

  $('btn-sample').addEventListener('click', () => {
    state.debts = JSON.parse(JSON.stringify(SAMPLE.debts));
    state.extra = SAMPLE.extra;
    state.strategy = SAMPLE.strategy;
    rebuildForms();
    save();
    render();
  });
  $('btn-clear').addEventListener('click', () => {
    if (confirm(window.RFI18N.t('confirm.clear'))) {
      state.debts = [];
      state.extra = 0;
      rebuildForms();
      save();
      render();
    }
  });
  $('btn-print').addEventListener('click', () => window.print());

  $('import-file').addEventListener('change', (ev) => {
    if (ev.target.files && ev.target.files[0]) importJSON(ev.target.files[0]);
    ev.target.value = '';
  });
  document.addEventListener('debtfree:langchange', render);
}

// expose applyStatic for dynamically added rows
window.RFI18N.applyStatic = window.RFI18N.applyStatic || (() => {});

// ---------- boot ----------
load();
rebuildForms();
initCurrency();
wire();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
