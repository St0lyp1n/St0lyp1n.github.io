import { $, $$, esc, openDialog } from '../core/utils.js';
let searchIndex,
  searchLoading,
  searchRun = 0,
  selectedSearch = -1;
export async function getIndex() {
  if (searchIndex) return searchIndex;
  if (!searchLoading)
    searchLoading = fetch('/index.json')
      .then((r) => {
        if (!r.ok) throw new Error('加载失败');
        return r.json();
      })
      .then((data) => (searchIndex = data))
      .catch((e) => {
        searchLoading = null;
        throw e;
      });
  return searchLoading;
}
async function runSearch() {
  const version = ++searchRun;
  const query = $('#search-input').value.trim().toLowerCase();
  const results = $('#search-results');
  results.innerHTML = '<p class="search-hint">正在翻阅花园…</p>';
  try {
    const items = await getIndex();
    if (version !== searchRun) return;
    const words = query.split(/\s+/).filter(Boolean);
    const matches = items
      .map((item) => {
        const title = item.title.toLowerCase();
        const content = `${title} ${(item.tags || []).join(' ')} ${item.content}`.toLowerCase();
        return {
          ...item,
          score: words.reduce((score, word) => score + (title.includes(word) ? 5 : 1), 0),
          match: words.every((word) => content.includes(word)),
        };
      })
      .filter((item) => (query ? item.match : item.kind === 'posts'))
      .sort((a, b) => (query ? b.score - a.score : b.date.localeCompare(a.date)))
      .slice(0, 20);
    selectedSearch = -1;
    results.innerHTML = matches.length
      ? `${query ? '' : '<div class="search-hint">随意走走，或输入一个关键词</div>'}${matches.map((item) => `<a class="search-result" href="${esc(item.url)}"><strong>${esc(item.title)}</strong><small>${esc(item.description).slice(0, 100) || '打开这个花园角落'} · ${esc(item.date === '0001.01.01' ? '' : item.date)}</small></a>`).join('')}`
      : '<div class="empty-state">没有找到结果。<br>试试「设计」「Hugo」或「日常」。</div>';
  } catch {
    if (version !== searchRun) return;
    results.innerHTML =
      '<div class="empty-state">搜索索引暂时无法加载，请检查网络后重新输入。<a class="button" href="/posts/">浏览所有文章</a></div>';
  }
}
export function openSearch() {
  openDialog('#search-dialog');
  $('#search-input').focus();
  runSearch();
}

export function initSearch() {
  $('#search-input').addEventListener('input', runSearch);
  $('#search-dialog').addEventListener('keydown', (e) => {
    const results = $$('.search-result');
    if (!results.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      selectedSearch =
        selectedSearch < 0
          ? e.key === 'ArrowDown'
            ? 0
            : results.length - 1
          : (selectedSearch + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      results.forEach((r, i) => r.classList.toggle('selected', i === selectedSearch));
      results[selectedSearch].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && e.target.id === 'search-input') {
      e.preventDefault();
      location.href = results[Math.max(0, selectedSearch)].href;
    }
  });
}
