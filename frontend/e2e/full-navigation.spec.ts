import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const evidenceRoot = path.resolve(process.cwd(), process.env.EVIDENCE_DIR ?? '../docs/playwright/latest');
const screenshotsDir = path.join(evidenceRoot, 'screenshots');
const manifestPath = path.join(evidenceRoot, 'manifest.md');

const navRoutes = [
  ['overview', '/'],
  ['demo', '/demo'],
  ['search', '/search'],
  ['products', '/products'],
  ['reviews', '/reviews'],
  ['recommendations', '/recommendations'],
  ['compare', '/compare'],
  ['analytics', '/analytics'],
  ['clusters', '/analytics/clusters'],
  ['pipeline', '/pipeline'],
  ['evaluation', '/evaluation'],
] as const;

const tourTargets = [
  'kpi-cards',
  'health-cards',
  'recent-queries',
  'search-input',
  'search-results',
  'product-grid',
  'featured-products',
  'featured-products',
  'compare-slots',
  'user-input',
  'analytics-overview',
  'analytics-tabs',
  'analytics-tabs',
  'cluster-chart',
  'pipeline-nodes',
  'eval-metrics',
] as const;

let shotSeq = 1;
const manifest: string[] = [
  '# Playwright Evidence Manifest',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Screenshots',
];

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  await page.locator('.app-content').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
}

async function screenshotViewport(page: Page, label: string) {
  const file = `${String(shotSeq++).padStart(3, '0')}-${safeName(label)}.png`;
  const target = path.join(screenshotsDir, file);
  await page.screenshot({ path: target, fullPage: false });
  manifest.push(`- [${label}](screenshots/${file})`);
}

async function screenshotLongPage(page: Page, label: string) {
  await settle(page);
  const content = page.locator('.app-content');
  const metrics = await content.evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));

  const steps = Math.max(1, Math.ceil(metrics.scrollHeight / metrics.clientHeight));
  for (let i = 0; i < Math.min(steps, 4); i += 1) {
    await content.evaluate(
      (el, args) => {
        el.scrollTop = args.top;
      },
      { top: i * metrics.clientHeight },
    );
    await page.waitForTimeout(250);
    await screenshotViewport(page, `${label} viewport ${i + 1}`);
  }
  await content.evaluate((el) => {
    el.scrollTop = 0;
  });
}

async function gotoAndCapture(page: Page, routeName: string, route: string) {
  await page.goto(route);
  await settle(page);
  await expect(page).toHaveURL(new RegExp(`${route.split('?')[0].replace('/', '\\/')}(\\?.*)?$`));
  await screenshotLongPage(page, routeName);
}

async function clickFirstProduct(page: Page) {
  const firstProduct = page.locator('.product-card').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();
  await expect(page).toHaveURL(/\/products\/[^/]+$/);
  await settle(page);
}

test.beforeAll(() => {
  fs.mkdirSync(screenshotsDir, { recursive: true });
});

test.afterAll(() => {
  manifest.push('', '## Videos', '', 'Videos are copied into `videos/` by `npm run test:e2e:evidence`.');
  fs.writeFileSync(manifestPath, `${manifest.join('\n')}\n`);
});

