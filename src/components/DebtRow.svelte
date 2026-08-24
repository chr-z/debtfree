<script lang="ts">
  // One editable debt row, bound directly into the global rune store.
  import { app, persist } from '../lib/state.svelte';
  import { t } from '../lib/i18n.svelte';

  let { debt }: { debt: Debt } = $props();

  type Debt = { name: string; balance: number; apr: number; minPayment: number };

  function touch(): void {
    persist();
  }

  function remove(): void {
    const i = app.debts.indexOf(debt);
    if (i >= 0) app.debts.splice(i, 1);
    persist();
  }
</script>

<div class="item">
  <div class="grid">
    <label class="wide">
      <span>{t('debts.name')}</span>
      <input class="d-name" type="text" maxlength="40" bind:value={debt.name} oninput={touch} />
    </label>
    <label>
      <span>{t('debts.balance')}</span>
      <input class="d-balance" type="number" min="0" step="any" bind:value={debt.balance} oninput={touch} />
    </label>
    <label>
      <span>{t('debts.apr')}</span>
      <input class="d-apr" type="number" min="0" step="any" bind:value={debt.apr} oninput={touch} />
    </label>
    <label>
      <span>{t('debts.minPayment')}</span>
      <input class="d-min" type="number" min="0" step="any" bind:value={debt.minPayment} oninput={touch} />
    </label>
  </div>
  <button type="button" class="btn ghost danger sm remove-btn" onclick={remove}>{t('debts.remove')}</button>
</div>
