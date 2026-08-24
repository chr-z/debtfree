// DebtFree - inline SVG chart builder (pure, testable). Port of v1 renderChart.
import type { BalancePoint } from './core';

export type ChartGeom = {
  gridlines: string;
  areaTag: string;
  pathTag: string;
  labels: string;
};

const W = 560;
const H = 240;
const PADL = 8;
const PADR = 8;
const PADT = 14;
const PADB = 26;

/** Build SVG inner markup for the total-balance area chart. Null when no data. */
export function buildChart(balances: readonly BalancePoint[] | null): ChartGeom | null {
  if (!balances || balances.length === 0) return null;

  const maxTotal = Math.max(...balances.map((b) => b.total), 1);
  const x = (m: number) => PADL + (m / balances.length) * (W - PADL - PADR);
  const y = (v: number) => PADT + (1 - v / maxTotal) * (H - PADT - PADB);

  const pts: Array<{ m: number; total: number }> = [
    { m: 0, total: maxTotal },
    ...balances.map((b) => ({ m: b.month, total: b.total })),
  ];
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.total).toFixed(1)}`)
    .join(' ');
  const areaPath = `${path} L${x(balances.length).toFixed(1)},${y(0)} L${PADL},${y(0)} Z`;

  let gridlines = '';
  for (const f of [0.25, 0.5, 0.75]) {
    const gy = y(maxTotal * f);
    gridlines += `<line x1="${PADL}" y1="${gy}" x2="${W - PADR}" y2="${gy}" stroke="#e5e7eb" stroke-width="1"/>`;
  }

  let labels = '';
  const step = Math.max(1, Math.ceil(balances.length / 8));
  for (let m = step; m <= balances.length; m += step) {
    labels += `<text x="${x(m)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6b7280">${m}</text>`;
  }

  return {
    gridlines,
    areaTag: `<path d="${areaPath}" fill="#059669" opacity="0.12"/>`,
    pathTag: `<path d="${path}" fill="none" stroke="#059669" stroke-width="3" stroke-linejoin="round"/>`,
    labels,
  };
}
