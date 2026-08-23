// DebtFree — currency formatting with configurable code + locale.
// Falls back gracefully when Intl lacks a locale.
'use strict';

function formatCurrency(value, opts = {}) {
  const num = Number(value);
  const code = String(opts.code || 'USD');
  const locale = String(opts.locale || 'en-US');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(
      Number.isFinite(num) ? num : 0
    );
  } catch {
    const amount = (Number.isFinite(num) ? num : 0).toFixed(2);
    return `${code} ${amount}`;
  }
}

export { formatCurrency };
