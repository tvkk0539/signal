# 🎵 Apple Music Ingestion Engine: Backend Architecture

![Status](https://img.shields.io/badge/Status-Blueprint-blue)
![Architecture](https://img.shields.io/badge/Architecture-Backend_Worker-black)

This document outlines the architectural blueprint for the backend processing required to support the dedicated Apple Music Ingestion App within the Swarm Command Center.

Due to the complex nature of Widevine decryption, MP4/ALAC muxing, and constant upstream API changes, a standard Node.js approach is insufficient. We must utilize a **"Chimera Worker Architecture"** coupled with a **"Just-In-Time (JIT) Cloning Engine"**.

---

## 1. The Challenge

We are integrating the highly capable `zhaarey/apple-music-downloader` (written in Go) into our ephemeral Node.js Swarm workers.
This tool requires:
*   Go (to compile/run)
*   A local Decryption Proxy (`wrapper`) running on specific ports.
*   `MP4Box` (for audio stream muxing).
*   `FFmpeg` (for format conversion and animated artwork embedding).
*   Dynamic configuration files containing Apple `media-user-token`s.

Furthermore, Apple Music frequently updates its APIs. If we bake the Go repository into our static Docker image, our Swarm will break within weeks as the decryption logic becomes outdated.

---

## 2. The "Just-In-Time (JIT) Cloning Engine"

To ensure our Swarm is autonomous and immortal, workers will dynamically fetch and compile the latest ripping engine *at boot time*, rather than at Docker build time.

### The Boot Sequence (`bootstrap_worker.sh`)
Before the Node.js Swarm Worker (`worker.ts`) connects to the Relay, a pre-flight bash script executes:

1.  **Git Sync:** The script checks if `/tmp/apple-music-downloader` exists. If not, it clones it. If it does, it runs `git pull`. This guarantees the worker possesses the absolute latest commits, patching any upstream API breaks automatically.
2.  **JIT Compilation:** Running `go run main.go` per task is CPU-intensive. Instead, the boot script executes `go build -o am-ripper main.go`. This compiles the codebase into a blazing-fast, single binary executable ready for instant execution.
3.  **Dependency Acquisition:** The script uses `curl` to pull the latest release of the Widevine decryption `wrapper` binary from GitHub and makes it executable.
4.  **Handoff:** With dependencies compiled and ready, the script boots the Node.js Swarm Worker.

---

## 3. The "Chimera" Orchestration Flow

When a user pastes an Apple Music URL and clicks "Initialize" in the UI, the following highly engineered sequence occurs within the assigned ephemeral worker:

### Phase A: Dynamic Provisioning & VFS Sandbox (The Brain)
1.  **Task Receipt & Immutable Snapshots:** The frontend React UI captures a frozen snapshot of over 30+ configuration settings the exact millisecond the user clicks "Dispatch". This guarantees Configuration State Concurrency; users can immediately change UI settings for the next track without affecting the currently flying payload. The Node.js worker receives this `APPLE_MUSIC_RIP_REQUEST` payload via WebSocket.
2.  **Isolation (VFS Vault):** Node.js creates a unique, isolated workspace for this specific job (e.g., `/tmp/job_uuid_123`).
3.  **Config Injection:** Node.js dynamically translates the immutable snapshot payload into a physical `config.yaml` file on the fly inside the workspace, securely retrieving the `media-user-token` from the database.

### Phase B: Sub-Process Spawning & The Symlink Bridge (The Muscle)
4.  **Proxy Initialization:** Node.js spawns the decryption `wrapper` as a background child process (`spawn('./wrapper')`). It polls `127.0.0.1:10020` until it verifies the proxy is actively listening.
5.  **The Symlink Bridge:** Because the third-party Go ripper blindly reads `config.yaml` from its current execution directory and crashes if given unknown flags, we treat it as an immutable black box. The backend creates a hardlink (`fs.linkSync`) of the permanent `am-ripper` binary directly into the VFS Vault.
6.  **Execution:** Node.js executes the symlinked binary *from within the vault* (`cwd: workspaceDir`). The Go binary natively believes it is running in its own private directory, reads the dynamic `config.yaml` automatically, and prevents cross-contamination between concurrent jobs.

### Phase C: The Hybrid Intelligent URL Router (The Precision)
To prevent the Go binary from erroneously downloading entire albums when only a single song is requested, or freezing while waiting for interactive terminal input, the system utilizes a Hybrid URL Router:
6.  **Frontend Auto-Detection:** The React UI analyzes the user's pasted URL on the fly. If it detects `?i=` query parameters, it automatically switches the request to 'Single Song' mode. If it detects `/artist/`, it switches to 'Entire Artist' mode. The user can visually see this detection and override it manually if desired.
7.  **Backend Translation:** The Node.js orchestrator reads this explicit mode and injects exact arguments (`--song` or `--all-album`) into the Go binary's execution path, mathematically guaranteeing the binary only downloads what is explicitly intended.

### Phase D: The Telemetry Pipe (The Magic)
8.  **Stream Interception:** As the Go application processes the download (fetching M3U8s, decrypting chunks), it outputs logs to `stdout`.
9.  **Real-Time Relay:** Node.js intercepts this stream byte-by-byte and immediately emits it via WebSocket `TASK_PROGRESS` events.
10. **UI Immersion:** The React frontend receives these logs and renders them in the retro-futuristic Terminal Window, giving the user a real-time, transparent view of the remote ripping process.

### Phase D: Zero-Disk Cloud Handoff (The Swarm Way)
9.  **Completion:** The Go application finishes muxing the audio and leaves a massive `.m4a` or `.flac` file in the temporary workspace, exiting with Code 0.
10. **Rclone Beaming:** Node.js utilizes the `RcloneDaemonManager` to `move` the massive file from the local ephemeral disk directly into permanent Cloud Storage (e.g., Google Drive/S3).
11. **Cleanup:** Once the cloud upload is verified, Node.js brutally kills the decryption `wrapper` process, completely deletes the `/tmp/rip_job_123` workspace to prevent disk bloat, and marks itself as `ONLINE` for the next task in the Swarm Queue.

---
*Documented to preserve architectural decisions and technical vision prior to backend implementation.*
