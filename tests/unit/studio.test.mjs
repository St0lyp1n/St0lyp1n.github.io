import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importMarkdown,
  exportMarkdown,
  newDraft,
  validateDraft,
  validateBackup,
  slugify,
  wordCount,
  localDate,
} from '../../assets/js/studio/model.js';
import { readTextFile } from '../../assets/js/core/files.js';

test('imports plain Markdown without changing its body', () => {
  const body = '# 我的小笔记\n\n你好，世界。\n';
  const draft = importMarkdown(body, '我的笔记.md');
  assert.equal(draft.title, '我的小笔记');
  assert.equal(draft.body, body);
  assert.equal(draft.slug, '我的笔记');
  assert.equal(draft.draft, true);
});
test('YAML round trip preserves Unicode, multiline text, time, and extra fields', () => {
  const draft = importMarkdown(
    '---\ntitle: "引号与：冒号"\ndate: 2026-10-08T08:30:00-07:00\ntags: [技术, Markdown]\ncategories: [笔记]\ndraft: false\nmath: true\ncover:\n  image: /images/forest.jpg\n---\n\n正文 **加粗**\n',
    'demo.md',
  );
  const restored = importMarkdown(exportMarkdown(draft), 'demo.md');
  assert.equal(restored.title, draft.title);
  assert.deepEqual(restored.extra, draft.extra);
  assert.deepEqual(restored.tags, draft.tags);
  assert.equal(restored.originalDate, '2026-10-08T08:30:00-07:00');
  assert.equal(restored.draft, false);
  assert.equal(restored.body, draft.body);
});
test('imports original TOML Hugo format and preserves extra metadata', () => {
  const draft = importMarkdown(
    "+++\ntitle = 'Hello World'\ndate = '2026-05-06T13:50:08+08:00'\ncategories = ['Test']\ntags = ['博客搭建']\nmath = true\n+++\n\nTest",
    'hello-world.md',
  );
  assert.equal(draft.title, 'Hello World');
  assert.equal(draft.sourceFormat, 'toml');
  assert.equal(draft.extra.math, true);
  assert.equal(importMarkdown(exportMarkdown(draft), 'hello-world.md').extra.math, true);
});
test('accepts BOM and CRLF', () =>
  assert.equal(
    importMarkdown('\uFEFF---\r\ntitle: Test\r\n---\r\n\r\nBody', 'test.md').body,
    'Body',
  ));
test('rejects malformed or ambiguous front matter', () => {
  for (const text of [
    '---\ntitle: Missing',
    '---\ntitle: [oops\n---\nBody',
    '---\ntitle: a\ntitle: b\n---\nBody',
    '---\n- array\n---\nBody',
    '---\ntags: [1]\n---\nBody',
    '---\ndraft: "false"\n---\nBody',
  ])
    assert.throws(() => importMarkdown(text, 'bad.md'));
});
test('rejects prototype pollution and excessive YAML aliases', () => {
  assert.throws(() => importMarkdown('---\n__proto__: { polluted: true }\n---\nbody', 'bad.md'));
  assert.equal({}.polluted, undefined);
  const bomb =
    '---\na: &a [x,x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: [*b,*b,*b,*b,*b,*b,*b,*b,*b,*b]\n---\nbody';
  assert.throws(() => importMarkdown(bomb, 'bad.md'));
});
test('prevents path traversal and invalid dates at export', () => {
  const draft = newDraft({ title: 'Test', body: 'Body', slug: '../../escape', date: '2026-02-30' });
  assert.equal(validateDraft(draft).length, 2);
  assert.throws(() => exportMarkdown(draft));
  assert.equal(slugify('../../hello world.md'), 'hello-world');
});
test('backup validation preserves independent drafts and rejects corrupt data', () => {
  const draft = newDraft({ title: 'Test', slug: 'test', body: 'content' });
  const restored = validateBackup({ version: 1, drafts: [draft, draft] });
  assert.equal(restored.length, 2);
  assert.notEqual(restored[0].id, restored[1].id);
  assert.equal(restored[0].body, draft.body);
  assert.throws(() => validateBackup({ version: 99, drafts: [] }));
  assert.throws(() => validateBackup({ version: 1, drafts: [{ title: 'oops' }] }));
});
test('supports mixed Chinese and English word counts and calendar dates', () => {
  assert.equal(wordCount('你好 world hello，世界'), 6);
  assert.equal(localDate(new Date(2026, 9, 8, 0, 0)), '2026-10-08');
});
test('file intake rejects non-Markdown, binary, oversized, and invalid encoding', async () => {
  const good = new File(['# Hello'], 'good.md', { type: 'text/markdown' });
  assert.equal(await readTextFile(good), '# Hello');
  await assert.rejects(readTextFile(new File(['Hello'], 'bad.exe')));
  await assert.rejects(readTextFile(new File(['a\u0000b'], 'binary.md')));
  await assert.rejects(readTextFile(new File([new Uint8Array([0xff, 0xfe, 0xff])], 'encoding.md')));
  await assert.rejects(readTextFile(new File(['123456'], 'size.md'), ['md'], 5));
});
