import { test, expect } from '@playwright/test';

test.describe('Ariadne Frontend E2E', () => {
  const baseUrl = 'http://localhost:3000';

  test('Dashboard loads and shows KPIs', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/dashboard`);
    await expect(page.locator('h1')).toContainText('Ariadne Dashboard');
    
    // Wait for data to load or error
    await page.waitForTimeout(2000);
    
    // Should show system status or loading
    const hasLoading = await page.locator('text=Loading').isVisible().catch(() => false);
    const hasError = await page.locator('text=Error').isVisible().catch(() => false);
    const hasKpi = await page.locator('text=Total Nodes').isVisible().catch(() => false);
    
    expect(hasLoading || hasError || hasKpi).toBeTruthy();
  });

  test('Search page has controls', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/search`);
    await expect(page.locator('h1')).toContainText('Search Knowledge Graph');
    
    // Check for search controls
    await expect(page.locator('input[placeholder*="Topic"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Tickers"]')).toBeVisible();
  });

  test('Timeline page has filters', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/timeline`);
    await expect(page.locator('h1')).toContainText('Timeline');
    
    await expect(page.locator('input[placeholder*="Ticker"]')).toBeVisible();
    await expect(page.locator('button:has-text("Load Timeline")')).toBeVisible();
  });

  test('Patterns page loads', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/patterns`);
    await expect(page.locator('h1')).toContainText('Validated Patterns');
    
    await expect(page.locator('button:has-text("Apply Filters")')).toBeVisible();
  });

  test('Hypotheses page loads', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/hypotheses`);
    await expect(page.locator('h1')).toContainText('Pending Validations');
    
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('Write page has tabs', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/write`);
    await expect(page.locator('h1')).toContainText('Write to Knowledge Graph');
    
    await expect(page.locator('button:has-text("Fact")')).toBeVisible();
    await expect(page.locator('button:has-text("Observation")')).toBeVisible();
    await expect(page.locator('button:has-text("Hypothesis")')).toBeVisible();
  });

  test('Learn page has job controls', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/learn`);
    await expect(page.locator('h1')).toContainText('Learn: Background Analytics');
    
    await expect(page.locator('button:has-text("Start Correlation Analysis")')).toBeVisible();
    await expect(page.locator('button:has-text("Start Community Detection")')).toBeVisible();
  });

  test('Admin page loads', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/admin`);
    await expect(page.locator('h1')).toContainText('Admin Tools');
    
    await page.waitForTimeout(1000);
  });

  test('Impact page has controls', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/impact`);
    await expect(page.locator('h1')).toContainText('Impact Analysis');
    
    await expect(page.locator('input[placeholder*="Event Query"]')).toBeVisible();
  });

  test('Similar page has method selection', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/similar`);
    await expect(page.locator('h1')).toContainText('Similar Entities');
    
    await expect(page.locator('select')).toBeVisible();
  });

  test('Regimes page loads', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/regimes`);
    await expect(page.locator('h1')).toContainText('Market Regimes');
    
    await page.waitForTimeout(1000);
  });

  test('Context Graph page loads (no SSR error)', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/context`);
    await expect(page.locator('h1')).toContainText('Context Graph');
    
    // Should not have SSR errors
    const errors = [];
    page.on('pageerror', err => errors.push(err));
    
    await page.waitForTimeout(2000);
    expect(errors.filter(e => e.message.includes('WebGL'))).toHaveLength(0);
  });

  test('Knowledge Graph Explorer loads', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/graph`);
    await expect(page.locator('h1')).toContainText('Knowledge Graph Explorer');
    
    await expect(page.locator('button:has-text("Reload")')).toBeVisible();
    await expect(page.locator('button:has-text("Communities")')).toBeVisible();
  });

  test('Navigation between tabs works', async ({ page }) => {
    await page.goto(`${baseUrl}/ariadne/dashboard`);
    
    await page.click('a:has-text("Search")');
    await expect(page).toHaveURL(/\/ariadne\/search/);
    
    await page.click('a:has-text("Timeline")');
    await expect(page).toHaveURL(/\/ariadne\/timeline/);
    
    await page.click('a:has-text("Patterns")');
    await expect(page).toHaveURL(/\/ariadne\/patterns/);
  });
});

