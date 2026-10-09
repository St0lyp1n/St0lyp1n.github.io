import { $, $$, activate } from '../core/utils.js';
export function initFilters() {
  let filter = 'all';
  function filterPosts() {
    const list = $('#post-list');
    if (!list) return;
    const query = ($('#post-search')?.value || '').toLowerCase().trim();
    let visible = 0;
    $$('.post-card', list).forEach((card) => {
      card.hidden = !(
        (filter === 'all' || card.dataset.category.split(' ').includes(filter)) &&
        `${card.dataset.title} ${card.dataset.tags}`.toLowerCase().includes(query)
      );
      if (!card.hidden) visible++;
    });
    $('#post-count').textContent = `${visible} 篇文章`;
    $('#list-empty').hidden = visible !== 0;
  }
  $('#post-search')?.addEventListener('input', filterPosts);
  filterPosts();
  $('#post-sort')?.addEventListener('change', (e) => {
    const cards = $$('#post-list .post-card');
    cards.sort((a, b) =>
      e.target.value === 'title'
        ? a.dataset.title.localeCompare(b.dataset.title, 'zh-CN')
        : e.target.value === 'oldest'
          ? a.dataset.date.localeCompare(b.dataset.date)
          : b.dataset.date.localeCompare(a.dataset.date),
    );
    cards.forEach((card) => $('#post-list').append(card));
  });
  document.addEventListener('click', (e) => {
    const homeFilter = e.target.closest('[data-home-filter]');
    if (homeFilter) {
      activate(homeFilter, '[data-home-filter]');
      let visible = 0;
      $$('#home-posts .post-card').forEach((card) => {
        card.hidden =
          homeFilter.dataset.homeFilter !== 'all' &&
          !card.dataset.category.split(' ').includes(homeFilter.dataset.homeFilter);
        if (!card.hidden) visible++;
      });
      $('#home-empty').hidden = visible !== 0;
    }
    const filterButton = e.target.closest('[data-filter]');
    if (filterButton) {
      filter = filterButton.dataset.filter;
      activate(filterButton, '[data-filter]');
      filterPosts();
    }
    const bookFilter = e.target.closest('[data-book-filter]');
    if (bookFilter) {
      activate(bookFilter, '[data-book-filter]');
      $$('.book-card').forEach(
        (card) =>
          (card.hidden =
            bookFilter.dataset.bookFilter !== 'all' &&
            card.dataset.status !== bookFilter.dataset.bookFilter),
      );
    }
    const noteFilter = e.target.closest('[data-note-filter]');
    if (noteFilter) {
      activate(noteFilter, '[data-note-filter]');
      $$('.note-card').forEach(
        (card) =>
          (card.hidden =
            noteFilter.dataset.noteFilter !== 'all' &&
            card.dataset.tag !== noteFilter.dataset.noteFilter),
      );
    }
    if (e.target.closest('[data-action="reset-filters"]')) {
      filter = 'all';
      $('#post-search').value = '';
      activate($('[data-filter="all"]'), '[data-filter]');
      filterPosts();
    }
  });
}
