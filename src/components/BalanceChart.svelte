<script lang="ts">
  // Dependency-free SVG area chart of total balance over time.
  import { app, plan } from '../lib/state.svelte';
  import { buildChart } from '../lib/chart';
  import { t } from '../lib/i18n.svelte';

  const geom = $derived(buildChart(plan()?.balances ?? null));
</script>

<section class="card">
  <h2>{t('chart.heading')}</h2>
  <svg viewBox="0 0 560 240" role="img" aria-label={t('chart.heading')}>
    {@html geom ? `${geom.gridlines}${geom.areaTag}${geom.pathTag}${geom.labels}` : ''}
  </svg>
</section>
