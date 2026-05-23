# Project Overview

This project is a highly-engineered, scalable web application designed to handle real-time file management, background jobs, and cloud storage integrations.

It is built around the concept of a fast, continuous connection between a rich frontend user interface and a robust backend worker system. The initial core feature is to provide real-time, uninterrupted browsing of cloud storage utilizing `rclone` and WebSockets.

## Core Features
*   **Real-time WebSocket Communication:** A permanent, bi-directional connection between the frontend and backend, enabling instant UI updates without page refreshes.
*   **Cloud Storage Integration (rclone):** Uses `rclone` running in daemon mode (`rclone rcd`) on the backend to interact with various cloud storage providers quickly and efficiently.
*   **Scalable Architecture:** Designed from the start to allow the frontend and backend to be deployed independently on different servers or VMs.

## Development Status
We are currently in the initial setup and Proof of Concept (PoC) phase. Our immediate goal is to establish the Monorepo structure, initialize the TypeScript stack, and create a basic WebSocket connection pipeline.