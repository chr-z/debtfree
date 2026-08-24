// DebtFree - reactive i18n (EN / PT-BR) powered by a Svelte 5 rune.
// Dictionaries live in /locales/*.json (same files as v1); falls back to en,
// then to the raw key. Changing the language re-renders every consumer.
export const LANGUAGES: readonly { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt-BR', label: 'Português (BR)' },
];

const LS_KEY = 'df_lang';

type Dict = Record<string, string>;
const dicts: Record<string, Dict> = {};

export const i18n = $state({ lang: 'en' });

async function fetchDict(code: string): Promise<Dict> {
  const res = await fetch(`./locales/${code}.json`);
  if (!res.ok) throw new Error(`i18n: ${code} -> ${res.status}`);
  return (await res.json()) as Dict;
}

function detectInitial(): string {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    /* keep en */
  }
  return (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

/** Load dictionaries, pick the persisted/browser language, apply to <html>. */
export async function initLanguage(): Promise<string> {
  const wanted = detectInitial();
  for (const l of LANGUAGES) {
    try {
      dicts[l.code] = await fetchDict(l.code);
    } catch {
      /* missing dict -> raw keys */
    }
  }
  i18n.lang = dicts[wanted] ? wanted : 'en';
  applyDocument();
  return i18n.lang;
}

export function setLanguage(next: string): void {
  if (!dicts[next]) return;
  i18n.lang = next;
  try {
    localStorage.setItem(LS_KEY, next);
  } catch {
    /* ignore */
  }
  applyDocument();
}

function applyDocument(): void {
  document.documentElement.lang = i18n.lang;
  const brand = t('brand.tagline');
  document.title = `DebtFree - ${brand}`;
}

/** Translate `key` with optional {placeholder} params. */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dicts[i18n.lang];
  let s = dict && typeof dict[key] === 'string' ? dict[key] : key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.split('{' + k + '}').join(String(params[k]));
    }
  }
  return s;
}
