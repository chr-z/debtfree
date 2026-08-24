<script lang="ts">
  // DebtFree root component (Svelte 5 runes).
  import TopBar from './components/TopBar.svelte';
  import DebtList from './components/DebtList.svelte';
  import StrategyPicker from './components/StrategyPicker.svelte';
  import StatCards from './components/StatCards.svelte';
  import BalanceChart from './components/BalanceChart.svelte';
  import PayoffOrder from './components/PayoffOrder.svelte';
  import { app, persist, SAMPLE_DEBTS, hasDebt } from './lib/state.svelte';
  import { initLanguage, t } from './lib/i18n.svelte';

  let ready = $state(false);

  $effect(() => {
    void initLanguage().then(() => {
      ready = true;
    });
  });

  function loadSample(): void {
    app.debts = SAMPLE_DEBTS.map((d) => ({ ...d }));
    app.extra = 200;
    app.strategy = 'snowball';
    persist();
  }

  function clearAll(): void {
    if (confirm(t('confirm.clear'))) {
      app.debts = [];
      app.extra = 0;
      persist();
    }
  }

  function printPlan(): void {
    window.print();
  }

  function exportJSON(): void {
    const blob = new Blob(
      [JSON.stringify({ app: 'debtfree', version: 2, state: $state.snapshot(app) }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debtfree-plan.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJSON(file: File): Promise<void> {
    try {
      const data = JSON.parse(await file.text()) as {
        app?: string;
        state?: Record<string, unknown>;
        debts?: unknown;
      };
      const s = data && data.app === 'debtfree' ? data.state : data;
      if (!s || !Array.isArray(s.debts)) throw new Error('bad file');
      app.debts = s.debts as typeof app.debts;
      const extra = Number((s as { extra?: unknown }).extra);
      app.extra = Number.isFinite(extra) ? extra : 0;
      persist();
    } catch {
      alert(t('import.badfile'));
    }
  }

  function onImportFile(ev: Event): void {
    const input = ev.currentTarget as HTMLInputElement;
    if (input.files && input.files[0]) void importJSON(input.files[0]);
    input.value = '';
  }
</script>

<TopBar />

<main>
  <section class="hero">
    <h1>{t('hero.title')}</h1>
    <p>{t('hero.subtitle')}</p>
  </section>

  <div class="toolbar no-print">
    <button type="button" class="btn ghost" onclick={loadSample}>{t('sample.load')}</button>
    <button type="button" class="btn ghost danger" onclick={clearAll}>{t('actions.clear')}</button>
    <span class="spacer"></span>
    <button type="button" class="btn ghost" onclick={exportJSON}>{t('actions.export')}</button>
    <label class="btn ghost import-label">
      {t('actions.import')}<input type="file" accept="application/json,.json" hidden onchange={onImportFile} />
    </label>
    <button type="button" class="btn primary" onclick={printPlan}>{t('actions.print')}</button>
  </div>

  <div class="layout">
    <section class="col-inputs no-print">
      <DebtList />
      <StrategyPicker />
    </section>

    <section class="col-results">
      <StatCards />
      <BalanceChart />
      <PayoffOrder />
    </section>
  </div>
</main>

<footer class="foot no-print">
  <p>{t('footer.privacy')}</p>
  <p class="muted">Built by <a href="https://github.com/chr-z">@chr-z</a> · MIT</p>
</footer>
