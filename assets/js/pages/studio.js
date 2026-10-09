import { $, $$, esc, toast, openDialog } from '../core/utils.js';
import { downloadFile, readTextFile } from '../core/files.js';
import { renderMarkdown } from '../core/markdown.js';
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  MAX_DRAFTS,
  newDraft,
  importMarkdown,
  exportMarkdown,
  slugify,
  wordCount,
  validateBackup,
} from '../studio/model.js';

const root = $('#studio');
const fields = {
  title: $('#article-title'),
  description: $('#article-description'),
  slug: $('#article-slug'),
  date: $('#article-date'),
  categories: $('#article-categories'),
  tags: $('#article-tags'),
  draft: $('#article-draft'),
  body: $('#article-body'),
};
let drafts = [],
  activeId,
  saveTimer,
  renderTimer,
  importBusy = false,
  storageFailed = false;
let undo = [],
  redo = [],
  lastHistoryAt = 0,
  composing = false;
let incomingExternalState = false;
const active = () => drafts.find((draft) => draft.id === activeId);

function alertUser(message, tone = 'error') {
  const banner = $('#studio-alert');
  banner.textContent = message;
  banner.dataset.tone = tone;
  banner.hidden = !message;
}

function updateSaveStatus(message, failed = false) {
  const status = $('#save-status');
  $('span:last-child', status).textContent = message;
  status.classList.toggle('save-failed', failed);
}

function persist() {
  clearTimeout(saveTimer);
  // A second tab must not silently overwrite a newer workspace.
  if (incomingExternalState) {
    updateSaveStatus('另一标签页已更新，请先备份当前内容', true);
    return false;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, activeId, drafts }),
    );
    storageFailed = false;
    updateSaveStatus('已保存在此浏览器');
    return true;
  } catch {
    storageFailed = true;
    updateSaveStatus('尚未保存，请导出备份', true);
    alertUser(
      '浏览器存储不可用或空间不足。当前内容仍可编辑，请立即导出文章或备份全部；刷新页面可能丢失未保存的更改。',
    );
    return false;
  }
}

function queueSave() {
  updateSaveStatus('保存中…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      const validated = validateBackup(state);
      drafts = validated.map((draft, index) => ({
        ...draft,
        id: /^[a-zA-Z0-9-]{10,80}$/.test(state.drafts[index].id || '')
          ? state.drafts[index].id
          : draft.id,
        updatedAt: state.drafts[index].updatedAt || draft.updatedAt,
        createdAt: state.drafts[index].createdAt || draft.createdAt,
      }));
      activeId = drafts.some((d) => d.id === state.activeId) ? state.activeId : drafts[0]?.id;
    }
  } catch {
    // Preserve corrupt data rather than overwriting it automatically.
    incomingExternalState = true;
    alertUser(
      '旧草稿数据无法读取，原数据没有被覆盖。你仍可导入文件并编辑，请用“备份全部”保存本次内容。',
    );
  }
  if (!drafts.length) {
    const draft = newDraft();
    drafts = [draft];
    activeId = draft.id;
  }
  showDraft();
  renderList();
  updateSaveStatus(
    incomingExternalState ? '旧数据受保护，本次请导出' : '本地草稿已就绪',
    incomingExternalState,
  );
}

function renderList() {
  const query = $('#draft-search').value.trim().toLowerCase();
  const list = $('#draft-list');
  list.replaceChildren();
  $('#draft-count').textContent = drafts.length;
  const matches = drafts.filter((d) =>
    `${d.title} ${d.sourceName || ''}`.toLowerCase().includes(query),
  );
  for (const draft of matches) {
    const button = document.createElement('button');
    button.className = `draft-item${draft.id === activeId ? ' selected' : ''}`;
    button.dataset.draftId = draft.id;
    button.setAttribute('aria-current', draft.id === activeId ? 'true' : 'false');
    const title = document.createElement('strong');
    title.textContent = draft.title || '未命名草稿';
    const meta = document.createElement('small');
    meta.textContent = `${wordCount(draft.body)} 字 · ${draft.draft ? '草稿' : '可发布文件'}`;
    button.append(title, meta);
    button.addEventListener('click', () => {
      if (draft.id === activeId) return;
      persist();
      activeId = draft.id;
      showDraft();
      renderList();
      persist();
    });
    list.append(button);
  }
  if (!matches.length) {
    const hint = document.createElement('p');
    hint.className = 'draft-empty';
    hint.textContent = '没有匹配的草稿';
    list.append(hint);
  }
}

