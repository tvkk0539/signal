# AI Agent Instructions for Distributed Swarm Command Center

Welcome, AI Engineer. You are working on a highly engineered, distributed architecture. This document contains critical rules and pointers you must follow to succeed in this monorepo.

## 1. Core Directives
*   **Architecture First:** Read the documents in `_architecture-and-blueprints/` before making major structural changes. This project relies on specific patterns (Zero-Trust Gatekeepers, Pluggable Repositories, Rclone Dynamic Wrappers).
*   **Monorepo Etiquette:** This is an NPM workspace monorepo. Use workspace commands (e.g., `npm run build --workspace=shared`) and ensure shared contracts are compiled before testing dependent packages.

## 2. Environment Dependencies
*   The backend relies on `rclone`, and UI tests rely on `playwright`.
*   Before beginning *any* development or testing in a fresh sandbox, you **MUST** run the environment setup script:
    `bash jules_environment_setup.sh`
*   Do not attempt to debug `ENOENT rclone` errors without first running the setup script.

## 3. Testing & Verification Rules (CRITICAL)
Automated UI testing (Playwright) in sandboxed environments can be flaky and consume excessive session turns.
*   You **MUST** read and adhere to `_architecture-and-blueprints/JULES_TESTING_GUIDELINES.md` before attempting frontend verification.
*   **Boot Sequencing:** You must ensure the Relay Server and Backend Worker are fully booted and bound to their respective ports *before* starting the Frontend dev server. Failing to do so causes Playwright timeouts during authentication.
*   **Authentication is Mandatory:** The UI is protected by a Zustand/JWT layer. You cannot test internal components without scripting a user registration/login flow first. Read the testing guidelines for the exact script required. Remember to reuse the same credentials across subsequent scripts if the Mock Database persists.
*   **Graceful Failure:** Never risk losing functional code due to a failing test script. If a test fails twice, commit your work and ask the user for guidance.

## 4. Communication
*   Always be explicit about what you are modifying.
*   Do not commit compiled artifacts (like `dist/` folders) to version control. Use `.gitignore` properly.
