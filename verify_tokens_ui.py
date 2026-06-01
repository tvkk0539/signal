import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720},
            ignore_https_errors=True
        )
        page = await context.new_page()

        print("Navigating to auth gateway...")
        await page.goto("http://localhost:5173")

        print("Registering new profile...")
        await page.click("text=Register here")
        await page.fill("input[type='email']", "commander6@swarm.local")
        await page.fill("input[type='password']", "commander_pass")
        await page.click("button:has-text('Register Profile')")

        await page.wait_for_timeout(2000)

        print("Opening Media Hub...")
        await page.click("button[title='Media Ingestion Hub']", timeout=10000)
        await page.wait_for_timeout(2000)

        # Ah, we need to click "Apple Music Engine" card
        print("Clicking Apple Music Engine...")
        await page.click("text=Apple Music Engine")
        await page.wait_for_timeout(2000)

        print("Opening Configuration Tab...")
        await page.click("button:has-text('Configuration')")

        print("Scrolling to File & Folder Templates...")
        templates_heading = page.locator("h5:has-text('File & Folder Templates')")
        await templates_heading.scroll_into_view_if_needed()

        await page.screenshot(path="/home/jules/verification/apple_music_tokens.png")
        print("Screenshot saved to /home/jules/verification/apple_music_tokens.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
