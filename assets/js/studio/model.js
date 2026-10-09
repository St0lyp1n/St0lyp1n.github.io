import { parseDocument, stringify } from 'yaml';
import { parse as parseToml } from 'smol-toml';

export const STORAGE_KEY = 'garden-studio-v1';
export const SCHEMA_VERSION = 1;
export const MAX_DRAFTS = 100;
export const MAX_BODY_LENGTH = 1500000;
const dangerous = new Set(['__proto__', 'prototype', 'constructor']);
const knownFields = new Set([
  'title',
  'date',
  'description',
  'tags',
  'categories',
  'draft',
  'slug',
]);

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function slugify(value) {
  return (
    String(value)
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\.(md|markdown)$/i, '')
      .replace(/[^\p{L}\p{N}-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'untitled'
  );
}

export function newDraft(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: '',
    slug: '',
    description: '',
    date: localDate(),
    categories: ['生活'],
    tags: [],
    draft: true,
    body: '',
    extra: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function list(value, name) {
  if (value == null) return [];
  const array = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(array) || array.some((x) => typeof x !== 'string'))
    throw new Error(`${name} 必须是文字或文字列表。`);
  return [...new Set(array.map((x) => x.trim()).filter(Boolean))];
}

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => !dangerous.has(key));
}

function safeTree(value, depth = 0) {
  if (depth > 20) throw new Error('文章信息嵌套层级过多。');
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => safeTree(v, depth + 1));
  if (value && typeof value === 'object') {
    if (!plainObject(value)) throw new Error('文章信息包含不支持的字段。');
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, safeTree(v, depth + 1)]));
  }
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  throw new Error('文章信息包含不支持的数据类型。');
}

export function importMarkdown(source, filename = 'untitled.md') {
  if (typeof source !== 'string' || source.length > MAX_BODY_LENGTH)
    throw new Error('文件内容过大或不是文字。');
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  let body = text,
    metadata = {},
    format = 'none';
  const opening = /^(---|\+\+\+)\s*\n/.exec(text);
  if (opening) {
    const delimiter = opening[1];
    const lines = text.split('\n');
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === delimiter);
    if (end < 0) throw new Error('文章信息没有结束标记，请补上末尾的 ' + delimiter + '。');
    const raw = lines.slice(1, end).join('\n');
    if (delimiter === '---') {
      const doc = parseDocument(raw, { uniqueKeys: true, schema: 'core' });
      if (doc.errors.length)
        throw new Error(`YAML 文章信息有误：${doc.errors[0].message.split('\n')[0]}`);
      metadata = doc.toJS({ maxAliasCount: 30 }) ?? {};
      format = 'yaml';
    } else {
      metadata = parseToml(raw);
      format = 'toml';
    }
    if (!plainObject(metadata)) throw new Error('文章信息必须是字段列表。');
    metadata = safeTree(metadata);
    body = lines
      .slice(end + 1)
      .join('\n')
      .replace(/^\n/, '');
  }
  for (const key of ['title', 'description', 'summary', 'slug']) {
    if (metadata[key] != null && typeof metadata[key] !== 'string')
      throw new Error(`${key} 必须是文字。`);
  }
  if (metadata.draft != null && typeof metadata.draft !== 'boolean')
    throw new Error('draft 必须是 true 或 false。');
  const title =
    metadata.title || /^#\s+(.+)$/m.exec(body)?.[1] || filename.replace(/\.(md|markdown)$/i, '');
  const date = String(metadata.date || localDate()).slice(0, 10);
  const extra = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !knownFields.has(key)),
  );
  // Preserve a timestamp verbatim until the date field is explicitly changed.
  const originalDate = metadata.date ? String(metadata.date) : '';
  return newDraft({
    title,
    slug: slugify(metadata.slug || filename),
    description: metadata.description || metadata.summary || '',
    date,
    originalDate,
    categories: list(metadata.categories, 'categories'),
    tags: list(metadata.tags, 'tags'),
    draft: metadata.draft ?? true,
    body,
    extra,
    sourceName: filename,
    sourceFormat: format,
  });
}

export function validateDraft(draft) {
  const errors = [];
  if (!draft.title?.trim()) errors.push('请填写文章标题。');
  if (!/^[\p{L}\p{N}][\p{L}\p{N}-]{0,79}$/u.test(draft.slug || ''))
    errors.push('文件名请使用文字、数字或短横线，最多 80 个字符。');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.date || '') ||
    Number.isNaN(Date.parse(draft.date)) ||
    new Date(draft.date).toISOString().slice(0, 10) !== draft.date
  )
    errors.push('请选择有效的文章日期。');
  if (!draft.body?.trim()) errors.push('请写一点正文，或拖入 Markdown 文件。');
  if (draft.body?.length > MAX_BODY_LENGTH) errors.push('正文过大，请拆分文章。');
  return errors;
}

export function exportMarkdown(draft) {
  const errors = validateDraft(draft);
  if (errors.length) throw new Error(errors.join('\n'));
  const metadata = {
    ...safeTree(draft.extra || {}),
    title: draft.title.trim(),
    date:
      draft.originalDate?.slice(0, 10) === draft.date
        ? draft.originalDate
        : `${draft.date}T12:00:00+08:00`,
    description: draft.description.trim(),
    categories: list(draft.categories, 'categories'),
    tags: list(draft.tags, 'tags'),
    draft: Boolean(draft.draft),
  };
  return `---\n${stringify(metadata, { lineWidth: 0 }).trimEnd()}\n---\n\n${draft.body.replace(/\r\n/g, '\n').trimEnd()}\n`;
}

export function wordCount(text) {
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  const rest = text.replace(/[\u3400-\u9fff]/g, ' ').match(/[\p{L}\p{N}]+/gu)?.length || 0;
  return cjk + rest;
}

export function validateBackup(value) {
  if (
    !plainObject(value) ||
    value.version !== SCHEMA_VERSION ||
    !Array.isArray(value.drafts) ||
    value.drafts.length > MAX_DRAFTS
  )
    throw new Error('不是兼容的写作台备份，或草稿超过 100 篇。');
  return value.drafts.map((item) => {
    if (!plainObject(item) || typeof item.body !== 'string' || item.body.length > MAX_BODY_LENGTH)
      throw new Error('备份包含损坏的草稿。');
    for (const key of ['title', 'slug', 'description', 'date'])
      if (typeof item[key] !== 'string') throw new Error(`备份字段 ${key} 无效。`);
    if (typeof item.draft !== 'boolean') throw new Error('备份字段 draft 无效。');
    return newDraft({
      title: item.title,
      slug: item.slug,
      description: item.description,
      date: item.date,
      body: item.body,
      tags: list(item.tags, 'tags'),
      categories: list(item.categories, 'categories'),
      draft: Boolean(item.draft),
      extra: safeTree(item.extra || {}),
      originalDate: typeof item.originalDate === 'string' ? item.originalDate : '',
      sourceName: typeof item.sourceName === 'string' ? item.sourceName : '',
    });
  });
}