function showDraft() {
  const draft = active();
  for (const [key, field] of Object.entries(fields)) {
    if (key === 'draft') field.checked = draft.draft;
    else field.value = Array.isArray(draft[key]) ? draft[key].join('、') : draft[key] || '';
  }
  undo = [{ text: draft.body, start: 0, end: 0 }];
  redo = [];
  lastHistoryAt = 0;
  renderPreview();
  updateMeta();
  updateCursor();
  updateHistoryButtons();
}

function updateMeta() {
  const draft = active();
  $('#filename-hint').textContent = `${draft.slug || 'untitled'}.md`;
  $('#metadata-summary').textContent = [
    draft.date,
    draft.categories.join(' / '),
    draft.draft ? '草稿' : '可发布文件',
  ]
    .filter(Boolean)
    .join(' · ');
  const extra = Object.keys(draft.extra || {});
  $('#extra-fields-note').textContent = extra.length
    ? `另外保留 ${extra.length} 个原始字段：${extra.join('、')}`
    : '';
}

function renderPreview() {
  const draft = active();
  if (!draft) return;
  const preview = $('#article-preview');
  const count = wordCount(draft.body);
  $('#word-count').textContent = `${count.toLocaleString('zh-CN')} 字`;
  $('#preview-reading-time').textContent = `约 ${Math.max(1, Math.ceil(count / 350))} 分钟`;
  const title = document.createElement('h1');
  title.textContent = draft.title || '未命名草稿';
  const meta = document.createElement('p');
  meta.className = 'preview-meta';
  meta.textContent = [draft.date, draft.categories.join(' · ')].filter(Boolean).join(' / ');
  const description = document.createElement('p');
  description.className = 'preview-description';
  description.textContent = draft.description;
  const body = document.createElement('div');
  body.className = 'preview-markdown';
  if (draft.body.length > 150000) {
    body.innerHTML = renderMarkdown(draft.body.slice(0, 150000));
    const note = document.createElement('p');
    note.className = 'preview-empty';
    note.textContent = '长文预览仅显示前 150,000 个字符。完整正文会保存在草稿中并导出。';
    body.append(note);
  } else if (draft.body.trim()) body.innerHTML = renderMarkdown(draft.body);
  else
    body.innerHTML =
      '<div class="preview-empty"><span>✎</span><h2>先写一句话。</h2><p>或者把你的 Markdown 文件拖进来，<br>文字会在这里慢慢成形。</p></div>';
  preview.replaceChildren(title, meta, description, body);
}

function checkpoint(force = false) {
  const snapshot = {
    text: fields.body.value,
    start: fields.body.selectionStart,
    end: fields.body.selectionEnd,
  };
  if (undo.at(-1)?.text === snapshot.text) return;
  if (!force && undo.length > 1 && Date.now() - lastHistoryAt < 700)
    undo[undo.length - 1] = snapshot;
  else undo.push(snapshot);
  if (undo.length > 80) undo.shift();
  redo = [];
  lastHistoryAt = Date.now();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $('#editor-undo').disabled = undo.length < 2;
  $('#editor-redo').disabled = !redo.length;
}
function historyStep(direction) {
  let snapshot;
  if (direction === 'undo' && undo.length > 1) {
    redo.push(undo.pop());
    snapshot = undo.at(-1);
  }
  if (direction === 'redo' && redo.length) {
    snapshot = redo.pop();
    undo.push(snapshot);
  }
  if (!snapshot) return;
  fields.body.value = snapshot.text;
  fields.body.focus();
  fields.body.setSelectionRange(snapshot.start, snapshot.end);
  active().body = snapshot.text;
  active().updatedAt = new Date().toISOString();
  queueSave();
  renderPreview();
  renderList();
  updateHistoryButtons();
  updateCursor();
}

