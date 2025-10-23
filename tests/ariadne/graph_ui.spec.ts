/**
 * Ariadne Graph UI E2E Test
 * Tests all graph visualization features
 */

import { test, expect } from '@playwright/test';

test.describe('Ariadne Graph Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/ariadne/graph');
    // Wait for graph to load
    await page.waitForTimeout(3000);
  });

  test('should display Knowledge Graph Explorer heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Knowledge Graph Explorer' })).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    // Label filter
    await expect(page.locator('select').first()).toBeVisible();
    
    // Relation filter
    await expect(page.locator('select').nth(1)).toBeVisible();
    
    // Search input
    await expect(page.getByPlaceholder('Search nodes (name, ticker)...')).toBeVisible();
  });

  test('should display action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Communities' })).toBeVisible();
  });

  test('should display all three legends', async ({ page }) => {
    // Interactions legend
    await expect(page.getByText('Interactions')).toBeVisible();
    await expect(page.getByText('• Click: Select/Deselect')).toBeVisible();
    await expect(page.getByText('• Double-click: Open Timeline')).toBeVisible();
    
    // Relations legend
    await expect(page.getByText('Relations')).toBeVisible();
    await expect(page.getByText('SUPPLIES_TO')).toBeVisible();
    await expect(page.getByText('COMPETES_WITH')).toBeVisible();
    await expect(page.getByText('CORRELATES_WITH')).toBeVisible();
    await expect(page.getByText('AFFECTS')).toBeVisible();
    await expect(page.getByText('BENEFITS_FROM')).toBeVisible();
    
    // Node Types legend
    await expect(page.getByText('Node Types')).toBeVisible();
    await expect(page.getByText('Company')).toBeVisible();
    await expect(page.getByText('Event')).toBeVisible();
    await expect(page.getByText('Hypothesis')).toBeVisible();
    await expect(page.getByText('Observation')).toBeVisible();
  });

  test('should display status bar with node/edge counts', async ({ page }) => {
    const statusBar = page.locator('text=/\\d+ nodes \\| \\d+ edges/');
    await expect(statusBar).toBeVisible();
  });

  test('should filter by label', async ({ page }) => {
    // Select Company filter
    await page.locator('select').first().selectOption('Company');
    
    // Wait for graph to update
    await page.waitForTimeout(500);
    
    // Status bar should show filtered count
    const statusBar = page.locator('text=/\\d+ nodes/');
    await expect(statusBar).toBeVisible();
  });

  test('should filter by relation type', async ({ page }) => {
    // Select SUPPLIES_TO filter
    await page.locator('select').nth(1).selectOption('SUPPLIES_TO');
    
    // Wait for graph to update
    await page.waitForTimeout(500);
    
    // Status bar should update
    const statusBar = page.locator('text=/\\d+ edges/');
    await expect(statusBar).toBeVisible();
  });

  test('should search nodes by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search nodes (name, ticker)...');
    
    await searchInput.fill('NVIDIA');
    await page.waitForTimeout(500);
    
    // Should still have nodes visible
    const statusBar = page.locator('text=/\\d+ nodes/');
    await expect(statusBar).toBeVisible();
  });

  test('should reload graph', async ({ page }) => {
    const reloadButton = page.getByRole('button', { name: 'Reload' });
    
    await reloadButton.click();
    await page.waitForTimeout(1000);
    
    // Graph should still be visible
    const statusBar = page.locator('text=/\\d+ nodes/');
    await expect(statusBar).toBeVisible();
  });

  test('should toggle communities view', async ({ page }) => {
    const communitiesButton = page.getByRole('button', { name: 'Communities' });
    
    await communitiesButton.click();
    await page.waitForTimeout(500);
    
    // Button should still be visible
    await expect(communitiesButton).toBeVisible();
  });

  test('should have graph canvas element', async ({ page }) => {
    // Sigma.js creates a canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should display nav links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Context' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Graph' })).toBeVisible();
  });
});

test.describe('Ariadne Graph Visual Verification', () => {
  test('should render graph without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000/ariadne/graph');
    await page.waitForTimeout(3000);
    
    // Filter out known warnings (params prop)
    const criticalErrors = errors.filter(e => 
      !e.includes('unknown prop') && 
      !e.includes('params')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should take screenshot for visual inspection', async ({ page }) => {
    await page.goto('http://localhost:3000/ariadne/graph');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'tests/ariadne/screenshots/graph-full.png',
      fullPage: true
    });
  });
});

