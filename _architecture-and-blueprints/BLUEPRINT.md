# Project Blueprint & Vision

## Overview
This project aims to build a highly engineered, robust, and scalable full-stack application capable of handling complex real-time operations, background tasks, and seamless data management.

At its core, the initial milestone (MVP) focuses on creating a high-performance **Real-Time Cloud Storage Browser** leveraging `rclone`. However, the architecture is designed to be highly extensible, allowing for the future integration of dashboards, chat systems, remote job triggers, and more.

## High-Level Architecture
The project utilizes a **Monorepo** architecture with a strict separation of concerns, designed for independent deployment but rapid co-development.

*   **`/frontend`**: The user interface.
*   **`/backend`**: The server, API, and worker processes.

While developed in the same repository, they are completely decoupled. The frontend communicates with the backend exclusively via REST APIs and WebSockets.

## Core Feature: Real-Time Rclone Browsing
A critical innovation in this project is the real-time cloud storage browsing capability.

1.  **Daemon Mode (`rclone rcd`)**: The backend will manage an instance of `rclone` running persistently in Daemon Mode. This turns rclone into an always-running background service with an API, maintaining continuous connections to configured cloud drives.
2.  **Unbroken Connection**: The React frontend and Node.js backend are connected via WebSockets (Socket.io), utilizing built-in "ping/pong" heartbeats to ensure the connection never drops and automatically reconnects if network issues occur.
3.  **The Flow**:
    *   User requests a folder via the UI.
    *   Frontend sends a WebSocket message.
    *   Backend instantly queries the `rclone rcd` API.
    *   Backend streams the JSON response back via WebSocket.
    *   UI renders instantly without page refreshes.

## Phase 1 Milestone (MVP)
The first phase of development will focus on establishing the foundation and the core rclone browser:

1.  **User Authentication System**: Secure registration and login using JWTs.
2.  **Cloud Provider Management**: A secure UI where users can input their credentials (e.g., AWS S3 keys, Google Drive OAuth) to create their own rclone remotes.
3.  **Real-Time File Explorer**: A beautiful file manager interface showing files via WebSockets.
4.  **Basic File Operations**: Upload, Download, Delete, and Create Folder.

## Future Extensibility
Once the foundational WebSocket pipeline and rclone integration are proven stable, the system is designed to easily integrate:
*   Real-time progress bars for large file transfers.
*   File system watching (instant UI updates when files change remotely).
*   Live dashboards and remote job execution tracking.