test('all navigation and primary features work with screenshot evidence', async ({ page }) => {
  const apiFailures: string[] = [];
  const pageErrors: string[] = [];

  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500) {
      apiFailures.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await settle(page);
  await page.evaluate(() => localStorage.setItem('ari_locale', 'zh-TW'));
  await page.reload();
  await settle(page);

  for (const [name, route] of navRoutes) {
    const link = page.locator(`.app-sidebar a[href="${route}"]`).first();
    await expect(link).toBeVisible();
    await link.click();
    await settle(page);
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(\\?.*)?$`));
    await expect(link).toHaveClass(/active/);
    await screenshotLongPage(page, `nav ${name}`);
  }

  await page.goto('/');
  await settle(page);
  await page.locator('.app-topbar input').fill('knife set');
  await page.locator('.app-topbar input').press('Enter');
  await expect(page).toHaveURL(/\/search\?q=knife%20set/);
  await page.locator('[data-tour="search-input"]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.keyboard.press('Escape');
  await screenshotLongPage(page, 'topbar search route');

  await page.locator('.app-topbar button').filter({ hasText: 'EN' }).click();
  await page.waitForTimeout(500);
  await screenshotViewport(page, 'language switched to english');
  await page.locator('.app-topbar button').filter({ hasText: '中文' }).click();

  await page.goto('/search');
  await settle(page);
  const searchForm = page.locator('[data-tour="search-input"]');
  await searchForm.locator('input[type="text"]').first().fill('coffee maker');
  await searchForm.locator('button[type="submit"]').click();
  await page.locator('[data-tour="search-results"] .product-card').first().waitFor({ timeout: 30_000 });
  await screenshotLongPage(page, 'search hybrid results');
  await page.keyboard.press('Escape');

  await searchForm.locator('button', { hasText: 'BM25' }).click();
  await searchForm.locator('button[type="submit"]').click();
  await page.locator('[data-tour="search-results"] .product-card').first().waitFor({ timeout: 30_000 });
  await screenshotViewport(page, 'search bm25 mode');

  await searchForm.locator('button', { hasText: 'Vector' }).click();
  await searchForm.locator('button[type="submit"]').click();
  await page.locator('[data-tour="search-results"] .product-card').first().waitFor({ timeout: 30_000 });
  await screenshotViewport(page, 'search vector mode');

  await searchForm.locator('button').last().click();
  await searchForm.locator('button[type="submit"]').click();
  await expect(page.locator('text=BM25').first()).toBeVisible();
  await expect(page.locator('text=VECTOR').first()).toBeVisible();
  await expect(page.locator('text=HYBRID').first()).toBeVisible();
  await screenshotLongPage(page, 'search compare mode');

  await page.goto('/products');
  await settle(page);
  await page.locator('select').first().selectOption('avg_rating');
  await page.locator('.product-card').first().waitFor({ timeout: 30_000 });
  await screenshotLongPage(page, 'products sorted by rating');
  await clickFirstProduct(page);
  await screenshotLongPage(page, 'product detail overview');
  await page.getByRole('tab', { name: /Reviews|評論/ }).click();
  await screenshotViewport(page, 'product detail reviews tab');
  await page.getByRole('tab', { name: /Similar|相似/ }).click();
  await screenshotViewport(page, 'product detail similar tab');

  await page.goto('/reviews');
  await settle(page);
  await page.locator('[data-tour="featured-products"] button').first().click();
  await page.locator('[data-tour="review-filters"]').waitFor({ timeout: 30_000 });
  await page.locator('[data-tour="review-filters"] button').nth(1).click();
  await page.locator('[data-tour="review-filters"] input').first().fill('quality');
  await page.waitForTimeout(800);
  await screenshotLongPage(page, 'reviews filters and timeline');

  await page.goto('/recommendations');
  await settle(page);
  await page.locator('[data-tour="user-input"] button').filter({ hasText: /則|reviews|Content|Hybrid|個人化|混合/ }).first().click();
  await page.locator('.product-card').first().waitFor({ timeout: 30_000 });
  await screenshotLongPage(page, 'recommendations selected user');

  await page.goto('/compare');
  await settle(page);
  const compareSlots = page.locator('[data-tour="compare-slots"]');
  await compareSlots.locator('input').first().click();
  await page.locator('[data-tour="compare-slots"] button').filter({ hasText: /★/ }).first().click();
  await compareSlots.locator('input').first().click();
  await page.locator('[data-tour="compare-slots"] button').filter({ hasText: /★/ }).first().click();
  await page.waitForTimeout(2_000);
  await screenshotLongPage(page, 'compare two products');

  await page.goto('/analytics');
  await settle(page);
  await page.locator('[role="tab"]').nth(1).click();
  await screenshotViewport(page, 'analytics product intelligence tab');
  await page.locator('[role="tab"]').nth(2).click();
  await screenshotLongPage(page, 'analytics trends tab');

  await page.goto('/analytics/clusters');
  await settle(page);
  await page.locator('[data-tour="cluster-chart"]').waitFor({ timeout: 30_000 });
  await page.locator('button').filter({ hasText: /1,000/ }).click();
  await screenshotLongPage(page, 'embedding clusters');

  await page.goto('/pipeline');
  await settle(page);
  await page.locator('[data-tour="pipeline-nodes"]').waitFor({ timeout: 30_000 });
  await page.locator('button').filter({ hasText: /下一步|Next/ }).first().click();
  await screenshotLongPage(page, 'pipeline stepper');

  await page.goto('/evaluation');
  await settle(page);
  await page.locator('[data-tour="eval-metrics"]').waitFor({ timeout: 30_000 });
  await screenshotLongPage(page, 'evaluation metrics');

  await page.goto('/demo');
  await settle(page);
  await page.getByRole('button', { name: /範例|Sample/ }).first().click();
  await page.waitForTimeout(800);
  await screenshotLongPage(page, 'demo sample pipeline');

  await page.goto('/');
  await settle(page);
  await page.locator('button[title="平台導覽"], button[title="Guided Platform Tour"]').first().click();
  for (let i = 0; i < tourTargets.length; i += 1) {
    await page.locator(`[data-tour="${tourTargets[i]}"]`).waitFor({ state: 'visible', timeout: 30_000 });
    await screenshotViewport(page, `guided tour step ${i + 1}`);
    if (i < tourTargets.length - 1) {
      await page.getByRole('button', { name: /^(下一步|Next)$/ }).first().click();
      await page.waitForTimeout(900);
    }
  }
  await page.getByRole('button', { name: /結束導覽|End Tour/ }).last().click();

  expect(apiFailures).toEqual([]);
  expect(pageErrors).toEqual([]);
});
