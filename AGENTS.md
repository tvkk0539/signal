# AI Agent Instructions for Distributed Swarm Command Center

Welcome, AI Engineer. You are working on a highly engineered, distributed architecture. This document contains critical rules and pointers you must follow to succeed in this monorepo.

## 1. Core Directives
*   **Architecture First:** Read the documents in `_architecture-and-blueprints/` before making major structural changes. This project relies on specific patterns (Zero-Trust Gatekeepers, Pluggable Repositories, Rclone Dynamic Wrappers).
*   **Monorepo Etiquette:** This is an NPM workspace monorepo. Use workspace commands (e.g., `npm run build --workspace=shared`) and ensure shared contracts are compiled before testing dependent packages.

## 2. Testing & Verification Rules (CRITICAL)
Automated UI testing (Playwright) in sandboxed environments can be flaky and consume excessive session turns.
*   You **MUST** read and adhere to `_architecture-and-blueprints/JULES_TESTING_GUIDELINES.md` before attempting frontend verification.
*   **Graceful Failure:** Never risk losing functional code due to a failing test script. If a test fails twice, commit your work and ask the user for guidance.

## 3. Environment Dependencies
*   The backend relies on `rclone`. Ensure `rclone` is installed in your sandbox environment before testing backend worker logic.
*   If the user has configured a "Setup Script" in their Jules environment settings, these dependencies will be pre-installed via snapshot.

## 4. Communication
*   Always be explicit about what you are modifying.
*   Do not commit compiled artifacts (like `dist/` folders) to version control. Use `.gitignore` properly.