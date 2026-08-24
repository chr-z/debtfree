<script lang="ts">
  // The "Your debts" card: editable rows + add button.
  import { app, persist } from '../lib/state.svelte';
  import { t } from '../lib/i18n.svelte';
  import DebtRow from './DebtRow.svelte';

  function addDebt(): void {
    app.debts.push({ name: '', balance: 0, apr: 0, minPayment: 0 });
    persist();
  }
</script>

<fieldset class="card">
  <legend>{t('debts.heading')}</legend>
  {#each app.debts as debt (debt)}
    <DebtRow {debt} />
  {/each}
  <button type="button" class="btn ghost add-btn" onclick={addDebt}>{t('debts.add')}</button>
</fieldset>
