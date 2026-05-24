# WebRTC Video Streaming Architecture

This document outlines the advanced architectural requirements for streaming live video directly from an ephemeral worker (GitHub Action) to a React frontend. It explains why WebSockets are insufficient for media and details the WebRTC (Peer-to-Peer) solution.

## 1. The Problem: Why Not WebSockets?

While the WebSocket Relay Server is perfect for controlling `rclone` and receiving JSON progress updates, it is fundamentally the wrong technology for streaming video.

*   **TCP Head-of-Line Blocking:** WebSockets run on TCP, which guarantees delivery. If a single packet of video data is lost in transit, the entire stream freezes (buffers) while the protocol re-requests that packet.
*   **Relay Bottleneck:** A lightweight ($2/month) Relay Server can easily process thousands of small text messages. However, routing megabits per second of raw video data through it will cause the server to crash due to CPU and bandwidth exhaustion.
*   **Bandwidth Costs:** Routing video through the Relay Server incurs massive egress bandwidth costs from the hosting provider.

## 2. The Solution: WebRTC (Peer-to-Peer)

To achieve zero-delay, high-definition video streaming from a GitHub Action backend, we must implement **WebRTC (Web Real-Time Communication)**. This is the industry-standard protocol used by Zoom, Google Meet, and Discord Voice.

WebRTC allows the React UI and the GitHub Action to establish a **direct** connection, bypassing the Relay Server entirely for the heavy video data.

## 3. The Highly Engineered Architecture

Achieving this requires three distinct components working in harmony:

### A. The Matchmaker (The Signaling Server)
The existing WebSocket Relay Server takes on a new role: **Signaling**.
1.  The React UI and GitHub Action connect to the Relay.
2.  When the user clicks "Play Video", the UI sends an "Offer" (its IP and connection details) to the Relay.
3.  The Relay passes the Offer to the GitHub Action.
4.  The Action replies with an "Answer" (its details).
5.  *Once the connection details are exchanged, the Relay Server steps out of the way. No video ever touches it.*

### B. Hole Punching (STUN/TURN Servers)
Because the GitHub Action is behind a strict NAT/Firewall, a direct connection is normally impossible. We must use STUN and TURN servers.
*   **STUN Server:** A public server that tells the GitHub Action what its public IP address is, allowing it to share that IP with the React UI during the Signaling phase.
*   **TURN Server (Fallback):** If the strict firewall completely blocks the peer-to-peer connection, the stream falls back to a TURN server (a high-bandwidth, dedicated media relay). We will configure the architecture to use free STUN servers (like Google's) and deploy a custom TURN server (e.g., Coturn) for 100% reliability.

### C. The Media Stream (UDP)
Once the connection is established via WebRTC:
1.  The Node.js backend inside the GitHub Action uses `rclone` to read the video file from the cloud drive.
2.  The backend chunks the video and pushes it directly into the WebRTC stream using UDP (User Datagram Protocol).
3.  UDP does not wait for dropped packets, ensuring the stream remains live, real-time, and zero-delay, utilizing GitHub's massive outbound bandwidth.

## 4. Implementation Steps to Achieve This

To build this into our project professionally:
1.  **Backend Integration:** Install the `wrtc` (or similar WebRTC bindings) package in the Node.js backend to allow it to act as a WebRTC peer.
2.  **Frontend Integration:** Utilize the browser's native `RTCPeerConnection` API in the React frontend to receive the media stream.
3.  **Signaling Logic:** Expand the Socket.io implementation on the Relay Server to handle WebRTC SDP (Session Description Protocol) offers, answers, and ICE candidates.
4.  **Infrastructure:** Deploy a Coturn instance alongside the Relay Server to guarantee connection success through restrictive enterprise or CI/CD firewalls.