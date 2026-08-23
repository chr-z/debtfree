# Contributing to DebtFree

Thanks for helping! Quick rules:

1. **Zero runtime dependencies** — if it needs `npm install`, it doesn't ship here.
2. Payoff math goes in `js/core.js` as pure functions, with tests in `tests/core.test.js`.
3. Run tests before pushing (CI enforces it):

   ```bash
   node --test tests/*.test.js
   ```

4. Any new UI string must be added to **both** `locales/en.json` and `locales/pt-BR.json`.
5. Never round intermediate balances in a way that drifts from cent-exact math — the
   simulation must stay reproducible.

Bug reports with a failing test case get priority. 🚀
