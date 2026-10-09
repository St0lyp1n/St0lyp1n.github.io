import { $, $$, storage, esc, toast } from '../core/utils.js';
import { downloadFile } from '../core/files.js';
export function initBookmarks() {
  let bookmarks = storage.get('garden-bookmarks', []);
  if (!Array.isArray(bookmarks)) bookmarks = [];
  bookmarks = bookmarks.filter(
    (x) =>
      x && typeof x.url === 'string' && x.url.startsWith('/posts/') && typeof x.title === 'string',
  );
  function syncBookmarks() {
    $$('[data-bookmark]').forEach((el) => {
      const selected = bookmarks.some((b) => b.url === el.dataset.bookmark);
      el.setAttribute('aria-pressed', String(selected));
      if (el.hasAttribute('aria-label'))
        el.setAttribute('aria-label', `${selected ? '取消收藏' : '收藏'} ${el.dataset.title}`);
    });
    $$('.bookmark-count').forEach((el) => (el.textContent = bookmarks.length));
    renderBookmarks();
  }
  function toggleBookmark(url, title) {
    const index = bookmarks.findIndex((b) => b.url === url);
    if (index >= 0) bookmarks.splice(index, 1);
    else bookmarks.unshift({ url, title, date: new Date().toISOString().slice(0, 10) });
    const saved = storage.set('garden-bookmarks', bookmarks);
    syncBookmarks();
    toast(
      saved
        ? index >= 0
          ? '已取消收藏'
          : '已保存到阅读收藏'
        : '本次已收藏，浏览器存储不可用，关闭后将不保留',
    );
  }
  function renderBookmarks() {
    const list = $('#saved-list');
    if (!list) return;
    list.replaceChildren();
    if (!bookmarks.length) {
      list.innerHTML =
        '<div class="empty-state">还没有收藏的文章。<br>读到喜欢的文字，点一下书签，就能在这里再次相遇。<a class="button" href="/posts/">去发现好文章 →</a></div>';
      return;
    }
    bookmarks.forEach((b) => {
      const row = document.createElement('div');
      row.className = 'saved-row';
      row.innerHTML = `<div><a href="${esc(b.url)}">${esc(b.title)}</a><small>收藏于 ${esc(b.date)}</small></div><button data-bookmark="${esc(b.url)}" data-title="${esc(b.title)}" aria-label="取消收藏 ${esc(b.title)}">移除</button>`;
      list.append(row);
    });
  }
  syncBookmarks();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bookmark]');
    if (b) toggleBookmark(b.dataset.bookmark, b.dataset.title);
    const button = e.target.closest('[data-action="export-bookmarks"]');
    if (!button) return;
    if (!bookmarks.length) {
      toast('先收藏一篇喜欢的文章吧');
      return;
    }
    downloadFile('stolypin-bookmarks.json', JSON.stringify(bookmarks, null, 2), 'application/json');
  });
}
