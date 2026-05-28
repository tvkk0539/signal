from playwright.sync_api import sync_playwright
import time
import os
import re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:5173", timeout=30000)
    page.evaluate("localStorage.clear()")
    page.reload()

    page.locator("input[placeholder='Email Address']").wait_for(state="visible", timeout=10000)
    page.locator("input[placeholder='Email Address']").fill(f"testuser_{int(time.time())}@example.com")
    page.locator("input[placeholder='Password']").fill("password123")
    page.get_by_text("Need an account? Register").click()
    time.sleep(1)
    page.get_by_role("button", name="Register").click()

    page.get_by_role("heading", name="Swarm Command Center").wait_for(state="visible", timeout=5000)

    # Refresh to make sure connection state is updated
    time.sleep(5)
    page.reload()
    time.sleep(2)

    # Click the worker
    worker_locator = page.locator(".font-mono.text-xs.truncate").first
    worker_locator.wait_for(state="visible", timeout=10000)
    worker_locator.click()

    # Wait for the select element instead
    page.locator("select").wait_for(state="visible", timeout=10000)
    print("Found Explorer!")

    # 6. Change file system to gurunewgdrive
    try:
        page.locator("select").select_option("gurunewgdrive", timeout=15000)
    except:
        # Fallback to click if select option fails due to DOM update
        page.locator("select").click()
        page.locator("option[value='gurunewgdrive']").click()
        page.locator("select").dispatchEvent("change")

    # 7. Wait for directory to load
    page.get_by_text("OST").wait_for(state="visible", timeout=15000)
    print("Found OST")

    # Handle JS confirm dialog automatically for downloading
    page.on("dialog", lambda dialog: dialog.accept())

    page.get_by_text("OST").click()
    page.get_by_text("English").wait_for(state="visible", timeout=15000)
    page.get_by_text("English").click()

    page.get_by_text("Interstellar OST Collections").wait_for(state="visible", timeout=15000)
    page.get_by_text("Interstellar OST Collections").click()

    page.get_by_text("interstellar (2014)").wait_for(state="visible", timeout=15000)
    page.get_by_text("interstellar (2014)").click()

    page.get_by_text("Interstellar 2CD").wait_for(state="visible", timeout=15000)
    page.get_by_text("Interstellar 2CD").click()

    page.get_by_text("Expanded Edition").wait_for(state="visible", timeout=15000)
    page.get_by_text("Expanded Edition").click()

    page.get_by_text("CD 1").wait_for(state="visible", timeout=15000)
    page.get_by_text("CD 1").click()

    page.get_by_text("02. Cornfield Chase.flac").wait_for(state="visible", timeout=15000)

    print("Found file to download, clicking...")
    with page.expect_download(timeout=120000) as download_info:
        page.get_by_text("02. Cornfield Chase.flac").click()

    download = download_info.value
    print(f"Downloaded file: {download.suggested_filename}")

    download_path = os.path.join(os.getcwd(), download.suggested_filename)
    download.save_as(download_path)

    file_size = os.path.getsize(download_path)
    print(f"File size: {file_size} bytes")

    if file_size > 20000000:
        print("Success! File downloaded properly.")
    else:
        print("Fail! File is too small.")

    browser.close()
