import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const markdown =
  '---\ntitle: 拖入的文章\ndate: 2026-10-08T12:00:00+08:00\ndescription: 一个测试摘要\ncategories: [技术]\ntags: [Markdown, 测试]\ndraft: false\nmath: true\n---\n\n## 实时预览\n\n这是一段 **加粗文字**。\n\n| 标题 | 数值 |\n| --- | --- |\n| A | 42 |\n\n- [x] 任务完成\n';
const upload = (page, contents = markdown, name = 'test-note.md') =>
  page
    .locator('#markdown-files')
    .setInputFiles({ name, mimeType: 'text/markdown', buffer: Buffer.from(contents) });

test.beforeEach(async ({ page }) => {
  await page.goto('/studio/');
});

test('drag and drop imports a real Markdown file, metadata and live preview', async ({ page }) => {
  const transfer = await page.evaluateHandle((text) => {
    const dt = new DataTransfer();
    dt.items.add(new File([text], 'dropped.md', { type: 'text/markdown' }));
    return dt;
  }, markdown);
  await page.locator('#drop-zone').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.locator('#article-title')).toHaveValue('拖入的文章');
  await expect(page.locator('#article-preview strong')).toContainText('加粗文字');
  await expect(page.locator('#article-preview table')).toBeAttached();
  await expect(page.locator('#article-preview input[type=checkbox]')).toBeChecked();
  await expect(page.locator('#article-preview input[type=checkbox]')).toBeDisabled();
  await page.locator('#article-title').fill('编辑后的标题');
  await expect(page.locator('#article-preview>h1')).toHaveText('编辑后的标题');
  await page.locator('#article-body').fill('## 新内容\n\n这是 **实时** 更新。');
  await expect(page.locator('#article-preview strong')).toHaveText('实时');
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.locator('#article-title')).toHaveValue('编辑后的标题');
  expect(await page.locator('#article-body').inputValue()).toContain('新内容');
});

test('exports editable Markdown while retaining original metadata', async ({ page }) => {
  await upload(page);
  await expect(page.locator('#article-title')).toHaveValue('拖入的文章');
  await page.locator('#article-title').fill('导出标题');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export-article').click();
  const download = await downloadEvent;
  const content = await readFile(await download.path(), 'utf8');
  expect(download.suggestedFilename()).toBe('test-note.md');
  expect(content).toContain('title: 导出标题');
  expect(content).toContain('math: true');
  expect(content).toContain('draft: false');
  expect(content).toContain('2026-10-08T12:00:00+08:00');
  expect(content).toContain('## 实时预览');
});

test('supports multiple files and never overwrites same-name imports', async ({ page }) => {
  await upload(page);
  await expect(page.locator('.draft-item')).toHaveCount(1);
  await upload(page, markdown.replace('拖入的文章', '第二篇文章'));
  await expect(page.locator('.draft-item')).toHaveCount(2);
  await expect(page.locator('#studio-alert')).toContainText('没有覆盖');
  await page.locator('.draft-item').filter({ hasText: '拖入的文章' }).click();
  await expect(page.locator('#article-title')).toHaveValue('拖入的文章');
  await page.locator('#duplicate-draft').click();
  await expect(page.locator('.draft-item')).toHaveCount(3);
  await page.locator('#delete-draft').click();
  await expect(page.locator('#studio-confirm-dialog')).toBeVisible();
  await page.locator('#cancel-delete').click();
  await expect(page.locator('.draft-item')).toHaveCount(3);
  await page.locator('#delete-draft').click();
  await page.locator('#confirm-delete').click();
  await expect(page.locator('.draft-item')).toHaveCount(2);
});

test('imports TOML and displays malformed-file errors without losing work', async ({ page }) => {
  await upload(
    page,
    "+++\ntitle = 'TOML article'\ndate = '2026-10-08'\nmath = true\n+++\n\nOriginal body",
    'toml.md',
  );
  await expect(page.locator('#article-title')).toHaveValue('TOML article');
  await upload(page, '---\ntitle: [broken\n---\nbody', 'broken.md');
  await expect(page.locator('#studio-alert')).toContainText('YAML');
  await expect(page.locator('#article-title')).toHaveValue('TOML article');
  await upload(page, 'invalid', 'file.exe');
  await expect(page.locator('#studio-alert')).toContainText('请选择');
  await expect(page.locator('.draft-item')).toHaveCount(1);
});

