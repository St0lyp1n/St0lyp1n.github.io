import { $, $$, storage, toast, copy } from '../core/utils.js';
export function initReader() {
  let fontSize = Math.min(23, Math.max(15, Number(storage.get('garden-font', 17)) || 17));
  document.documentElement.style.setProperty('--article-size', `${fontSize}px`);
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'share') copy(location.href);
    if (action === 'font-up' || action === 'font-down') {
      fontSize = Math.min(23, Math.max(15, fontSize + (action === 'font-up' ? 1 : -1)));
      document.documentElement.style.setProperty('--article-size', `${fontSize}px`);
      storage.set('garden-font', fontSize);
      toast(`正文字号：${fontSize}px`);
    }
    if (action === 'focus') {
      const on = document.body.classList.toggle('focus-mode');
      button.textContent = on ? '退出专注' : '专注阅读';
    }
    if (action === 'comments') {
      const container = $('#giscus');
      if (container.querySelector('script')) return;
      const script = document.createElement('script');
      const attrs = {
        src: 'https://giscus.app/client.js',
        'data-repo': container.dataset.repo,
        'data-repo-id': container.dataset.repoId,
        'data-category': container.dataset.category,
        'data-category-id': container.dataset.categoryId,
        'data-mapping': 'pathname',
        'data-strict': '0',
        'data-reactions-enabled': '1',
        'data-input-position': 'top',
        'data-theme': document.documentElement.dataset.theme || 'light',
        'data-lang': 'zh-CN',
        crossorigin: 'anonymous',
      };
      Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
      script.async = true;
      script.onerror = () => {
        button.disabled = false;
        button.textContent = '重试加载评论';
        script.remove();
        toast('评论服务无法连接，可使用下方 GitHub 链接');
      };
      container.append(script);
      button.textContent = '评论服务已请求';
      button.disabled = true;
    }
  });
  $$('.prose pre').forEach((pre) => {
    const code = $('code', pre);
    if (!code) return;
    const button = document.createElement('button');
    button.className = 'code-copy';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    button.addEventListener('click', async () => {
      if (await copy(code.textContent)) {
        button.textContent = '已复制';
        setTimeout(() => (button.textContent = '复制'), 2000);
      }
    });
    pre.append(button);
  });
  function updateScroll() {
    $('.back-top').classList.toggle('visible', scrollY > 400);
    const article = $('.article');
    if (article) {
      const distance = article.offsetTop + article.offsetHeight - innerHeight;
      $('.reading-progress').style.width =
        `${Math.max(0, Math.min(100, (scrollY / Math.max(1, distance)) * 100))}%`;
    }
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();
  const headings = $$('.prose h2,.prose h3');
  if (headings.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            $$('.article-toc a').forEach((a) =>
              a.classList.toggle('active', decodeURIComponent(a.hash.slice(1)) === entry.target.id),
            );
        });
      },
      { rootMargin: '-5% 0px -65% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
  }
}
