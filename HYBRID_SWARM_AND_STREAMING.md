# Hybrid Swarms & Infinite Streaming Architecture

This document details two of the most extreme, highly engineered capabilities of our architecture: building an environment-agnostic Hybrid Swarm, and bypassing physical disk space limits to stream massive files using On-The-Fly Memory Streaming.

---

## 1. The Environment-Agnostic "Hybrid Swarm"

Because our architecture utilizes a central Relay Server where workers reach *outward* to connect, the system is completely decoupled from any single compute provider (like GitHub Actions).

This allows us to build a **Hybrid Swarm**, aggregating compute power from multiple different sources simultaneously into a single, unified fleet controlled by the React UI.

### The Architecture
*   **The Single Source of Truth:** The Relay Server sits on a public IP address. It only cares about one thing: Does the incoming WebSocket connection have a valid `WORKER_API_KEY`?
*   **The Diverse Fleet:** At any given moment, the swarm can consist of:
    *   **CI/CD Runners:** GitHub Actions, GitLab CI (utilizing free tier ephemeral compute).
    *   **Cloud VMs:** Spot instances on AWS, cheap droplets on DigitalOcean, or free-tier Oracle Cloud VMs.
    *   **Local Hardware:** An old laptop, a Raspberry Pi, or a home NAS running a local Docker container.
*   **Seamless Integration:** When a home laptop boots up the backend code, it connects to the Relay exactly the same way a GitHub Action does. The React UI simply sees "Worker Online." The Fleet Admiral (Relay Server) can route a download task to the GitHub Action and a database backup task to the home laptop simultaneously.

---

## 2. On-The-Fly Memory Streaming (Bypassing Disk Limits)

A critical limitation of ephemeral runners (like GitHub Actions) is physical disk space (often limited to ~10GB). If a user attempts to stream or process a 50GB video file, standard architectures will crash with "Disk Full" (OOM/No Space Left on Device) errors.

To solve this, we engineer an architecture that uses **0 bytes** of physical disk space, relying entirely on RAM buffers and advanced networking protocols.

### The Engineering Solution: VFS + HTTP Range Requests + WebRTC

To stream a 50GB file on a 10GB runner with instant forward/backward seeking, we combine three technologies:

1.  **Virtual File System (VFS):**
    *   Instead of downloading files, the Node.js backend mounts the cloud drive (e.g., Google Drive) using `rclone`'s advanced VFS caching mechanism.
    *   The worker reads the file metadata (size, format) but does not download the binary data to the hard drive.
2.  **HTTP Range Requests (The Seeking Mechanism):**
    *   When the user clicks "Play", the React UIs video player uses standard HTTP protocols to ask for specific bytes.
    *   If the user skips to 1 hour into the video, the browser calculates the byte offset (e.g., `Range: bytes=25000000-`).
    *   This request is sent over the WebRTC signaling pipe to the backend.
    *   The Node.js backend intercepts this, and instructs `rclone` to ask the Cloud Provider (Google Drive) for *only* that specific chunk of data starting at byte 25,000,000.
3.  **RAM Buffering (The WebRTC Pipe):**
    *   As Google Drive sends that specific chunk of data to the GitHub Action, the Action holds a tiny amount of it (e.g., 5MB to 10MB) in its RAM (Memory).
    *   It instantly flushes that RAM buffer down the direct WebRTC UDP pipe to the user's browser.
    *   The RAM buffer is immediately cleared and reused for the next chunk.

### The Result
Because the heavy video data is essentially "passing through" the GitHub Action's RAM like water through a pipe, the 10GB hard drive is never touched. The user receives a zero-delay, live-seeking video stream of a massive file using free, low-resource compute.