function onInput(key) {
  const draft = active();
  if (key === 'draft') draft.draft = fields.draft.checked;
  else if (key === 'tags' || key === 'categories')
    draft[key] = [
      ...new Set(
        fields[key].value
          .split(/[,，、]/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
  else draft[key] = fields[key].value;
  if (key === 'title' && (!draft.slug || draft.slug === slugify(draft.previousTitle || ''))) {
    draft.slug = slugify(draft.title);
    fields.slug.value = draft.slug;
  }
  if (key === 'title') draft.previousTitle = draft.title;
  if (key === 'body' && !composing) checkpoint();
  draft.updatedAt = new Date().toISOString();
  updateMeta();
  queueSave();
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderPreview();
    renderList();
  }, 130);
}

function addDraft(draft) {
  if (drafts.length >= MAX_DRAFTS)
    throw new Error('草稿已达到 100 篇，请先备份并删除不再需要的草稿。');
  // Replace only the untouched initial empty placeholder.
  if (drafts.length === 1 && !drafts[0].title && !drafts[0].body && !drafts[0].description)
    drafts = [];
  drafts.unshift(draft);
  activeId = draft.id;
}

async function importFiles(files) {
  if (importBusy) {
    toast('正在导入上一批文件，请稍等');
    return;
  }
  importBusy = true;
  root.setAttribute('aria-busy', 'true');
  let count = 0,
    duplicates = 0;
  const errors = [];
  try {
    for (const file of Array.from(files)) {
      try {
        const text = await readTextFile(file);
        const draft = importMarkdown(text, file.name);
        if (drafts.some((d) => d.sourceName === file.name || d.slug === draft.slug)) duplicates++;
        addDraft(draft);
        count++;
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (count) {
      showDraft();
      renderList();
      persist();
      toast(`已导入 ${count} 篇${duplicates ? '，同名内容保留为独立草稿' : ''}`);
    }
    if (errors.length) alertUser(errors.join('\n'));
    else if (!storageFailed && !incomingExternalState)
      alertUser(duplicates ? '同名文件已作为新草稿保留，没有覆盖原草稿。' : '', 'info');
  } finally {
    importBusy = false;
    root.removeAttribute('aria-busy');
    $('#markdown-files').value = '';
  }
}

function insertFormatting(kind) {
  const textarea = fields.body,
    start = textarea.selectionStart,
    end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const wrappers = {
    heading: ['## ', '标题'],
    bold: ['**', '文字', '**'],
    italic: ['*', '文字', '*'],
    link: ['[', '链接文字', '](https://example.com)'],
    quote: ['> ', '引用'],
    list: ['- ', '列表项'],
    task: ['- [ ] ', '待办事项'],
    code: ['```javascript\n', '// 写一点代码', '\n```'],
    table: ['', '| 标题 | 说明 |\n| --- | --- |\n| 内容 | 内容 |', ''],
  };
  const [prefix, fallback, suffix = ''] = wrappers[kind];
  const block = ['heading', 'quote', 'list', 'task', 'code', 'table'].includes(kind);
  const lead = block && start > 0 && textarea.value[start - 1] !== '\n' ? '\n' : '';
  const replacement = lead + prefix + (selected || fallback) + suffix;
  checkpoint(true);
  textarea.setRangeText(replacement, start, end, 'end');
  textarea.focus();
  textarea.setSelectionRange(
    start + lead.length + prefix.length,
    start + lead.length + prefix.length + (selected || fallback).length,
  );
  checkpoint(true);
  active().body = textarea.value;
  active().updatedAt = new Date().toISOString();
  queueSave();
  renderPreview();
  renderList();
  updateCursor();
}

function exportArticle() {
  try {
    const content = exportMarkdown(active());
    downloadFile(`${active().slug}.md`, content, 'text/markdown;charset=utf-8');
    toast('已导出 Markdown；请放入 content/posts/ 后提交发布');
  } catch (error) {
    alertUser(error.message);
    $('#article-properties').open = true;
  }
}

function backupAll() {
  downloadFile(
    `stolypin-drafts-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ version: SCHEMA_VERSION, drafts }, null, 2),
    'application/json',
  );
  toast('已导出全部草稿备份');
}

function updateCursor() {
  const before = fields.body.value.slice(0, fields.body.selectionStart);
  $('#cursor-position').textContent =
    `行 ${before.split('\n').length}，列 ${before.length - before.lastIndexOf('\n')}`;
}

function setView(view) {
  $('.editor-panes').dataset.view = view;
  $$('[data-editor-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.editorView === view);
    button.setAttribute('aria-pressed', String(button.dataset.editorView === view));
  });
}

for (const key of Object.keys(fields)) fields[key].addEventListener('input', () => onInput(key));
fields.body.addEventListener('compositionstart', () => (composing = true));
fields.body.addEventListener('compositionend', () => {
  composing = false;
  checkpoint();
});
for (const event of ['click', 'keyup', 'select']) fields.body.addEventListener(event, updateCursor);
$('#new-draft').addEventListener('click', () => {
  try {
    addDraft(newDraft());
    showDraft();
    renderList();
    persist();
    fields.title.focus();
  } catch (error) {
    alertUser(error.message);
  }
});
$('#duplicate-draft').addEventListener('click', () => {
  try {
    const draft = structuredClone(active());
    addDraft(
      newDraft({
        ...draft,
        id: crypto.randomUUID(),
        title: (draft.title || '未命名草稿') + ' · 副本',
        slug: (draft.slug || 'untitled').slice(0, 70) + '-copy',
      }),
    );
    showDraft();
    renderList();
    persist();
    toast('已创建独立副本');
  } catch (error) {
    alertUser(error.message);
  }
});
$('#draft-search').addEventListener('input', renderList);
$('#markdown-files').addEventListener('change', (e) => importFiles(e.target.files));
$('#drop-zone').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    $('#markdown-files').click();
  }
});
let dragDepth = 0;
document.addEventListener('dragenter', (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault();
    dragDepth++;
    root.classList.add('file-dragging');
  }
});
document.addEventListener('dragover', (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
});
document.addEventListener('dragleave', (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) root.classList.remove('file-dragging');
  }
});
document.addEventListener('drop', (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault();
    dragDepth = 0;
    root.classList.remove('file-dragging');
    importFiles(e.dataTransfer.files);
  }
});
$('#backup-all').addEventListener('click', backupAll);
$('#backup-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await readTextFile(file, ['json'], 20 * 1024 * 1024);
    const incoming = validateBackup(JSON.parse(text));
    if (drafts.length + incoming.length > MAX_DRAFTS)
      throw new Error('恢复后将超过 100 篇草稿，请先清理部分草稿。');
    incoming.forEach(addDraft);
    showDraft();
    renderList();
    persist();
    toast(`已恢复 ${incoming.length} 篇草稿，现有草稿未覆盖`);
  } catch (error) {
    alertUser(`恢复失败：${error.message}`);
  } finally {
    e.target.value = '';
  }
});
$('#export-article').addEventListener('click', exportArticle);
$('#studio-help').addEventListener('click', () => openDialog('#studio-help-dialog'));
$('#delete-draft').addEventListener('click', () => {
  $('#confirm-message').textContent =
    `“${active().title || '未命名草稿'}”将从当前浏览器移除，无法撤销。原 Markdown 文件不会被删除。`;
  openDialog('#studio-confirm-dialog');
  $('#cancel-delete').focus();
});
$('#cancel-delete').addEventListener('click', () => $('#studio-confirm-dialog').close());
$('#confirm-delete').addEventListener('click', () => {
  drafts = drafts.filter((d) => d.id !== activeId);
  if (!drafts.length) drafts = [newDraft()];
  activeId = drafts[0].id;
  showDraft();
  renderList();
  persist();
  $('#studio-confirm-dialog').close();
  toast('草稿已删除');
});
$$('[data-insert]').forEach((button) =>
  button.addEventListener('click', () => insertFormatting(button.dataset.insert)),
);
$('#editor-undo').addEventListener('click', () => historyStep('undo'));
$('#editor-redo').addEventListener('click', () => historyStep('redo'));
$$('[data-editor-view]').forEach((button) =>
  button.addEventListener('click', () => setView(button.dataset.editorView)),
);
$('#preview-device').addEventListener('click', (e) => {
  const on = $('.preview-scroll').classList.toggle('device-preview');
  e.currentTarget.setAttribute('aria-pressed', String(on));
});
$('#editor-focus').addEventListener('click', (e) => {
  const on = document.body.classList.toggle('studio-focus');
  e.currentTarget.textContent = on ? '退出专注' : '专注';
  e.currentTarget.setAttribute('aria-pressed', String(on));
});
fields.body.addEventListener(
  'scroll',
  () => {
    if (!$('#sync-scroll').checked) return;
    const source = fields.body;
    const target = $('.preview-scroll');
    const ratio = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
    target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
  },
  { passive: true },
);
$('#article-preview').addEventListener('click', (e) => {
  const link = e.target.closest('a[data-preview-link]');
  if (link) {
    e.preventDefault();
    toast('这是文章内链接，预览时不跳转');
  }
});
$('#import-example').addEventListener('click', async () => {
  try {
    const response = await fetch('/examples/first-note.md');
    if (!response.ok) throw new Error('示例暂时无法加载，请直接拖入文件。');
    const text = await response.text();
    addDraft(importMarkdown(text, 'first-note.md'));
    showDraft();
    renderList();
    persist();
    toast('示例已导入，可以自由编辑');
  } catch (error) {
    alertUser(error.message);
  }
});
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || document.querySelector('dialog[open]')) return;
  if (e.key.toLowerCase() === 's') {
    e.preventDefault();
    exportArticle();
  }
  if (e.target === fields.body) {
    if (e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('bold');
    }
    if (e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('italic');
    }
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      historyStep(e.shiftKey ? 'redo' : 'undo');
    }
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
});
window.addEventListener('pagehide', persist);
window.addEventListener('beforeunload', (e) => {
  persist();
  if (storageFailed || incomingExternalState) {
    e.preventDefault();
    e.returnValue = '';
  }
});
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    incomingExternalState = true;
    clearTimeout(saveTimer);
    alertUser(
      '另一个标签页修改了草稿。为避免覆盖，当前页已暂停自动保存：请先备份当前内容，再刷新页面并按需恢复。',
    );
    updateSaveStatus('自动保存已暂停', true);
  }
});
load();
if (matchMedia('(max-width: 760px)').matches) setView('edit');
