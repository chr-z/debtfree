// DebtFree — currency formatting with configurable code + locale.
// Falls back gracefully when Intl lacks a locale.
export type CurrencyPref = { code: string; locale: string };

export function formatCurrency(value: unknown, opts: Partial<CurrencyPref> = {}): string {
  const num = Number(value);
  const code = String(opts.code || 'USD');
  const locale = String(opts.locale || 'en-US');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(
      Number.isFinite(num) ? num : 0,
    );
  } catch {
    const amount = (Number.isFinite(num) ? num : 0).toFixed(2);
    return `${code} ${amount}`;
  }
}
