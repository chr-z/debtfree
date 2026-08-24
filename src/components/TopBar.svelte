<script lang="ts">
  // Brand + language and currency switchers.
  import { app, persist, CURRENCIES } from '../lib/state.svelte';
  import { i18n, setLanguage, LANGUAGES, t } from '../lib/i18n.svelte';

  function currencyValue(c: { code: string; locale: string }): string {
    return `${c.code}|${c.locale}`;
  }

  function setCurrency(ev: Event): void {
    const v = (ev.currentTarget as HTMLSelectElement).value;
    const found = CURRENCIES.find((c) => currencyValue(c) === v);
    if (found) {
      app.currency = { code: found.code, locale: found.locale };
      persist();
    }
  }
</script>

<header class="topbar">
  <div class="brand">
    <span class="logo">D</span>
    <span class="name">DebtFree</span>
  </div>
  <div class="controls">
    <label class="sr-only" for="currency-select">{t('summary.budget')}</label>
    <select id="currency-select" title="Currency" value={currencyValue(app.currency)} onchange={setCurrency}>
      {#each CURRENCIES as c (c.code)}
        <option value={currencyValue(c)}>{c.label}</option>
      {/each}
    </select>
    <select
      aria-label="Language"
      title="Language"
      value={i18n.lang}
      onchange={(e) => setLanguage((e.currentTarget as HTMLSelectElement).value)}
    >
      {#each LANGUAGES as l (l.code)}
        <option value={l.code}>{l.label}</option>
      {/each}
    </select>
  </div>
    <a href="upgrade.html" style="margin-left:.6rem;padding:.38rem .85rem;border-radius:8px;background:#059669;color:#fff;font-weight:700;text-decoration:none;font-size:.85rem;white-space:nowrap">{t('nav.pro')}</a>

</header>
