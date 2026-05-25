# gRPC Swarm Architecture (Worker-to-Worker)

This document outlines the final, most advanced networking layer of the architecture: utilizing gRPC for direct, machine-to-machine communication across the distributed worker swarm.

While WebSockets are utilized for UI control and WebRTC for media streaming, gRPC is specifically engineered for high-speed, binary data exchange between the ephemeral workers themselves (e.g., GitHub Action to GitHub Action).

---

## 1. The Concept: The Virtual Network

Ephemeral runners like GitHub Actions execute in isolated, locked-down containers across different data centers. They cannot communicate with each other directly because they have no open inbound ports.

By utilizing the Relay Server as a **gRPC Router**, we create a Virtual Private Network (VPN) for the swarm.

1.  **Worker A (GitHub Action)** initiates an outbound connection to the Relay Server.
2.  **Worker B (AWS Server or a second GitHub Action)** initiates an outbound connection to the Relay Server.
3.  Because both maintain active TCP connections to the central hub, Worker A can instruct the Relay Server to route a binary gRPC stream directly to Worker B.

## 2. Overcoming the Hardware Bottleneck (Stream Piping)

A critical architectural concern is the capacity of the lightweight Relay Server (e.g., a $5/month VM). If Worker A attempts to send a 50GB file to Worker B, will the Relay Server crash due to CPU or RAM exhaustion?

**The answer is No, due to Stream Piping.**

The Relay Server does not process, parse, or hold the data in memory. It operates purely as a network switch.
*   As the gRPC binary data arrives from Worker A, the Node.js Relay Server reads the routing header.
*   It immediately opens a Node.js `stream.pipe()` to Worker B.
*   The binary data flows straight from the incoming network socket to the outgoing network socket.
*   **Resource Impact:** The RAM utilization remains near 0%. CPU utilization remains under 1%. The only constraint is the network bandwidth limit (NIC speed) of the Relay Server VM (typically 1+ Gbps).

## 3. Advanced Capabilities (The Distributed Supercomputer)

By enabling Worker-to-Worker gRPC communication, the architecture transforms from a simple cloud browser into a distributed supercomputing cluster.

### A. Compute Pipelining (The Assembly Line)
Instead of a single GitHub Action attempting to download, compress, and upload a file sequentially (risking timeouts or disk space exhaustion), tasks are split into an assembly line.
*   **Worker 1:** Connects to Google Drive, downloads the file, and streams it via gRPC.
*   **Worker 2:** Receives the gRPC stream, compresses it using FFmpeg on-the-fly, and streams the output via gRPC.
*   **Worker 3:** Receives the compressed gRPC stream and uploads it to AWS S3.

### B. Distributed MapReduce (Parallel Processing)
For massive tasks, such as scanning a 10TB cloud drive for duplicate files:
*   The Relay Server instructs Worker 1 to scan Folders A-M, and Worker 2 to scan Folders N-Z.
*   As they scan, both workers stream their findings via gRPC to a "Master" Worker 3.
*   Worker 3 compiles the final report and pushes it to the React UI.

### C. Cross-Environment Relaying
If a user needs to transfer files between an AWS Server and a strictly firewalled Home NAS:
*   The AWS Server streams the file via gRPC to the Relay.
*   The Relay pipes the gRPC stream down to the Home NAS.
*   The transfer completes securely without ever opening an inbound port on the home network.