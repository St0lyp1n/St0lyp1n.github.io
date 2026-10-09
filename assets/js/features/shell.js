import { $, $$, copy, openDialog } from '../core/utils.js';
import { openSearch } from './search.js';
export function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('garden-theme', theme);
  } catch {}
  const frame = $('.giscus-frame');
  frame?.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
}
export function initShell() {
  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          dialog.close();
      }
    });
    $('[data-close]', dialog)?.addEventListener('click', () => dialog.close());
  });

  const mobileQuery = matchMedia('(max-width: 700px)');
  function syncSidebar() {
    $('#sidebar').inert = mobileQuery.matches && !document.body.classList.contains('menu-open');
  }
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    $('.mobile-menu')?.setAttribute('aria-expanded', String(open));
    syncSidebar();
    if (open) $('.sidebar .brand').focus();
    else $('.mobile-menu')?.focus();
  }
  mobileQuery.addEventListener('change', () => {
    if (!mobileQuery.matches) document.body.classList.remove('menu-open');
    $('.mobile-menu')?.setAttribute(
      'aria-expanded',
      String(document.body.classList.contains('menu-open')),
    );
    syncSidebar();
  });
  syncSidebar();
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      openSearch();
    }
    if (e.key === '`' && !typing && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      openDialog('#terminal-dialog');
      $('#terminal-input').focus();
    }
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
    if (e.key === 'Tab' && document.body.classList.contains('menu-open')) {
      const items = $$('a,button', $('#sidebar'));
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'theme') toggleTheme();
    if (button.dataset.action === 'menu') setMenu(!document.body.classList.contains('menu-open'));
    if (button.dataset.action === 'search') openSearch();
    if (button.dataset.action === 'terminal') {
      openDialog('#terminal-dialog');
      $('#terminal-input').focus();
    }
    if (button.dataset.action === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    if (button.dataset.action === 'copy-site')
      copy('Stolypin · 数字花园\nhttps://st0lyp1n.github.io/');
  });
}
