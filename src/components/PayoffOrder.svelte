<script lang="ts">
  // Numbered kill-list: the order in which debts die. Star marks the first target.
  import { app, plan } from '../lib/state.svelte';
  import { debtLabel } from '../lib/plan';
  import { t } from '../lib/i18n.svelte';

  const order = $derived(plan()?.order ?? null);
</script>

<section class="card">
  <h2>{t('order.heading')}</h2>
  {#if order}
    <ol class="order-list">
      {#each order as id, i (id)}
        <li class={i === 0 ? 'first' : ''}>{debtLabel(app.debts, id)}</li>
      {/each}
    </ol>
  {:else}
    <ol class="order-list">
      <li class="empty">{t('order.empty')}</li>
    </ol>
  {/if}
</section>
