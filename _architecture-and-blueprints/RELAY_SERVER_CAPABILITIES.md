# Relay Server Capabilities (The Central Nervous System)

This document provides an exhaustive breakdown of the responsibilities and capabilities of the `/relay` application within our architecture.

Even though the Relay Server is designed to be extremely lightweight (requiring minimal CPU and RAM), it is the most critical piece of infrastructure in the system. Because it sits between the React UI, the GitHub Actions worker swarm, and the MongoDB database, it acts as a Gatekeeper, a Fleet Admiral, a Matchmaker, and a Vault Guard.

---

## 1. The Gatekeeper (Security & Authentication)

The Relay Server is the only component exposed directly to the public internet, making it the frontline defense for the entire architecture.

*   **User Authentication (REST):** It handles the standard web security. When a user attempts to log in via the React UI, the Relay Server hashes the password, checks the database, and issues a secure JWT (JSON Web Token).
*   **Zero-Trust Worker Authentication (WebSocket):** When an ephemeral worker (GitHub Action) boots up and attempts to connect, it must present a cryptographically secure `WORKER_API_KEY`. The Relay acts as a bouncer, instantly dropping connections from unauthorized sources attempting to hijack the swarm.
*   **Rate Limiting & DDoS Protection:** The Relay tracks the volume of incoming requests. If a malicious actor attempts to overwhelm the system with spam requests, the Relay blocks their IP at the edge, protecting the database and the workers.

## 2. The Fleet Admiral (Swarm & Task Management)

The Relay is responsible for orchestrating the distributed compute power of the GitHub Actions worker swarm.

*   **Intelligent Load Balancing:** The Relay maintains a real-time registry of all connected workers. If a user submits a batch of 10 large file transfers, the Relay distributes the tasks evenly across the available workers, ensuring no single worker is overwhelmed or crashes due to OOM (Out of Memory) errors.
*   **Health Monitoring (Heartbeats):** The Relay continuously monitors the swarm via ping/pong WebSocket heartbeats. If a GitHub Action crashes, is killed by a timeout, or loses network connectivity, the Relay instantly detects the dead connection, marks the worker as "Offline" in the UI, and automatically requeues any tasks assigned to that worker.
*   **Task Queuing:** If the UI submits 50 tasks but only 1 worker is online, the Relay safely holds the remaining 49 tasks in memory. As the worker completes tasks, the Relay feeds it the next one from the queue.
*   **Global Broadcasts:** The Relay has the power to issue global commands. If an administrator hits an "Emergency Stop" button, the Relay blasts a cancellation signal to all workers simultaneously.

## 3. The Matchmaker (WebRTC Video Streaming)

As outlined in the WebRTC architecture, the Relay Server facilitates peer-to-peer connections.

*   **Signaling:** When the React UI requests a live video stream from a worker, the Relay acts as the matchmaker. It exchanges the necessary SDP (Session Description Protocol) Offers and Answers between the UI and the worker. Once the direct WebRTC pipe is established (hole punching the firewall), the Relay steps away, allowing the heavy video data to bypass it entirely.

## 4. The Vault Guard (Database & Configuration Gateway)

Ephemeral environments like GitHub Actions are inherently insecure places to store permanent database credentials.

*   **Protecting Database Credentials:** The GitHub Actions workers do **not** have the username or password for the MongoDB cluster. They are entirely blind to the database. When a worker completes a job, it sends a WebSocket payload (`{ type: "JOB_COMPLETE" }`) to the Relay. The Relay (which safely holds the database credentials) executes the actual write operation to MongoDB.
*   **Configuration Provisioning:** When a worker boots up, it does not know what cloud providers it is supposed to connect to. It asks the Relay for its assignment. The Relay fetches the encrypted `rclone` configuration from MongoDB, decrypts it in memory, and securely passes it down the WebSocket pipe to the worker just in time for execution.