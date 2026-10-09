import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Preview is never a trusted HTML surface. The allow-list excludes scripts,
// iframes, inline styles, event handlers, and data-URI images.
export function renderMarkdown(source) {
  const raw = marked.parse(String(source), { gfm: true, breaks: false, async: false });
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      'del',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'pre',
      'code',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'input',
      'div',
      'span',
      'sup',
      'sub',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'type',
      'checked',
      'disabled',
      'start',
      'align',
    ],
    ALLOW_DATA_ATTR: false,
  });
  const fragment = document.createElement('template');
  fragment.innerHTML = clean;
  fragment.content.querySelectorAll('a').forEach((link) => {
    const url = link.getAttribute('href') || '';
    if (/^https?:\/\//i.test(url)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else if (!url.startsWith('#')) {
      // Local article links must not navigate away and lose the editing context.
      link.dataset.previewLink = '';
    }
  });
  fragment.content.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') || '';
    if (/^https?:\/\//i.test(src)) {
      const notice = document.createElement('span');
      notice.className = 'image-placeholder';
      notice.textContent = `外部图片：${image.alt || src}（预览不请求远程图片）`;
      image.replaceWith(notice);
    } else if (!src.startsWith('/images/')) {
      const notice = document.createElement('span');
      notice.className = 'image-placeholder';
      notice.textContent = `图片：${image.alt || src}（请将配图放入站点图片目录）`;
      image.replaceWith(notice);
    }
  });
  fragment.content.querySelectorAll('input').forEach((input) => {
    if (input.type !== 'checkbox') input.remove();
    else input.disabled = true;
  });
  return fragment.innerHTML;
}
