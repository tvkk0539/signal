const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[Browser]: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[Browser Error]: ${err.message}`));

  console.log("Navigating to frontend...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  const uniqueEmail = `test_${Date.now()}@example.com`;
  console.log(`Registering as ${uniqueEmail}...`);
  await page.getByText('Need an account? Register').click();
  await page.getByPlaceholder('Email Address').fill(uniqueEmail);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.waitForSelector('text=Swarm Command Center', { timeout: 10000 });
  console.log("Logged in!");

  console.log("Looking for worker node...");
  await page.waitForSelector('text=Active Nodes', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.locator(".p-3").last().click(); // ('.p-3.rounded-lg.cursor-pointer.flex.items-center.gap-3').first().click();

  console.log("Waiting for remotes dropdown...");
  await page.waitForSelector('select', { timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.selectOption('select', 'gurunewgdrive:');

  console.log("Waiting for files to load...");
  await page.waitForTimeout(8000);

  const videoFile = page.locator('text=Cheran Academy');

  if (await videoFile.count() > 0) {
     console.log("Video file found. Attempting to play...");
     await videoFile.first().click(); // Open the modal

     console.log("Waiting for stream to start...");
     await page.waitForTimeout(5000);

     console.log("Taking screenshot 1...");
     await page.screenshot({ path: 'screenshot1.png' });

     await page.waitForTimeout(10000);
     console.log("Taking screenshot 2...");
     await page.screenshot({ path: 'screenshot2.png' });

  } else {
     console.log("Video file not found in directory listing.");
  }

  await browser.close();
})();
