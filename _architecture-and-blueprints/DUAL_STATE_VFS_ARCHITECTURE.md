# Dual-State VFS & Hybrid Configuration Engine Architecture

This document details the advanced engineering principles behind the Swarm's "Lightning Search" and Virtual File System (VFS) capabilities.

## 1. The Core Problem: API Exhaustion
Querying massive cloud drives (like Google Drive or S3) directly for a file search is inefficient and dangerous. Searching a 1-million-file drive recursively will trigger tens of thousands of API calls, resulting in immediate rate-limiting and bans from cloud providers.

## 2. The Dual-State VFS Index
To achieve "local machine" search speeds (milliseconds) against remote cloud drives without hitting API bans, the Command Center utilizes a **Dual-State VFS Database**:

*   **VFS_PERMANENT Domain:** Long-term remotes are stored permanently in the Polyglot Database (e.g., MongoDB or Postgres).
*   **VFS_EPHEMERAL Domain:** Temporary cloud mounts (like those used during a specific GitHub Action run) are stored here.
*   **The Dead Man's Switch:** All records in the `VFS_EPHEMERAL` domain are tagged with a MongoDB TTL (Time-To-Live) index (`expiresAt`). The backend worker sends a heartbeat every 60 seconds. If the worker crashes abruptly or GitHub kills the Action, the heartbeat stops, and the database automatically purges millions of associated ephemeral records within 5 minutes. No data bloat.

## 3. Worker-Direct DB Bypassing & Memory Protection
When a massive `rclone fast-list` is triggered:
1.  The JSON stream is massive (often multi-gigabyte). The worker does **not** load it into memory. It uses `JSONStream` to parse and stream the data natively.
2.  The worker connects directly to the DB (`GITHUB_EPHEMERAL_MONGODB_URI`) to execute bulk inserts. It completely **bypasses the Relay Server**, ensuring the lightweight central nervous system is never crushed by massive indexing payloads.

## 4. The Hybrid Configuration Engine
To avoid hardcoding secrets in ephemeral deployment scripts (like `run-worker.yml`):
*   Users paste their `rclone.conf` text into the **VfsConfigManagerUI** in the Command Center.
*   They define an abstract **Remote Alias** (e.g., `backup_drive_1`) to decouple the physical name from the DB identity, allowing future renames without re-indexing.
*   When a worker boots, it requests the configuration. The orchestrator fetches both the Permanent configs from the database and Ephemeral configs from the active job, merging them dynamically into an isolated `/tmp/rclone.conf` execution environment.

## 5. UI Virtualization
To display massive search results without freezing the React UI thread, the frontend employs **`react-window`** (Virtualized Lists), ensuring only the currently visible 20-30 rows are rendered in the DOM, even if the search returns 100,000 matches.
