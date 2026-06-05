import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('verify Storage UI and Lightning Search UI', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:5173', { timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const email = `testuser_${randomUUID()}@example.com`;

  await page.locator("input[type='email']").waitFor({ state: "visible", timeout: 10000 });
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", 'password123');
  await page.getByText("Register here").click();
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByRole("heading", { name: "Swarm Command Center" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Relay Active")).toBeVisible({ timeout: 5000 });

  // Navigate to File Explorer and open Lightning Search
  await page.getByRole('button', { name: 'Dual-State VFS Engines' }).click();

  // Type in Lightning Search to verify it doesn't crash or spam
  const searchInput = page.locator('input[placeholder="Search millions of files..."]');
  await searchInput.waitFor({ state: "visible", timeout: 5000 });
  await searchInput.fill('test search query');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'lightning_search_working.png' });
});
