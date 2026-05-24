# Real-Time Chat & File Transfer Architecture

This document outlines the architecture for integrating a WhatsApp/Signal-style real-time messaging system into the existing Swarm framework. Crucially, it details the engineering techniques required to send massive files (gigabytes in size) between users without crashing the low-resource Relay Server.

---

## 1. The Core Messaging Engine (Text & Metadata)

The Relay Server acts as the central router for all text-based communication.

*   **The Protocol:** The `/mobile` app (using WebTransport) and the `/frontend` desktop app (using WebSockets) maintain continuous connections to the Relay Server.
*   **The Flow:** User A types a message. The payload (`{ type: "CHAT_MESSAGE", text: "Hello" }`) is sent to the Relay. The Relay instantly routes this tiny payload to User B's active connection.
*   **Resource Impact:** Routing raw JSON text requires almost zero CPU and RAM. A $2/month Relay Server can comfortably route millions of text messages per hour.

## 2. Bypassing the Relay for File Transfers

**The Constraint:** Attempting to route a 5GB ZIP file or video through the Relay Server's WebSocket connection will instantly cause memory exhaustion (OOM), crashing the central nervous system.

To solve this, the architecture implements two distinct **Relay Bypass Mechanisms**, depending on the users' connection states.

### Bypass Mechanism A: WebRTC Peer-to-Peer (For Online Users)
If User A wants to send a 5GB file to User B, and *both users are currently online*:

1.  **The Matchmaker:** User A's device sends a tiny text message through the Relay Server: *"I want to establish a WebRTC Data Channel with User B."*
2.  **Hole Punching:** The Relay Server exchanges their IPs (Signaling). Both devices use STUN/TURN servers to punch through their local firewalls.
3.  **Direct Transfer:** A direct, encrypted WebRTC UDP pipe is established between User A's phone and User B's laptop.
4.  **The Result:** The 5GB file transfers directly between the devices. The Relay Server is completely bypassed, saving 100% of bandwidth and RAM.

### Bypass Mechanism B: Cloud Worker Handoff (For Offline Users)
If User A wants to send a 50GB file to User B, but *User B is offline or has their phone turned off*, P2P will fail. We utilize our `rclone` Swarm.

1.  **Worker Upload:** User A's device initiates a chunked HTTP upload directly to an available GitHub Action Worker, instructing it to upload the file to a secure cloud bucket (e.g., S3 or Google Drive).
2.  **The Link:** Once the worker completes the upload, it generates a secure, expiring download link.
3.  **The Chat Payload:** The worker sends a tiny text payload through the Relay Server to User B's chat history: `{ type: "CHAT_MESSAGE", link: "https://secure-bucket/file.zip" }`.
4.  **The Result:** When User B turns on their phone, they receive the text message. When they click the file, they download it directly from the massive bandwidth pipes of the Cloud Provider, completely protecting the Relay Server.

## 3. Security (End-to-End Encryption)

To ensure this chat system matches the privacy standards of apps like Signal:

*   All text messages and WebRTC file transfers are encrypted client-side using the receiver's Public Key before leaving the sender's device.
*   The Relay Server routing the messages is mathematically blind to the content of the chat.