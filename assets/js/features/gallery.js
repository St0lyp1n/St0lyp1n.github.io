import { $, openDialog } from '../core/utils.js';
export function initGallery() {
  document.addEventListener('click', (e) => {
    const photo = e.target.closest('[data-photo]');
    if (!photo) return;
    $('#photo-dialog img').src = photo.dataset.photo;
    $('#photo-dialog img').alt = photo.dataset.caption;
    $('#photo-dialog p').textContent = photo.dataset.caption;
    openDialog('#photo-dialog');
  });
}
