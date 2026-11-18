import { test, expect } from '@playwright/test';

test('reader journey: search, read, bookmark, recover', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const response = await page.request.get('/index.json');
  expect(response.ok()).toBe(true);
  const posts = (await response.json()).filter((item) => item.kind === 'posts');
  await page.goto('/');
  await expect(page.locator('#home-posts .post-card')).toHaveCount(Math.min(3, posts.length));
  // Content is editable: a garden with no published articles is valid too.
  if (!posts.length) {
    await page.goto('/posts/');
    await expect(page.locator('#list-empty')).toBeVisible();
    expect(errors).toEqual([]);
    return;
  }
  const post = posts[0];
  await page.locator('[data-action=search]').click();
  await page.locator('#search-input').fill(post.title);
  const result = page.locator('.search-result').filter({ hasText: post.title }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL((url) => decodeURI(url.pathname) === decodeURI(post.url));
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
  const cards = await page
    .locator('#post-list .post-card')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({ category: node.dataset.category, date: node.dataset.date })),
    );
  const categories = page.locator('[data-filter]:not([data-filter="all"])');
  if (await categories.count()) {
    const category = await categories.first().getAttribute('data-filter');
    await categories.first().click();
    await expect(page.locator('#post-list .post-card:visible')).toHaveCount(
      cards.filter((card) => card.category.split(' ').includes(category)).length,
    );
  }
  await page.locator('#post-search').fill('zzzz');
  await expect(page.locator('#list-empty')).toBeVisible();
  await page.locator('[data-action=reset-filters]').click();
  await expect(page.locator('#post-list .post-card:visible')).toHaveCount(cards.length);
  await page.selectOption('#post-sort', 'oldest');
  const dates = await page
    .locator('#post-list .post-card')
    .evaluateAll((nodes) => nodes.map((node) => node.dataset.date));
  expect(dates).toEqual(cards.map((card) => card.date).sort());
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
