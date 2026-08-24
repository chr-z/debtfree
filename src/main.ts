// DebtFree bootstrap: mount the Svelte 5 app, register the PWA service worker.
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const target = document.getElementById('app') as HTMLElement;
mount(App, { target });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
