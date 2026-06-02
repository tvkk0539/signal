# Dual-State VFS Index & Hybrid Config Engine

This document outlines the architecture used to provide **Lightning Fast File Searching** across massive cloud remotes without exhausting `rclone` API limits, as well as the mechanism for persisting specific remotes while keeping others completely ephemeral.

## The Core Problem
In a Swarm where workers (like GitHub Actions) are ephemeral:
1.  **Search Latency:** Typing a search query into the React UI and asking `rclone` to scan a 1-million-file Google Drive over the network takes 30+ seconds and freezes the UI.
2.  **Config Management:** If the `rclone.conf` is dynamically generated per-worker, how do we support massive, permanent drives alongside disposable, temporary ones without re-indexing the massive drives every time a worker boots?

## The Highly Engineered Solution

### 1. Hybrid Config Engine
The system supports two parallel configuration streams:
*   **Ephemeral Configs:** Injected dynamically at worker boot time (e.g., via GitHub Secrets).
*   **Permanent Configs:** Managed via the React UI (`RcloneConfigManagerUI`).

When the Node.js backend (`worker.ts`) initializes, the `RcloneDaemonManager` dynamically merges these two text blocks into a single `/tmp/rclone.conf` and mounts them simultaneously.

### 2. Dual-State Database Routing (Polyglot Switchboard)
The Relay Server leverages its Polyglot Database Switchboard to manage two distinct search domains:
*   `VFS_EPHEMERAL`: Routes to a self-cleaning database schema.
*   `VFS_PERMANENT`: Routes to a persistent database schema.

### 3. High-Speed Background Scanning
When the worker's `rclone` daemon starts, it does *not* wait for a search query. It proactively builds a mathematical tree of the entire remote using the `fast-list: true` API parameter, fetching massive paginated chunks of the filesystem directly into the Worker's RAM.
The Worker then transmits this tree (`VFS_INDEX_SYNC`) over WebSockets to the Relay Server.

### 4. The Self-Cleaning Ephemeral Hook
To prevent "State Bloat" (orphaned files from dead GitHub Actions polluting the search index):
*   Every file in the `VFS_EPHEMERAL` index is tagged with the `workerId`.
*   If GitHub forcefully kills the Action, the WebSocket to the Relay Server drops.
*   The exact millisecond the `disconnect` event fires, the Relay Server (`SocketManager`) triggers `purgeEphemeralByWorker()`, instantly annihilating all associated search records.

### 5. Persistent Index Anchoring
For `VFS_PERMANENT` remotes, the system utilizes a `persistentId` (UUID) rather than relying on the `remoteName` (e.g., `MyDrive:`).
*   If a user renames their permanent remote in the `rclone.conf` tomorrow, the system mathematically links the new name back to the old UUID.
*   This prevents the worker from accidentally discarding the cached 1-million-file database index and executing a redundant, massive API scan.

### 6. The UI Experience (Sub-Millisecond Search)
Because of this background orchestration, the React `FileExplorer` UI never queries `rclone` for searches.
When a user types into the "Lightning Search" bar, the UI sends a `VFS_SEARCH_REQUEST` to the Relay Server. The Relay Server queries the local MongoDB text index and returns the result in <5ms. The UI then utilizes `@tanstack/react-virtual` to instantly render the results, making searching a massive cloud drive feel exactly as fast as searching a local hard drive.