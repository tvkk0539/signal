import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const RCLONE_RC_ADDR = '127.0.0.1:5572';
const RCLONE_RC_USER = 'swarm';
const RCLONE_RC_PASS = 'swarm-local-secret';
const RCLONE_RC_BASE_URL = `http://${RCLONE_RC_ADDR}`;

export interface RcloneConfigBlock {
  alias: string;
  configText: string;
}

export class RcloneDaemonManager {
  private rcloneProcess: ChildProcess | null = null;
  private isRunning: boolean = false;
  private configPath: string = '/tmp/rclone.conf';

  /**
   * Phase 11: Hybrid Configuration Engine
   * Generates the dynamic isolated /tmp/rclone.conf by merging Permanent and Ephemeral blocks.
   */
  public generateHybridConfig(permanentBlocks: RcloneConfigBlock[], ephemeralBlocks: RcloneConfigBlock[]) {
    console.log(`[RcloneDaemon] Building Hybrid Configuration Engine (${permanentBlocks.length} permanent, ${ephemeralBlocks.length} ephemeral)`);

    let combinedConfigText = '';

    // Always copy the host's physical config if it exists so we don't break local dev environments
    const originalConfigPath = path.join(os.homedir(), '.config', 'rclone', 'rclone.conf');
    if (fs.existsSync(originalConfigPath)) {
        combinedConfigText += fs.readFileSync(originalConfigPath, 'utf8') + '\n';
    }

    for (const block of permanentBlocks) {
      combinedConfigText += `\n# --- PERMANENT: ${block.alias} ---\n`;
      combinedConfigText += block.configText;
      combinedConfigText += `\n`;
    }

    for (const block of ephemeralBlocks) {
      combinedConfigText += `\n# --- EPHEMERAL: ${block.alias} ---\n`;
      combinedConfigText += block.configText;
      combinedConfigText += `\n`;
    }

    fs.writeFileSync(this.configPath, combinedConfigText.trim(), { mode: 0o600 });
    console.log(`[RcloneDaemon] Wrote isolated hybrid config to ${this.configPath}`);
  }

  public async start(permanentBlocks: RcloneConfigBlock[] = [], ephemeralBlocks: RcloneConfigBlock[] = []): Promise<void> {
    if (this.isRunning) {
      console.log('[Rclone] Daemon is already running.');
      return;
    }

    console.log('[Rclone] Booting Rclone Daemon in the background...');

    this.generateHybridConfig(permanentBlocks, ephemeralBlocks);

    let rcloneArgs = [
      'rcd',
      '--rc-web-gui',
      `--rc-addr`, RCLONE_RC_ADDR,
      `--rc-user`, RCLONE_RC_USER,
      `--rc-pass`, RCLONE_RC_PASS,
      '--config', this.configPath
    ];

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
  public async uploadDirectory(localPath: string, remoteFs: string, remotePath: string): Promise<void> {
    console.log(`[Rclone] Uploading directory ${localPath} to ${remoteFs}${remotePath}`);
    return new Promise((resolve, reject) => {
        // Use standard rclone copy command instead of RC API for large directory syncing
        const child = spawn('rclone', [
            'copy',
            localPath,
            `${remoteFs}${remotePath}`,
            '--stats', '1s',
            '-v'
        ]);

        child.stdout.on('data', (data) => console.log(`[Rclone Upload] ${data.toString().trim()}`));
        child.stderr.on('data', (data) => console.log(`[Rclone Upload] ${data.toString().trim()}`));

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`[Rclone] Upload complete for ${localPath}`);
                resolve();
            } else {
                reject(new Error(`Rclone copy exited with code ${code}`));
            }
        });
    });
  }

  /**
   * Phase 11: Massive Index Stream
   * Runs the `fast-list` command as a child process and returns the stream
   * to prevent loading a multi-gigabyte JSON tree into RAM.
   */
  public streamFastList(remoteName: string): ChildProcess {
    console.log(`[RcloneDaemon] Initiating massive fast-list stream for ${remoteName}...`);
    const args = [
      'lsjson',
      remoteName,
      '--fast-list',
      '-R',
      '--config', this.configPath
    ];

    return spawn('rclone', args);
  }

  public async streamFile(fs: string, path: string, startByte: number = 0, endByte?: number): Promise<NodeJS.ReadableStream> {
    if (!this.isRunning) {
      throw new Error('Rclone daemon is not running');
    }

    const targetFs = fs || '/';
    console.log(`[Rclone] Initiating VFS stream for fs: "${targetFs}", path: "${path}", Range: bytes=${startByte}-${endByte || ''}`);

    try {
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

      const args = [
        'cat', fullPath,
        '--config', '/tmp/rclone.conf',
        '--offset', startByte.toString()
      ];

      if (endByte !== undefined) {
        args.push('--count', (endByte - startByte + 1).toString());
      }

      // We spawn a child process to stream raw binary data directly
      const child = spawn('rclone', args);
      let stderrOutput = '';

      child.on('error', (err) => {
        console.error(`[Rclone] streamFile child process error:`, err);
        child.stdout.emit('error', err);
      });

      child.stderr.on('data', (data) => {
         const msg = data.toString();
         stderrOutput += msg;
         console.warn(`[Rclone cat stderr]: ${msg}`);
      });

      // Handle cases where rclone fails immediately (e.g., file not found)
      child.on('exit', (code) => {
         if (code !== 0) {
            console.error(`[Rclone] cat process exited with code ${code} for ${fullPath}`);
            const errMsg = stderrOutput.trim() || `rclone cat exited with code ${code}`;
            child.stdout.emit('error', new Error(errMsg));
         }
      });

      return child.stdout;
    } catch (error: any) {
      console.error(`[Rclone] streamFile Error: ${error.message}`);
      throw error;
    }
  }
}
