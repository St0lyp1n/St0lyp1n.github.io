import { test, expect } from '@playwright/test';

test('reader journey: search, read, bookmark, recover', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#home-posts .post-card')).toHaveCount(3);
  await page.locator('[data-action=search]').click();
  await page.locator('#search-input').fill('循环');
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/agent-loop/);
  await page.locator('.article-tools [data-bookmark]').click();
  await expect(page.locator('.article-tools [data-bookmark]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/bookmarks/');
  await expect(page.locator('.saved-row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.saved-row')).toHaveCount(1);
  await page.locator('.saved-row button').click();
  await expect(page.locator('.saved-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('filters, ordering, and navigation stay usable after refactoring', async ({
  page,
}, testInfo) => {
  await page.goto('/posts/');
  await page.locator('[data-filter=技术]').click();
  await expect(page.locator('#post-list .post-card:visible')).toHaveCount(3);
  await page.locator('#post-search').fill('zzzz');
  await expect(page.locator('#list-empty')).toBeVisible();
  await page.locator('[data-action=reset-filters]').click();
  await expect(page.locator('#post-list .post-card:visible')).toHaveCount(9);
  await page.selectOption('#post-sort', 'oldest');
  await expect(page.locator('#post-list .post-card').first()).toHaveAttribute(
    'data-title',
    'Hello World',
  );
  if (testInfo.project.name === 'mobile') {
    await page.locator('.mobile-menu').click();
    await expect(page.locator('#sidebar')).not.toHaveAttribute('inert', '');
  }
  await page.locator('.sidebar-write').click();
  await expect(page).toHaveURL(/studio/);
});
test('all public sections fit without horizontal overflow or runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of [
    '/',
    '/posts/',
    '/notes/',
    '/projects/',
    '/library/',
    '/gallery/',
    '/links/',
    '/about/',
    '/lab/',
    '/bookmarks/',
    '/archives/',
    '/now/',
    '/discover/',
    '/colophon/',
    '/search/',
    '/tags/',
    '/categories/',
  ]) {
    const response = await page.goto(path);
    expect(response.status(), path).toBe(200);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('lab and gallery interactions remain functional', async ({ page }) => {
  await page.goto('/gallery/');
  await page.locator('[data-photo]').first().click();
  await expect(page.locator('#photo-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/lab/');
  await page.locator('#timer-start').click();
  await expect(page.locator('#timer')).toHaveText('24:59', { timeout: 2500 });
  await page.locator('#timer-reset').click();
  await expect(page.locator('#timer')).toHaveText('25:00');
  await page.locator('[data-minutes="5"]').click();
  await expect(page.locator('#timer')).toHaveText('05:00');
  const palette = await page.locator('#palette').textContent();
  await page.locator('#new-palette').click();
  expect(await page.locator('#palette').textContent()).not.toBe(palette);
  await page.locator('#markdown-input').fill('# 测试\n\n**粗体**');
  await expect(page.locator('#markdown-preview strong')).toHaveText('粗体');
});
