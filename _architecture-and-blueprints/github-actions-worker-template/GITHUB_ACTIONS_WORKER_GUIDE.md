# 🐙 GitHub Actions Backend Worker Guide

This folder contains a template specifically designed for running **Backend Workers** inside free GitHub Action runners using Docker.

Because our architecture uses a central Relay Server, you can create dozens of empty GitHub repositories across multiple GitHub accounts, and use this template to spin up ephemeral workers that all connect back to your main Swarm Command Center!

---

## 🛠️ How to Use This Template

If you want to spin up a worker in a completely different GitHub account, follow these exact steps:

### Step 1: Create a Blank Repository
1. Log into the target GitHub account.
2. Create a new, empty repository (e.g., `my-swarm-node-1`).

### Step 2: Add the Required Secrets
The worker needs to know where to connect and how to authenticate.
1. In your new repository, click on **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret**.
3. Create the first secret:
   *   **Name:** `RELAY_URL`
   *   **Secret:** `http://YOUR_MAIN_SERVER_IP:3001` (Or `wss://relay.yourdomain.com`).
4. Create the second secret:
   *   **Name:** `WORKER_SECRET`
   *   **Secret:** `your_super_secure_swarm_password` (Must match the Relay Server's Gatekeeper password).

### Step 3: Add Dual-Mode gRPC Routing Secrets (Optional)
To support blazing fast Worker-to-Worker file transfers, the architecture uses a "Dual-Mode" gRPC Engine. You must configure this depending on *where* you are deploying.

**Scenario A: "Yes" - Deploying to a Public VPS (GCP/AWS/DigitalOcean)**
If this worker is being deployed on a standard cloud VM, it has a public IP address. Add these secrets so other workers can connect directly to it:
*   **Name:** `GRPC_PUBLIC_IP`
*   **Secret:** `192.168.1.100` *(Replace with the server's actual public IP address)*
*   **Name:** `GRPC_PORT`
*   **Secret:** `50051` *(Or whichever port you expose. Default is a dynamic random port).*

**Scenario B: "No" - Deploying to GitHub Actions**
GitHub Actions runners are heavily firewalled and do *not* have a public IP address.
*   *Action Required:* **Do nothing!** Do not create these secrets.
*   *How it works:* The worker will auto-detect that it is "Firewalled" (because `GRPC_PUBLIC_IP` is missing). It will automatically fall back to **Reverse-Tunnel Relay Mode**. It will ask the Relay Server to hold the data, and it will "pull" the data through the firewall!

### Step 4: Add Cloud Drive Secrets (Optional but Recommended)
To allow your worker to browse and stream from cloud drives (Google Drive, OneDrive), you must provide your `rclone.conf` data. You can do this in two ways:

**Method A: Raw Text (Recommended)**
Open your local `rclone.conf` file, copy all the text, and create a secret:
*   **Name:** `RCLONE_CONF_TEXT`
*   **Secret:** *(Paste the entire contents of your rclone.conf here)*

**Method B: Secure URL**
If you host your config on a secure, raw endpoint (like a private gist with a token):
*   **Name:** `RCLONE_CONF_URL`
*   **Secret:** `https://your-secure-url.com/rclone.conf`

*The `.yml` workflow will automatically detect which method you used and inject the configuration into the Docker container!*

### Step 5: Add the Workflow File
1. In the repository, create a new folder path: `.github/workflows/`
2. Create a new file inside it named `run-worker.yml`.
3. Copy and paste the entire contents of the `run-worker.yml` file from this template folder into that new file.

**CRITICAL EDIT:**
Inside the `.yml` file, you must find and replace `your-username` with the GitHub username of the account that actually hosts the Docker image!
*   *Find:* `ghcr.io/your-username/distributed-swarm-monorepo-worker:latest`
*   *Replace:* `ghcr.io/TheAccountWhereCodeLives/distributed-swarm-monorepo-worker:latest`

Commit the file to the main branch.

### Step 6: Boot the Worker
1. Click the **Actions** tab in your GitHub repository.
2. On the left sidebar, click **"Swarm Backend Worker (Docker Runner)"**.
3. On the right side, click the **"Run workflow"** button.
4. The worker will instantly boot up, pull the Docker image, read your secrets, mount your cloud drives, and connect to your UI!

---

## ⚠️ Important Limitations of GitHub Actions

While GitHub Actions provides incredible, free compute power, you must understand the rules of "Ephemeral Runners."

### 1. The 6-Hour Death Sentence
A GitHub Action runner has a strict maximum lifespan of **6 hours (360 minutes)**.
When 6 hours is up, GitHub will instantly kill the server, destroying everything on it.
*   **The Swarm Solution:** Our architecture is designed for this! When the GitHub Action dies, the worker simply disconnects from the Relay Server. Your UI will show "Worker Offline." You just click "Run workflow" again to get a fresh 6-hour worker.

### 2. Disk Space (The 14GB Limit)
GitHub Action runners only have about **14GB of free hard drive space**.
If you try to download a 50GB file onto the runner, the server will crash with an "Out of Space / Disk Full" error.
*   **The Swarm Solution:** This is exactly why we built the **Rclone Engine (VFS)**! By using HTTP Range Requests and On-The-Fly Memory Streaming through the WebRTC/WebSocket pipe, the heavy files pass through the GitHub Action's RAM and go straight to your UI without ever touching the 14GB physical hard drive!
