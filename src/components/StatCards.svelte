<script lang="ts">
  // Headline numbers: debt-free date, budget, interest, savings vs minimums.
  import { app, plan } from '../lib/state.svelte';
  import { naiveBaseline } from '../lib/plan';
  import { formatCurrency } from '../lib/currency';
  import { t } from '../lib/i18n.svelte';

  const p = $derived(plan());
  const valid = $derived(app.debts.some((d) => d.balance > 0));

  const savedText = $derived.by(() => {
    if (!p) return '—';
    const naive = naiveBaseline(app.debts);
    if (!naive) return '—';
    const saved = Math.max(0, naive.interest - p.totalInterest);
    return `${formatCurrency(saved, app.currency)} ▾`;
  });

  const monthsText = $derived(p ? t('summary.months', { n: p.months }) : '–');
</script>

<div class="stat-cards">
  <div class="card stat">
    <h2>{t('summary.debtFreeIn')}</h2>
    <p class="stat-num">{monthsText}</p>
    <p class="stat-sub">{t('summary.budget')}</p>
    <p class="stat-val">{p ? formatCurrency(p.budget, app.currency) : '–'}</p>
  </div>
  <div class="card stat">
    <h2>{t('summary.interest')}</h2>
    <p class="stat-num">{p ? formatCurrency(p.totalInterest, app.currency) : '–'}</p>
    <p class="stat-sub">{t('summary.savedVsMin')}</p>
    <p class="stat-val">{savedText}</p>
  </div>
</div>

{#if valid && !p}
  <p class="warning" role="alert">{t('plan.impossible')}</p>
{/if}
