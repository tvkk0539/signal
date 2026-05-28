# gRPC Swarm Architecture (Worker-to-Worker)

This document outlines the final, most advanced networking layer of the architecture: utilizing gRPC for direct, machine-to-machine communication across the distributed worker swarm.

While WebSockets are utilized for UI control and WebRTC for media streaming, gRPC is specifically engineered for high-speed, binary data exchange between the ephemeral workers themselves (e.g., GitHub Action to GitHub Action).

---

## 1. The Dual-Mode Architecture (Direct vs. Relayed)

To support both high-performance internal networks and highly restrictive ephemeral containers, the gRPC architecture operates in a **Dual-Mode** system governed by the Relay Server acting as a "Traffic Cop".

Workers configure their capabilities using the `GRPC_MODE` environment variable (`DIRECT` or `RELAY`).

### Mode A: DIRECT P2P (LAN/VPC Optimization)
If workers are deployed within the same Virtual Private Cloud (e.g., AWS EC2 instances in the same security group) or on a corporate LAN, they do not need the Relay Server to route their massive file transfers.
*   **The Flow:** Worker A asks the Relay for Worker B's IP address. Worker A connects directly to Worker B's open gRPC port.
*   **The Benefit:** 100% of the network traffic bypasses the Relay Server, preserving bandwidth on the central hub.

### Mode B: RELAYED (The Virtual Network)
Ephemeral runners like GitHub Actions execute in isolated containers across different data centers. They cannot communicate directly because they have **no open inbound ports**. By utilizing the Relay Server as a **gRPC Router**, we create a Virtual Private Network (VPN) for the swarm.
*   **The Flow (Reverse-Tunneling):**
    1. Worker A wants to send data to firewalled Worker B.
    2. Relay generates a unique `transfer_id`.
    3. Relay pings Worker B: *"Connect to me and wait for data."* (Worker B makes an outbound `ReceivePipe` connection).
    4. Relay tells Worker A: *"Stream your data to me."* (Worker A makes an outbound `PipeData` connection).
    5. The Relay bridges the two streams in memory.

## 2. Overcoming the Hardware Bottleneck (Stream Matching)

A critical architectural concern is the capacity of the lightweight Relay Server (e.g., a $5/month VM) when operating in `RELAYED` mode. If Worker A attempts to route a 50GB file to Worker B, will the Relay Server crash due to RAM exhaustion?

**The answer is No, due to Stream Matching.**

The Relay Server does not hold the data in memory. It operates purely as a network switch.
*   The `GrpcRelayRouter` maintains a map of active `transfer_id`s.
*   As the incoming stream from Worker A arrives, it is immediately written (piped) directly into the outgoing stream to Worker B.
*   **Resource Impact:** RAM utilization remains near 0%. CPU utilization remains under 1%. The only constraint is the network bandwidth limit (NIC speed) of the Relay Server VM.

## 2.5 The Four Interoperability Scenarios
The "Traffic Cop" logic in the Relay Server seamlessly handles any combination of worker types:

1.  **DIRECT ➡️ DIRECT:** Source connects directly to Target's open port. (Fastest, zero Relay bandwidth cost).
2.  **RELAY ➡️ RELAY:** Source streams to Relay, Relay pipes to Target. (Zero inbound ports required).
3.  **RELAY ➡️ DIRECT:** Target has an open port. Source (firewalled) connects directly outbound to Target.
4.  **DIRECT ➡️ RELAY:** Target is firewalled. Source streams to Relay, Relay reverse-tunnels to Target.

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