test('format toolbar supports undo and redo without losing selection', async ({ page }) => {
  await page.locator('#article-body').fill('hello');
  await page.locator('#article-body').evaluate((el) => {
    el.focus();
    el.setSelectionRange(0, 5);
  });
  await page.locator('[data-insert=bold]').click();
  await expect(page.locator('#article-body')).toHaveValue('**hello**');
  await page.locator('#editor-undo').click();
  await expect(page.locator('#article-body')).toHaveValue('hello');
  await page.locator('#editor-redo').click();
  await expect(page.locator('#article-body')).toHaveValue('**hello**');
  await page.locator('[data-editor-view=preview]').click();
  await expect(page.locator('.source-pane')).toBeHidden();
  await expect(page.locator('#article-preview strong')).toHaveText('hello');
  await page.locator('#preview-device').click();
  await expect(page.locator('.preview-scroll')).toHaveClass(/device-preview/);
});

test('backup round trip merges without erasing current drafts', async ({ page }) => {
  await upload(page);
  await expect(page.locator('#article-title')).toHaveValue('拖入的文章');
  const event = page.waitForEvent('download');
  await page.locator('#backup-all').click();
  const download = await event;
  const buffer = await readFile(await download.path());
  await page.locator('#new-draft').click();
  await page.locator('#article-title').fill('现有的新草稿');
  await page
    .locator('#backup-input')
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer });
  await expect(page.locator('.draft-item')).toHaveCount(3);
  await expect(page.locator('.draft-item').filter({ hasText: '现有的新草稿' })).toHaveCount(1);
});

test('preview strips XSS, blocks remote image requests, and keeps editing context', async ({
  page,
}) => {
  const requested = [];
  page.on('request', (r) => {
    if (r.url().includes('evil.example')) requested.push(r.url());
  });
  await page
    .locator('#article-body')
    .fill(
      '<script>window.pwned=true</script>\n\n<img src="https://evil.example/image.png" onerror="window.pwned=true">\n\n[click](javascript:alert(1))\n\n[local](/posts/)\n\n<iframe src="https://evil.example"></iframe>',
    );
  await page.locator('[data-editor-view=preview]').click();
  await expect(page.locator('#article-preview script,#article-preview iframe')).toHaveCount(0);
  await expect(page.locator('#article-preview [onerror]')).toHaveCount(0);
  await expect(page.locator('#article-preview .image-placeholder')).toBeVisible();
  await expect(page.locator('#article-preview a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  expect(requested).toHaveLength(0);
  await page.locator('#article-preview a').filter({ hasText: 'local' }).click();
  await expect(page).toHaveURL(/\/studio\/$/);
});

test('reports storage failures truthfully and still exports the current draft', async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await upload(page);
  await expect(page.locator('#save-status')).toContainText('尚未保存');
  await expect(page.locator('#studio-alert')).toContainText('空间不足');
  const event = page.waitForEvent('download');
  await page.locator('#export-article').click();
  expect((await event).suggestedFilename()).toBe('test-note.md');
});

test('cross-tab updates pause autosave instead of overwriting other work', async ({
  page,
  context,
}) => {
  await upload(page);
  await expect(page.locator('#save-status')).toContainText('已保存在');
  const second = await context.newPage();
  await second.goto('/studio/');
  await second.locator('#article-title').fill('另一标签页的标题');
  await expect(page.locator('#studio-alert')).toContainText('另一个标签页');
  await page.locator('#article-title').fill('这个标签页的修改');
  await page.waitForTimeout(450);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('garden-studio-v1')));
  expect(saved.drafts[0].title).toBe('另一标签页的标题');
  await second.close();
});

test('writing screen fits the viewport and help remains accessible', async ({ page }) => {
  await upload(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#studio-help').click();
  await expect(page.locator('#studio-help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#studio-help-dialog')).toBeHidden();
  await page.locator('#editor-focus').click();
  await expect(page.locator('body')).toHaveClass(/studio-focus/);
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.locator('#editor-focus').click();
});
