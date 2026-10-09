import { $, $$, storage, esc, toast, copy, openDialog, activate } from '../core/utils.js';
if ($('#timer')) {
  let duration = 25 * 60,
    remaining = duration,
    deadline = 0,
    running = false,
    interval;
  const draw = () =>
    ($('#timer').textContent =
      `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`);
  const pause = () => {
    running = false;
    clearInterval(interval);
    $('#timer-start').textContent = '开始专注';
  };
  const tick = () => {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    draw();
    if (!remaining) {
      pause();
      toast('这一段时间完成了。伸个懒腰，休息一下。');
      $('#timer-message').textContent = '做得很好。给自己一点休息时间。';
    }
  };
  $('#timer-start').addEventListener('click', () => {
    if (running) {
      tick();
      pause();
    } else {
      if (!remaining) remaining = duration;
      running = true;
      deadline = Date.now() + remaining * 1000;
      $('#timer-start').textContent = '暂停';
      $('#timer-message').textContent = '只做一件事，也是一种进步。';
      interval = setInterval(tick, 250);
    }
  });
  $('#timer-reset').addEventListener('click', () => {
    pause();
    remaining = duration;
    draw();
    $('#timer-message').textContent = '准备好了，就开始吧。';
  });
  $$('[data-minutes]').forEach((button) =>
    button.addEventListener('click', () => {
      pause();
      duration = Number(button.dataset.minutes) * 60;
      remaining = duration;
      draw();
      activate(button, '[data-minutes]');
    }),
  );
}
if ($('#palette')) {
  const palettes = [
    ['#334C40', '#7D9272', '#BFCBB3', '#E9E9DC', '#C4A57B'],
    ['#324B5A', '#6F8F9A', '#B0C4C2', '#ECE8DC', '#BA8E77'],
    ['#543F42', '#947875', '#C3A79A', '#EEE5D8', '#69795C'],
    ['#363E3B', '#7A8A76', '#B0B9A3', '#E7E3D4', '#C9B58F'],
  ];
  let selected = 0;
  const draw = () => {
    $('#palette').replaceChildren();
    palettes[selected].forEach((color) => {
      const b = document.createElement('button');
      b.className = 'color-swatch';
      b.style.background = color;
      b.textContent = color;
      b.setAttribute('aria-label', `复制颜色 ${color}`);
      b.onclick = () => copy(color);
      $('#palette').append(b);
    });
  };
  $('#new-palette').addEventListener('click', () => {
    selected = (selected + 1) % palettes.length;
    draw();
  });
  draw();
}
if ($('#markdown-input')) {
  const inline = (text) =>
    esc(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  const render = () => {
    const text = $('#markdown-input').value;
    storage.set('garden-markdown', text);
    let inCode = false,
      inList = false;
    let html = '';
    for (const line of text.split('\n')) {
      if (line.startsWith('```')) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += inCode ? '</code></pre>' : '<pre><code>';
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        html += esc(line) + '\n';
        continue;
      }
      const list = line.startsWith('- ');
      if (inList && !list) {
        html += '</ul>';
        inList = false;
      }
      if (list) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        html += `<li>${inline(line.slice(2))}</li>`;
      } else if (line.startsWith('### ')) html += `<h3>${inline(line.slice(4))}</h3>`;
      else if (line.startsWith('## ')) html += `<h2>${inline(line.slice(3))}</h2>`;
      else if (line.startsWith('# ')) html += `<h1>${inline(line.slice(2))}</h1>`;
      else if (line.startsWith('> ')) html += `<blockquote>${inline(line.slice(2))}</blockquote>`;
      else if (line.trim()) html += `<p>${inline(line)}</p>`;
    }
    if (inList) html += '</ul>';
    if (inCode) html += '</code></pre>';
    $('#markdown-preview').innerHTML = html;
  };
  const saved = storage.get('garden-markdown', null);
  if (typeof saved === 'string') $('#markdown-input').value = saved;
  $('#markdown-input').addEventListener('input', render);
  render();
  $('#download-markdown').addEventListener('click', () => {
    const blob = new Blob([$('#markdown-input').value], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'garden-note.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
