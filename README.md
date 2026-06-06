# 🌐 Distributed Swarm Command Center

![Architecture Status](https://img.shields.io/badge/Architecture-Highly_Engineered-blue)
![Stack](https://img.shields.io/badge/Stack-TypeScript%20%7C%20React%20%7C%20Node.js-black)
![License](https://img.shields.io/badge/License-MIT-green)

Welcome to the **Distributed Swarm Command Center**. This project represents a bleeding-edge architectural blueprint for managing a massive, distributed computing swarm across highly restricted, ephemeral environments (like GitHub Actions, CI/CD runners, and AWS Spot Instances).

This is not a traditional monolithic web application. It is a **Distributed Intelligence Network** capable of real-time cloud storage management, Peer-to-Peer file streaming, and encrypted messaging.

---

## 🏛️ The Monorepo Architecture

This project is structured as an advanced Monorepo, governed by a strict separation of concerns to allow for completely decoupled, environment-agnostic deployment.

*   **`_architecture-and-blueprints/`**: The master design documents. Read these first.
*   **`/shared`**: The Universal Data Contracts. Strict TypeScript interfaces ensuring the entire swarm speaks the exact same mathematical language.
*   **`/relay`**: The Central Nervous System. A lightweight Node.js/Socket.io server that routes traffic, acts as a Zero-Trust Gatekeeper, and orchestrates the worker swarm.
*   **`/backend`**: The Worker Node. Ephemeral, high-compute applications (utilizing `rclone`) designed to execute heavy tasks and die.
*   **`/frontend`**: The Command Center. A React + Vite UI providing real-time telemetry and control over the swarm.
*   **`/mobile`**: The Headless Client. A React Native application optimized for mobile networks (GraphQL, WebTransport).

---

## 🚀 Extreme Capabilities

This system leverages five major communication protocols to achieve "magic" functionality:

1.  **WebSockets (The Telemetry Pipe):** Provides real-time UI updates (e.g., live progress bars) between the Swarm and the Command Center.
2.  **WebTransport / QUIC (The Mobile Pipe):** Ensures mobile clients never disconnect, even when rapidly switching between Wi-Fi and 4G networks.
3.  **WebRTC (The Media & P2P Pipe):** Utilizes STUN/TURN hole-punching to bypass the Relay Server entirely, allowing users to stream 50GB videos or share massive files Peer-to-Peer with zero central bandwidth cost.
4.  **gRPC (The Dual-Mode Swarm Engine):** Allows workers to stream massive binary data to each other. It operates in two modes: `DIRECT` (P2P for LAN/VPC optimizing bandwidth) and `RELAYED` (Reverse-Tunneling through the central hub for completely firewalled GitHub Actions). The Relay acts as an intelligent "Traffic Cop" to bridge any combination of environments automatically.
5.  **REST (The Authentication Gateway):** Secures the entry points utilizing a Database-Agnostic Manager and JSON Web Tokens (JWT).

---

## 🧠 Core Features

*   **Sleek IDE Dashboard UI:** A highly-engineered React interface featuring Virtualized Grid/List views (handling 10,000+ files instantly), a collapsible Telemetry Drawer for global task tracking, and a built-in Pluggable DB Switchboard.
*   **Frontend Web Worker Throttling:** Manages massive WebSocket "data firehoses" (e.g., thousands of progress updates per second) using a background thread (`swarm.worker.ts`), preventing the Main UI React thread from freezing while controlling large swarms.
*   **On-The-Fly Memory Streaming & Downloading:** Uses `rclone` VFS and WebRTC Data Channels to stream massive cloud files (50GB+) through low-resource ephemeral workers without ever writing to the physical hard drive. Includes a secure P2P local download feature to fetch files directly to the browser.
*   **Relay Bypass Chat (True E2EE):** An End-to-End Encrypted messaging system utilizing native WebCrypto (ECDH + AES-GCM) for Zero-Knowledge privacy. The server acts purely as a dumb router, incapable of reading intercepted payloads. Intelligently offloads heavy file transfers.
*   **God-Tier Database Architecture:** Features **Polyglot Persistence** and **Zero-Delay Multi-DB Mirroring**. The Relay Server acts as a domain-level switchboard, allowing the UI to hot-swap database engines (MongoDB, Postgres, SQLite, etc.) on the fly and stream writes to multiple async mirror databases without blocking the main event loop.

---

## 🧠 Core Features & Current Phase Status

The Monorepo is being developed in strict, highly-engineered phases. The current codebase supports up to **Phase 7**.

*   **Phase 1 & 2: Rclone Engine & Swarm Orchestration (✅ Active):** The Node.js worker dynamically controls the `rclone rcd` daemon. The React UI displays a live Fleet Sidebar of connected workers and features a global Job Manager that uses Round-Robin load balancing via the Relay.
*   **Phase 3: Chat System & Cloud Handoff (✅ Active):** Users can chat and share files. Online users punch STUN holes to stream P2P. Offline users trigger a Cloud Worker Handoff, where an ephemeral worker accepts the base64 payload and generates a cloud download link.
*   **Phase 4: WebRTC Media Engine (✅ Active):** The worker dynamically `stats` files for metadata, intercepts WebRTC `SDP_OFFER`s, and pipes the VFS HTTP stream from `rclone` directly into the `RTCDataChannel`. The UI dynamically configures the `MediaSource` buffer, achieving true zero-disk memory streaming for any video format.
*   **Phase 5: gRPC Swarm Engine (✅ Active):** Ephemeral workers use the Relay Server as a DNS discovery mechanism to find each other's dynamic gRPC ports. Workers can pipe binary data directly to other workers via protobuf streams, forming a Virtual MapReduce Network.
*   **Phase 6: Advanced Swarm Engineering (✅ Active):**
    *   **Zero-Trust Security:** Workers must authenticate via strict API Keys (`WORKER_SECRET`) before joining the swarm.
    *   **Frontend Web Workers:** `SocketManager` offloads WebSocket heavy-lifting to background threads.
    *   **Polyglot DB Switchboard:** The `DatabaseOperationsCenter` UI allows runtime hot-swapping of individual domains (AUTH, AUDIT, CHAT) to different database engines (e.g., Auth to MongoDB, Audit to Postgres).
    *   **Asynchronous Database Mirrors:** Supports Zero-Delay write-behind mirroring, allowing a single domain to replicate data synchronously to a primary DB and asynchronously to N-mirrors without blocking the Relay Server CPU or user UI.
*   **Phase 7: True Zero-Knowledge E2EE (✅ Active):** The UI uses native browser `WebCrypto` to generate ECDH key pairs and derive AES-GCM shared secrets. The Relay Server acts as a dumb Public Key registry, completely blind to the actual encrypted payloads flowing through the chat system.
*   **Phase 8: Glassmorphism UI & Layout Engineering (✅ Active):**
    *   **Horizontal Fleet Bar:** The Swarm Node selector was refactored into a collapsible horizontal toolbar to maximize horizontal screen real estate for the `FileExplorer`.
    *   **Premium Auth Screen:** A pure-CSS, zero-JS glassmorphism login screen utilizing hardware-accelerated radial blurs to maintain a professional aesthetic with zero impact on low-resource VMs.
*   **Phase 9: Dedicated Media Ingestion Engines (✅ Active):**
    *   **Micro-Frontend Hub:** The UI features a dedicated "Music Rips" section operating as an App Store for specialized ingestion engines.
    *   **Apple Music Engine:** A highly-engineered, dedicated UI for ALAC/Atmos ripping, featuring live telemetry logs and interactive 2FA prompt support.
    *   **Chimera Worker Architecture:** Ephemeral Node.js backend workers dynamically orchestrate external Go binaries, Widevine Decryption Proxies (`wrapper`), and FFmpeg using sub-process spawning, routing the live stdout back to the UI, and automatically pushing massive ALAC files to cloud storage (`rclone move`) for a zero-disk footprint.
    *   **Just-In-Time (JIT) Cloning Engine:** Ephemeral workers pull and compile the absolute latest third-party ripper repositories exactly at boot time, preventing breakage from upstream API changes without needing to rebuild Swarm Docker images.
    *   **WebSocket Nervous System:** Complete end-to-end integration mapping UI interactions (like 2FA submission and configuration payloads) through the Relay Server directly into the ephemeral backend worker's sub-processes.
*   **Phase 10: The Immortal Swarm & Apple Music Database (✅ Active):**
    *   **JIT Bootstrapper (`bootstrap_worker.sh`):** A pre-flight bash script that dynamically `git clones` third-party repositories, runs `go build`, and fetches decryption binaries specifically for the host architecture (`x86_64` vs `aarch64`) before handing off to the Node.js orchestrator.
    *   **Dedicated Apple Music DB Domain:** The Relay Database Switchboard formally supports an `APPLE_MUSIC` schema to persist highly-sensitive `media-user-token`s and configuration states across ephemeral Swarm deployments.
    *   **Dynamic Cloud Handoff Routing:** Backend workers autonomously parse UI routing preferences to conditionally trigger `RcloneDaemonManager.uploadDirectory()`, beaming multi-gigabyte ALAC rips to specific Cloud storage paths.
        *   **Format-Specific Taxonomy:** The orchestrator dynamically pre-provisions sub-directories (`AppleMusic/Alac`, `AppleMusic/Atmos`, `AppleMusic/MusicVideos`) inside the ephemeral workspace. This forces the external binaries to neatly categorize output formats, ensuring the resulting payload remains beautifully structured when uploaded directly to cloud storage.
        *   **Visual Target Picker:** Rather than forcing users to type raw Rclone remote strings (`gdrive:Music/`), the Configuration UI dynamically queries connected VFS runtimes via WebSockets, allowing users to visually navigate and select handoff target folders using the `MiniBrowser` interface.
        *   **Intelligent Quick-Browse Transport:** Upon successful Zero-Disk handoff, the backend executes a highly-engineered 'Deep Traversal' of the ephemeral directory right before destruction. It calculates the exact nested path of the downloaded album (e.g., `gdrive:Music/AppleMusic/Alac/Daft Punk/Random Access Memories`) and broadcasts this coordinate back to the UI via the `RIPPER_TELEMETRY` WebSocket payload. This empowers the Queue Ledger to render a "Browse Upload" button, instantly transporting the user's viewport into the global `FileExplorer` at the precise cloud destination.
        *   **Fail-Safe Retention & Manual Override:** If the Zero-Disk handoff fails due to network issues, or if the user explicitly disables `autoUpload` during dispatch, the backend engages a 'Smart Confirmation' lock. It intentionally skips the `cleanupWorkspace` command, preserving the downloaded media safely on the ephemeral disk. The Queue Ledger detects this state and mounts a conditional "Upload Now" manual override button, allowing users to retroactively fix their configuration and push the retained files to the cloud.
    *   **Virtual File System (VFS) Sandbox:** To safely orchestrate strict third-party binaries that lack proper configuration argument parsing, the backend constructs temporary "VFS Vaults" via file symlinks (`fs.linkSync`). This tricks the external binary into believing it is running in total isolation, preventing data corruption when multiple users request rips simultaneously on a single worker node.
    *   **Hybrid Intelligent URL Router (Auto-Detector):** A collaborative frontend/backend feature that parses Apple Music URLs on the fly and predicts the user's intended scope. Because the underlying Go ripper natively processes album links fully unless specifically restricted, our UI acts as an intelligent safety layer.
        *   **How it works:** When a user pastes a URL, the React frontend analyzes it. If it detects `?i=` (a specific song), it immediately flips the UI dropdown to **"Single Song"**. If it detects `/artist/`, it flips to **"Entire Artist"**.
        *   **Backend Translation:** When the job is dispatched, the Node.js orchestrator reads this `ripMode` state and translates it into explicit CLI arguments for the Go binary (`--song` or `--all-album`).
        *   **Manual Overrides:** Users retain total control. If the Auto-Detector flags a song URL (with `?i=`) as "Single Song", but the user explicitly changes the UI dropdown back to "Full Album", the backend strips the `--song` flag. The Go binary will then natively ignore the `?i=` query parameter and proceed to download the entire album based on the base URL.
    *   **Distributed Job Ledger & Immutable Config Snapshots:** Ripping state is decoupled from the UI. When a job is dispatched, the frontend captures an immutable snapshot of all 30+ UI settings, guaranteeing zero cross-contamination even if UI switches are rapidly altered before the next dispatch. Users can monitor bulk parallel rips in the dedicated Queue Tab, view real-time `stdout` telemetry, inspect the frozen JSON config per job, and issue massive multi-select `SIGKILL` commands via `APPLE_MUSIC_CANCEL_REQUEST` WebSocket payloads to forcefully stop active backend binaries.
    *   **Chimera Hydration Engine (Ephemeral State Persistence):** Because Swarm workers are ephemeral and destroyed after use, the Widevine DRM keys and Apple login sessions are normally lost, forcing repeated 2FA challenges. The Hydration Engine acts as a "Memory Bank". When a worker shuts down, it uses a native Linux `tar` process to zip the wrapper's fake Android filesystem (`rootfs/data`) into a Base64 stream and saves it to the Relay Database. When the next worker boots (even in a different region), it asks the Relay for the state, unpacks it into the file system, and instantly bypasses 2FA.
    *   **Global Fleet State Persistence:** The Command Center UI utilizes an elevated Zustand global store (`fleetStore.ts`) tied directly to the persistent IDE layout. This ensures that the Active Worker Fleet list is preserved seamlessly across rapid tab navigation (e.g., swapping between the Explorer and DB Ops) without dropping the WebSocket state or requiring page reloads.
    *   **Web Worker Telemetry Whitelisting:** Real-time wrapper logs (`WRAPPER_STATUS_UPDATE`), 2FA triggers (`WRAPPER_2FA_CHALLENGE`), and Profile Lists (`WRAPPER_PROFILES_LIST`) are explicitly whitelisted through the `swarm.worker.ts` background thread, ensuring massive terminal log streams and database arrays never freeze the main React UI thread.
    *   **Stabilized CSS Transitions & UX:** The 2FA prompt UI utilizes `max-h` Tailwind classes rather than buggy `h-auto` to ensure stable, hardware-accelerated slide-in animations. The Configuration Matrix features simulated-network loading states and visual success feedback for optimal user interaction.
*   **Phase 11: Dual-State VFS & Hybrid Configuration Engine (✅ Active):**
    *   **Lightning Search:** Ephemeral workers execute bulk `rclone fast-list` APIs and stream the JSON results directly to the Polyglot DB. The UI queries the DB using virtualized lists (`react-window`) to search millions of cloud files in milliseconds without exhausting cloud API rate limits.
    *   **Hybrid Rclone Configs:** Workers dynamically merge `VFS_PERMANENT` configs (stored in the central database) with `VFS_EPHEMERAL` configs on the fly, creating an isolated `/tmp/rclone.conf` at runtime.
    *   **The Dead Man's Switch:** Ephemeral cloud indexes are protected by a MongoDB TTL index. If a GitHub Action crashes abruptly, the database heartbeat fails, and millions of temporary file records are automatically purged natively by the DB.
    *   **Universal Bulk VFS Operations & Zero-Disk Streaming:** The File Explorer supports massive multi-selection and cross-cloud copy/move operations (e.g., OneDrive -> Google Drive). Workers execute these transfers purely in RAM, pulling chunks from the source cloud and streaming them directly to the destination without writing massive payload data to the ephemeral disk.
    *   **Advanced Swarm Parallelism (UI Controls):** The Target Modal exposes highly-engineered `rclone` acceleration flags to the user before dispatching massive cross-cloud transfers:
        *   `--transfers` & `--checkers`: Cranks up parallel concurrency.
        *   `--drive-chunk-size`: Optimizes memory allocation for Google Drive uploads.
        *   `--tpslimit`: Acts as a critical "Safety Governor". By limiting the Transactions Per Second, users can maximize their gigabit transfer bandwidth without triggering `429 Too Many Requests` API bans from providers like Microsoft or Google.
        *   `--drive-server-side-across-configs`: A toggle to attempt true, zero-bandwidth server-side copying if transferring between two identical cloud providers.
    *   **Interactive Target Modals & Mini-Browser:** For copy/move actions, instead of forcing the user to type destination paths via text input, the UI injects a dynamic `MiniBrowser.tsx`. This isolated file picker browses the target remote folder structure on the fly so users can visually select their destination.
    *   **Non-Blocking Backend Orchestration (`VfsJobOrchestrator`):** Instead of freezing the backend worker using traditional blocking HTTP APIs (`rclone rc`), large-scale move/copy commands are orchestrated using parallel `child_process.spawn()` commands dynamically injected with the advanced speed parameters. The worker tracks the active PIDs and pipes the `rclone stats` output stream directly to the UI.
    *   **Live VFS Telemetry & Selective Deletion:** The Global Task Queue Drawer maps these specific VFS operations to visual progress bars. The UI natively supports `SIGKILL` capabilities via `VFS_TASK_CANCEL_REQUEST` to instantly kill errant cloud-to-cloud operations mid-flight. Furthermore, users have precise control over the telemetry data store with granular actions to wipe specific `taskId` entries or selectively clear only 'SUCCESS' or 'FAILED' history objects from the React `zustand` state.
    *   **VFS Config Auto-Fill UX (State Restoration):** To streamline the UI when managing multiple remote configurations, the VFS Config Manager implements an intelligent auto-fill feature. When a user selects a previously saved `Remote Alias` from the searchable datalist combo-box, the frontend explicitly fires a `VFS_CONFIG_LOAD_REQUEST` WebSocket event. The Relay Server intercepts this, queries the Polyglot DB across both Permanent and Ephemeral domains, and streams the exact saved configuration (`rcloneName`, `configText`, and `isEphemeral` toggle) back to the client. This instantly restores the full visual state of the form to exactly how the user left it, rather than just retaining the physical remote name.
*   **Phase 12: Master Control Plane & Persistent DB Routing (✅ Active):**
    *   **Core DB Isolation Principle:** The default MongoDB instance provided to the Relay Server acts strictly as the "Core DB". It is exclusively responsible for critical system schemas (like `AUTH`) and storing the system's routing configurations. To mathematically guarantee the Core DB is never bloated with multi-gigabyte VFS index payloads, the `DatabaseManager` explicitly forces all unconfigured database domains (like `VFS_PERMANENT` or `APPLE_MUSIC`) to default to a volatile `MOCK` in-memory engine upon boot.
    *   **Independent External Routing:** Through the Pluggable DB Switchboard UI, users can define independent database connection strings (Postgres, Supabase, alternative MongoDB clusters) for specific domains.
    *   **Boot Sequence Hydration:** When the Relay Server reboots, it securely fetches these routing choices from the `SystemRouting` schema within the Core DB. It instantly reconnects all external, independent databases before accepting traffic from workers, effectively achieving a true Microservices Database architecture on the fly.

---

## 🛠️ Quick Start (Development Mode)

The entire monorepo is governed by NPM Workspaces.

### 1. Install Dependencies & Environment Setup
This project requires specific system-level dependencies (like `rclone` for the backend and `playwright` for automated UI testing).

To streamline setup for both **Human Developers** and **AI Coding Agents**, we provide a dedicated setup script.

From the root of the repository, run:
```bash
bash jules_environment_setup.sh
```
*(Note: This script will install NPM packages, download the global `rclone` binary, and install Playwright chromium dependencies).*

**For AI Agents (Jules Workflow):**
To ensure the AI sandbox boots instantly without installing dependencies every session, you must configure the "Environment Snapshot".
1. Open the Jules Environment settings.
2. In the setup script box, enter: `bash jules_environment_setup.sh`
3. Click "Run and snapshot". All future sessions will load this environment instantly.

### 2. Compile Shared Contracts
Before running the services, the shared TypeScript data contracts must be compiled across the workspaces:
```bash
npm run build:all
```

### 3. Boot the Swarm Locally
You must start the "Central Nervous System" first:
```bash
npm run start:relay
```
Then, in a new terminal, boot up a local test worker:
```bash
npm run start:backend
```
Finally, in a third terminal, launch the Command Center UI:
```bash
npm run dev:frontend
```

Open your browser to `http://localhost:5173` to take control of your swarm.

---

## 🐳 Single-Instance Deployment (Docker Compose)

While the Distributed Swarm is designed to scale across dozens of ephemeral cloud instances to bypass IP rate-limits and maximize parallel bandwidth, it can easily be deployed on a single Virtual Machine (e.g., AWS EC2, DigitalOcean Droplet, or a home Raspberry Pi) using `docker-compose`.

### Single VM vs. Distributed Swarm
*   **Benefits of Single VM:** Zero network latency between the Relay and Worker, cheaper hosting, and simpler networking (no NAT hole-punching).
*   **Trade-offs:** A single VM relies on a single Public IP, making it susceptible to `429 Too Many Requests` API bans from cloud providers during massive bulk rips. It also limits maximum CPU/RAM for heavy media encoding.

### Deployment Steps (Automated Script)
To make GCP/AWS deployments incredibly fast, we provide an all-in-one bootstrapper. It detects your OS, installs Docker automatically, figures out your Public IP, and configures the environment variables for you.

#### Firewall Requirements
Before running the script, ensure your Cloud Provider's firewall (e.g., VPC Network in GCP or Security Groups in AWS) allows incoming traffic on:
*   **TCP Port 80** (HTTP for the UI)
*   **TCP Port 3001** (WebSockets for the Relay Server)

#### Run the Bootstrapper
SSH into your fresh Debian/Ubuntu VM and run this one-liner:
```bash
wget -qO- https://raw.githubusercontent.com/YOUR_REPO_ORG/distributed-swarm-monorepo/main/deploy_single_vm.sh | sudo bash
```
*(Note: If you haven't pushed the script to GitHub yet, simply clone this repository onto the VM and execute `sudo bash deploy_single_vm.sh`).*

The script will prompt you to confirm your Public IP address and then build the entire architecture. Once finished, visit `http://<YOUR_VM_IP>` in your browser.

### Manual Deployment Steps
If you prefer not to use the automated script:
1. Ensure Docker and Docker Compose are installed on your VM.
2. Clone the repository to the VM.
3. Create a `.env` file in the root directory containing `VITE_RELAY_URL=http://<YOUR_VM_IP>:3001`.
4. Build and start the Swarm stack:
```bash
docker compose up -d --build
```
5. The UI will be available at `http://<YOUR_VM_IP>:80`, powered by Nginx. The MongoDB Core Database and the Relay Server will automatically bind and communicate over the internal isolated Docker network.

---

> *"Any sufficiently advanced technology is indistinguishable from magic."*
