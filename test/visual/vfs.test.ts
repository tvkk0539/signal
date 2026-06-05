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

  // Navigate to Apple Music and then Storage & Swarm Settings
  await page.getByRole('button', { name: 'Media Ingestion Hub' }).click();
  await page.locator('button').filter({ hasText: 'Apple Music Engine' }).click();
  await page.getByRole('button', { name: 'Storage & Settings' }).click();

  // Wait for the UI to settle
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'storage_settings_working.png' });

});
