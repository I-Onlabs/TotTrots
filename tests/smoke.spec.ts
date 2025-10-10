import { test, expect } from '@playwright/test';

test.describe('Game Smoke Tests', () => {
  test('game loads and HUD counter increments', async ({ page }) => {
    // Navigate to the game
    await page.goto('/');
    
    // Wait for the game to load
    await page.waitForSelector('#game-area', { timeout: 10000 });
    
    // Wait for the loading screen to disappear
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 });
    
    // Wait for the game HUD to be visible
    await page.waitForSelector('.game-hud', { timeout: 5000 });
    
    // Get initial score value
    const scoreElement = page.locator('#game-score');
    await expect(scoreElement).toBeVisible();
    
    const initialScore = await scoreElement.textContent();
    console.log('Initial score:', initialScore);
    
    // Wait for the game to start running (HUD should be visible)
    await expect(page.locator('.game-score')).toContainText('Score:');
    await expect(page.locator('.game-level')).toContainText('Level:');
    await expect(page.locator('.game-lives')).toContainText('3');
    
    // Wait for score to potentially increment (game loop running)
    // We'll wait up to 10 seconds for any score change
    let scoreChanged = false;
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds
    
    while (!scoreChanged && attempts < maxAttempts) {
      await page.waitForTimeout(500);
      const currentScore = await scoreElement.textContent();
      
      if (currentScore !== initialScore) {
        scoreChanged = true;
        console.log('Score changed from', initialScore, 'to', currentScore);
        break;
      }
      
      attempts++;
    }
    
    // Verify the game is responsive (HUD elements are still visible)
    await expect(page.locator('.game-hud')).toBeVisible();
    await expect(page.locator('#game-score')).toBeVisible();
    await expect(page.locator('#game-level')).toBeVisible();
    await expect(page.locator('#game-lives')).toBeVisible();
    
    // Verify game area is focusable (accessibility)
    await expect(page.locator('#game-area')).toBeFocused();
    
    console.log('Smoke test completed successfully');
  });

  test('game UI elements are accessible', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('#game-area', { timeout: 10000 });
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 });
    
    // Check that main UI elements are present and accessible
    await expect(page.locator('#game-area')).toHaveAttribute('role', 'application');
    await expect(page.locator('#game-area')).toHaveAttribute('aria-label', 'Game area');
    await expect(page.locator('#game-area')).toHaveAttribute('tabindex', '0');
    
    // Check HUD accessibility
    await expect(page.locator('#game-score')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#game-score')).toHaveAttribute('aria-label', 'Current score');
    await expect(page.locator('#game-level')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#game-level')).toHaveAttribute('aria-label', 'Current level');
    await expect(page.locator('#game-lives')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#game-lives')).toHaveAttribute('aria-label', 'Lives remaining');
    
    // Check that skip links are present
    await expect(page.locator('.skip-link')).toHaveCount(3);
  });

  test('game responds to keyboard input', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('#game-area', { timeout: 10000 });
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 });
    
    // Focus on game area
    await page.locator('#game-area').focus();
    
    // Test escape key opens pause menu
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu')).toBeVisible();
    await expect(page.locator('#pause-menu')).toHaveAttribute('aria-hidden', 'false');
    
    // Test escape key closes pause menu
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu')).toHaveAttribute('aria-hidden', 'true');
  });

  test('game loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
    
    await page.goto('/');
    
    // Wait for game to load
    await page.waitForSelector('#game-area', { timeout: 10000 });
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 10000 });
    
    // Wait a bit more for any async operations
    await page.waitForTimeout(2000);
    
    // Check for console errors
    expect(consoleErrors).toHaveLength(0);
    
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }
  });
});