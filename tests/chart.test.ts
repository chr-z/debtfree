// DebtFree - chart builder tests (pure SVG geometry).
import { describe, expect, it } from 'vitest';
import { buildChart } from '../src/lib/chart';

describe('buildChart', () => {
  it('returns null for empty/null data', () => {
    expect(buildChart(null)).toBeNull();
    expect(buildChart([])).toBeNull();
  });

  it('builds path, area, gridlines and labels', () => {
    const g = buildChart([
      { month: 1, total: 800 },
      { month: 2, total: 500 },
      { month: 3, total: 0 },
    ]);
    expect(g).not.toBeNull();
    expect(g?.pathTag.startsWith('<path d="M')).toBe(true);
    expect(g?.areaTag).toContain('fill="#059669"');
    const lines = (g?.gridlines.match(/<line /g) ?? []).length;
    expect(lines).toBe(3);
    expect(g?.labels).toContain('>3<');
  });

  it('handles a single month', () => {
    const g = buildChart([{ month: 1, total: 100 }]);
    expect(g).not.toBeNull();
    expect(g?.labels).toContain('>1<');
  });
});
