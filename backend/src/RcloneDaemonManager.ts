import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const RCLONE_RC_ADDR = '127.0.0.1:5572';
const RCLONE_RC_USER = 'swarm';
const RCLONE_RC_PASS = 'swarm-local-secret';
const RCLONE_RC_BASE_URL = `http://${RCLONE_RC_ADDR}`;

export class RcloneDaemonManager {
  private rcloneProcess: ChildProcess | null = null;
  private isRunning: boolean = false;

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Rclone] Daemon is already running.');
      return;
    }

    console.log('[Rclone] Booting Rclone Daemon in the background...');

    // To prevent "device or resource busy" config lock errors when deploying in Docker
    // or GitHub Actions where the config file is mapped as a read-only secret mount,
    // we copy the original config to a writable temporary file before booting rclone.
    const originalConfigPath = path.join(os.homedir(), '.config', 'rclone', 'rclone.conf');
    const tempConfigPath = '/tmp/rclone.conf';
    let rcloneArgs = [
      'rcd',
      '--rc-web-gui',
      `--rc-addr`, RCLONE_RC_ADDR,
      `--rc-user`, RCLONE_RC_USER,
      `--rc-pass`, RCLONE_RC_PASS
    ];

    try {
       if (fs.existsSync(originalConfigPath)) {
          fs.copyFileSync(originalConfigPath, tempConfigPath);
          console.log(`[Rclone] Copied read-only config to writable ${tempConfigPath}`);
          rcloneArgs.push('--config', tempConfigPath);
       }
    } catch (e: any) {
       console.warn(`[Rclone] Could not copy config to temp path: ${e.message}`);
    }

    // Using --rc-web-gui for local testing if requested, but mainly enabling rc
    this.rcloneProcess = spawn('rclone', rcloneArgs, {
      stdio: ['ignore', 'pipe', 'pipe'] // Listen to stdout and stderr
    });

    if (this.rcloneProcess.stdout) {
      this.rcloneProcess.stdout.on('data', (data) => {
        console.log(`[Rclone STDOUT]: ${data.toString().trim()}`);
      });
    }

    if (this.rcloneProcess.stderr) {
      this.rcloneProcess.stderr.on('data', (data) => {
        console.error(`[Rclone STDERR]: ${data.toString().trim()}`);
      });
    }

    this.rcloneProcess.on('close', (code) => {
      console.log(`[Rclone] Daemon exited with code ${code}`);
      this.isRunning = false;
      this.rcloneProcess = null;
    });

    // Wait until ping is successful
    let retries = 10;
    while (retries > 0) {
      try {
        await this.ping();
        console.log('[Rclone] Daemon successfully booted and is responsive.');
        this.isRunning = true;
        return;
      } catch (err) {
        retries--;
        console.log(`[Rclone] Waiting for daemon... (${10 - retries}/10)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('[Rclone] Failed to boot daemon. Timeout reached.');
  }

  public stop(): void {
    if (this.rcloneProcess && this.isRunning) {
      console.log('[Rclone] Stopping daemon...');
      this.rcloneProcess.kill('SIGTERM');
      this.isRunning = false;
      this.rcloneProcess = null;
    }
  }

  public async ping(): Promise<boolean> {
    try {
      const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
      const response = await axios.post(`${RCLONE_RC_BASE_URL}/core/pid`, {}, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      return response.status === 200;
    } catch (error) {
      throw error;
    }
  }

  public async listFiles(fs: string = '/', path: string = ''): Promise<any[]> {
    if (!this.isRunning) {
      throw new Error('Rclone daemon is not running');
    }

    // Default to the local root if fs is empty or missing
    const targetFs = fs || '/';

    try {
      console.log(`[Rclone] Executing listFiles on fs: "${targetFs}", path: "${path}"`);
      const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
      const response = await axios.post(`${RCLONE_RC_BASE_URL}/operations/list`, {
        fs: targetFs,
        remote: path
      }, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.list || [];
    } catch (error: any) {
      console.error(`[Rclone] listFiles Error: ${error.response?.data?.error || error.message}`);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  public async getRemotes(): Promise<any[]> {
    if (!this.isRunning) {
      throw new Error('Rclone daemon is not running');
    }

    try {
      console.log(`[Rclone] Fetching available remotes...`);
      const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
      const response = await axios.post(`${RCLONE_RC_BASE_URL}/config/dump`, {}, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      // The dump returns an object with remote names as keys
      const configDump = response.data || {};
      const remotes = Object.keys(configDump).map(key => ({
        name: `${key}:`,
        type: configDump[key].type
      }));

      // Always include the local filesystem
      remotes.unshift({ name: '/', type: 'local' });

      return remotes;
    } catch (error: any) {
      console.error(`[Rclone] getRemotes Error: ${error.response?.data?.error || error.message}`);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  public async statFile(fs: string, path: string): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Rclone daemon is not running');
    }

    const targetFs = fs || '/';
    try {
      console.log(`[Rclone] Executing stat on fs: "${targetFs}", path: "${path}"`);
      const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
      const response = await axios.post(`${RCLONE_RC_BASE_URL}/operations/stat`, {
        fs: targetFs,
        remote: path
      }, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.item;
    } catch (error: any) {
      console.error(`[Rclone] statFile Error: ${error.response?.data?.error || error.message}`);
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  // Phase 4: On-The-Fly Memory Streaming
  // Streams a file from rclone VFS as a buffer stream, allowing us to pipe it into WebRTC
  public async streamFile(fs: string, path: string, startByte: number = 0, endByte?: number): Promise<NodeJS.ReadableStream> {
    if (!this.isRunning) {
      throw new Error('Rclone daemon is not running');
    }

    const targetFs = fs || '/';
    console.log(`[Rclone] Initiating VFS stream for fs: "${targetFs}", path: "${path}", Range: bytes=${startByte}-${endByte || ''}`);

    const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');

    let rangeHeader = `bytes=${startByte}-`;
    if (endByte !== undefined) {
      rangeHeader += endByte.toString();
    }

    try {
      // We use axios to make an HTTP GET request to the local rclone WebDAV or HTTP VFS endpoint.
      // Note: To properly support GET streaming, the rclone command must include standard VFS flags or we hit the operations/publicLink API.
      // For this Phase 4 MVP, we will hit the internal core/command to `cat` the file directly into the stream,
      // or rely on a configured VFS endpoint if available.
      // A robust implementation would use `rcd` with `--vfs-cache-mode full` and access the HTTP server it spawns.

      // Correctly format the target path for rclone cat.
      // If targetFs is a remote (e.g., "gdrive:"), it already has a colon.
      // If it's local ("/"), we just use the path.
      let fullPath = path;
      if (targetFs !== '/') {
         // Ensure targetFs has exactly one trailing colon if it's a remote
         const cleanFs = targetFs.endsWith(':') ? targetFs : `${targetFs}:`;
         // Remove leading slashes from path when using remotes
         const cleanPath = path.startsWith('/') ? path.substring(1) : path;
         fullPath = `${cleanFs}${cleanPath}`;
      } else {
         fullPath = path.startsWith('/') ? path : `/${path}`;
      }

      const response = await axios.post(`${RCLONE_RC_BASE_URL}/core/command`, {
        command: "cat",
        arg: [fullPath],
        opt: { offset: startByte.toString(), count: endByte ? (endByte - startByte + 1).toString() : undefined }
      }, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      });

      return response.data;
    } catch (error: any) {
      console.error(`[Rclone] streamFile Error: ${error.message}`);
      throw error;
    }
  }
}
