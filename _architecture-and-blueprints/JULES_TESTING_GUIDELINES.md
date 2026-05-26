# Jules Testing & Verification Guidelines

This document provides explicit instructions for AI coding agents (like Jules) regarding the automated verification and testing of this monorepo.

**CRITICAL DIRECTIVE: Prioritize Code Preservation Over Flaky Tests.**
Do not allow a session to crash or consume excessive turns debugging automated UI tests (Playwright). If functional code has been written and verified manually (or appears logically sound), do not get stuck in a loop trying to perfect a screenshot script.

## 1. Frontend UI Verification (Playwright)

When verifying React frontend changes, adhere to these strict rules to prevent timeouts and false failures:

### A. Environment Booting
*   Ensure the Relay Server (`npm run start:relay`) and Backend Worker (`npm run start:backend`) are fully booted *before* starting the Frontend dev server.
*   Wait at least 5 seconds after issuing start commands before running Playwright scripts to allow Node processes to bind to their ports.

### B. Playwright Script Standards
*   **Timeouts:** Increase default timeouts. The Vite dev server can be slow on its first compile. Use `timeout=30000` (30 seconds) for initial page loads.
*   **Network Idle:** Always wait for the network to settle before interacting: `page.wait_for_load_state("networkidle")`.
*   **Locators:** Use explicit, user-facing locators (e.g., `page.get_by_placeholder("Email Address")`). Avoid brittle CSS selectors.
*   **State Reset:** If the test requires a fresh session, instruct Playwright to clear localStorage: `page.evaluate("localStorage.clear()")` followed by `page.reload()`.

### C. The "Graceful Failure" Protocol
If a Playwright verification script fails **two times** due to timeouts or locator errors:
1.  **Stop debugging the test script.**
2.  Assume the underlying functional code may be correct but the test environment is unstable.
3.  Commit the functional code safely.
4.  Inform the user that automated verification failed due to environment instability, but the code has been preserved and committed for manual review.

## 2. Backend & API Testing

*   When testing the Relay or Backend workers, ensure the environment has necessary dependencies.
*   Note that `rclone` must be present in the environment for backend file operations to succeed. If the `RcloneDaemonManager` throws `ENOENT`, `rclone` is missing from the system `$PATH`.

## 3. Database Abstraction

*   The project uses a `DatabaseManager`. By default, if MongoDB is not reachable (e.g., `ECONNREFUSED` on port 27017), the system gracefully falls back to an `InMemoryMockDB`.
*   Do not waste turns trying to install or debug a local MongoDB instance unless specifically requested by the user. The Mock DB is sufficient for Phase 1 UI/API testing.