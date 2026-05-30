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

### Phase A: Dynamic Provisioning (The Brain)
1.  **Task Receipt:** The Node.js worker receives a `TASK_ASSIGNMENT` via WebSocket containing the URL, target format (e.g., ALAC 192kHz), and metadata toggles.
2.  **Isolation:** Node.js creates a unique, isolated workspace for this specific job (e.g., `/tmp/rip_job_123`).
3.  **Config Generation:** Node.js dynamically generates a `config.yaml` file on the fly inside the workspace, injecting the user's UI choices and retrieving the secure `media-user-token` from the database.

### Phase B: Sub-Process Spawning (The Muscle)
4.  **Proxy Initialization:** Node.js spawns the decryption `wrapper` as a background child process (`spawn('./wrapper')`). It polls `127.0.0.1:10020` until it verifies the proxy is actively listening.
5.  **Execution:** Node.js spawns the compiled Go ripper as a secondary child process:
    `spawn('./am-ripper', ['--config', '/tmp/rip_job_123/config.yaml', 'APPLE_URL'])`.

### Phase C: The Telemetry Pipe (The Magic)
6.  **Stream Interception:** As the Go application processes the download (fetching M3U8s, decrypting chunks), it outputs logs to `stdout`.
7.  **Real-Time Relay:** Node.js intercepts this stream byte-by-byte and immediately emits it via WebSocket `TASK_PROGRESS` events.
8.  **UI Immersion:** The React frontend receives these logs and renders them in the retro-futuristic Terminal Window, giving the user a real-time, transparent view of the remote ripping process.

### Phase D: Zero-Disk Cloud Handoff (The Swarm Way)
9.  **Completion:** The Go application finishes muxing the audio and leaves a massive `.m4a` or `.flac` file in the temporary workspace, exiting with Code 0.
10. **Rclone Beaming:** Node.js utilizes the `RcloneDaemonManager` to `move` the massive file from the local ephemeral disk directly into permanent Cloud Storage (e.g., Google Drive/S3).
11. **Cleanup:** Once the cloud upload is verified, Node.js brutally kills the decryption `wrapper` process, completely deletes the `/tmp/rip_job_123` workspace to prevent disk bloat, and marks itself as `ONLINE` for the next task in the Swarm Queue.

---
*Documented to preserve architectural decisions and technical vision prior to backend implementation.*
