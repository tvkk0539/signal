# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test/visual/vfs2.test.ts >> verify Storage UI and Lightning Search UI
- Location: test/visual/vfs2.test.ts:4:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { randomUUID } from 'crypto';
  3  |
  4  | test('verify Storage UI and Lightning Search UI', async ({ page }) => {
  5  |   // Login first
> 6  |   await page.goto('http://localhost:5173', { timeout: 30000 });
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  7  |   await page.evaluate(() => localStorage.clear());
  8  |   await page.reload();
  9  |
  10 |   const email = `testuser_${randomUUID()}@example.com`;
  11 |
  12 |   await page.locator("input[type='email']").waitFor({ state: "visible", timeout: 10000 });
  13 |   await page.fill("input[type='email']", email);
  14 |   await page.fill("input[type='password']", 'password123');
  15 |   await page.getByText("Register here").click();
  16 |   await page.getByRole("button", { name: "Register" }).click();
  17 |
  18 |   await expect(page.getByRole("heading", { name: "Swarm Command Center" })).toBeVisible({ timeout: 5000 });
  19 |   await expect(page.getByText("Relay Active")).toBeVisible({ timeout: 5000 });
  20 |
  21 |   // Navigate to File Explorer and open Lightning Search
  22 |   await page.getByRole('button', { name: 'Dual-State VFS Engines' }).click();
  23 |
  24 |   // Type in Lightning Search to verify it doesn't crash or spam
  25 |   const searchInput = page.locator('input[placeholder="Search millions of files..."]');
  26 |   await searchInput.waitFor({ state: "visible", timeout: 5000 });
  27 |   await searchInput.fill('test search query');
  28 |   await page.waitForTimeout(1000);
  29 |   await page.screenshot({ path: 'lightning_search_working.png' });
  30 | });
  31 |
```