<script lang="ts">
  // Snowball vs Avalanche radio cards + extra monthly payment input.
  import { app, persist, parseAmount } from '../lib/state.svelte';
  import { t } from '../lib/i18n.svelte';

  function setStrategy(ev: Event): void {
    const v = (ev.currentTarget as HTMLInputElement).value;
    if (v === 'snowball' || v === 'avalanche') {
      app.strategy = v;
      persist();
    }
  }

  function setExtra(ev: Event): void {
    app.extra = parseAmount((ev.currentTarget as HTMLInputElement).value);
    persist();
  }
</script>

<fieldset class="card">
  <legend>{t('settings.heading')}</legend>
  <label class="radio-row">
    <input type="radio" name="strategy" value="snowball" checked={app.strategy === 'snowball'} onchange={setStrategy} />
    <span>
      <strong>{t('strategy.snowball')}</strong>
      <small>{t('strategy.snowballHint')}</small>
    </span>
  </label>
  <label class="radio-row">
    <input type="radio" name="strategy" value="avalanche" checked={app.strategy === 'avalanche'} onchange={setStrategy} />
    <span>
      <strong>{t('strategy.avalanche')}</strong>
      <small>{t('strategy.avalancheHint')}</small>
    </span>
  </label>
  <label class="extra-label">
    <span>{t('extra.label')}</span>
    <input type="number" min="0" step="10" placeholder="100" value={app.extra || ''} oninput={setExtra} />
  </label>
</fieldset>
