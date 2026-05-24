# Mobile Application Architecture (React Native)

This document outlines the architecture for integrating a native mobile client (Android/iOS) into the distributed swarm ecosystem. It details how to optimize data transfer for mobile networks and ensure unbroken connectivity, even when routing tasks to ephemeral workers like GitHub Actions.

---

## 1. The Headless Monorepo Approach

Our system utilizes a **Headless Architecture**. The Relay Server functions independently of any specific user interface.

We will introduce a 5th directory into our Monorepo: `/mobile`. This will house a React Native (or Expo) application.
*   **The Advantage:** Because `/mobile` lives in the same repository, it shares the `/shared` TypeScript contracts. The Android app is mathematically guaranteed to speak the exact same language as the Relay Server and the GitHub Action workers.
*   **Deployment:** The mobile app is compiled into native binaries (`.apk` or `.ipa`) and distributed to devices. It does not require web hosting. It connects directly to the Relay Server VM.

## 2. Advanced Mobile Protocols

Mobile networks (4G/5G) are highly variable. Users drive through tunnels, switch between Wi-Fi and Cellular, and suffer packet loss. We implement specific protocols to counter this.

### A. WebTransport over HTTP/3 (QUIC)
WebSockets rely on TCP. If a mobile user loses signal for one second, the TCP connection breaks, requiring a slow, multi-second handshake to reconnect.

*   **The Solution:** The mobile app will attempt to establish a **WebTransport** connection to the Relay Server. WebTransport runs on UDP (QUIC). It is "connectionless" at the transport layer, meaning if the user switches from Wi-Fi to 4G, the stream remains completely unbroken.
*   **Graceful Degradation:** Because WebTransport is bleeding-edge, if a user has an older Android device that does not support it, the app will seamlessly fallback to standard WebSockets.

### B. GraphQL (Metadata Optimization)
Mobile apps must minimize data usage to preserve battery life and data caps.
*   **The Problem:** A standard REST API request to list a large cloud directory might return a 5MB JSON payload containing every detail about every file.
*   **The GraphQL Solution:** The mobile app will use GraphQL to request *only* the specific fields it needs to render the screen (e.g., `fileName` and `icon`). The 5MB payload is reduced to a 50KB payload, resulting in lightning-fast UI renders on slow 4G connections.

## 3. Handling Massive Binary Downloads

It is crucial to distinguish between *Metadata* (folder names, sizes) and *Binary Data* (a 500MB video file).

*   GraphQL and WebSockets/WebTransport are strictly for Metadata and real-time control commands.
*   When a mobile user clicks "Download 500MB Video," the app hands the URL to the OS's **Native Download Manager**. The device initiates a standard HTTP/HTTPS chunked download stream. The phone handles the heavy 500MB download in the background efficiently, exactly like downloading a movie from Netflix, without overwhelming the real-time control pipes.

## 4. Compatibility with GitHub Actions Swarm

This advanced mobile architecture remains 100% compatible with our ephemeral GitHub Actions backend workers.

*   **The Translation Layer:** The GitHub Action is unaware of the client device. It boots up, connects to the Relay via gRPC/WebSockets, and waits for commands.
*   **The Flow:** The Android app sends a command via WebTransport (QUIC) to the Relay Server: *"Tell a worker to start a backup."* The Relay translates this command and routes it to an available GitHub Action. The Action completes the backup and sends the success message back to the Relay, which pushes it down the WebTransport pipe to the phone.
*   The entire heterogeneous network operates seamlessly.