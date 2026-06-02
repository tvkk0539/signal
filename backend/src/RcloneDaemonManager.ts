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
  private configPath = '/tmp/rclone.conf';

  public async mergeAndApplyConfig(permanentConfig: string): Promise<void> {
     console.log(`[Rclone] Merging Ephemeral and Permanent configurations...`);

     let existingConfig = "";
     if (fs.existsSync(this.configPath)) {
         existingConfig = fs.readFileSync(this.configPath, 'utf8');
     } else {
         const originalConfigPath = path.join(os.homedir(), '.config', 'rclone', 'rclone.conf');
         if (fs.existsSync(originalConfigPath)) {
             existingConfig = fs.readFileSync(originalConfigPath, 'utf8');
         }
     }

     // Prevent duplicate merging if the user clicks apply multiple times
     if (permanentConfig && !existingConfig.includes(permanentConfig)) {
         const merged = `${existingConfig}\n\n${permanentConfig}`;
         fs.writeFileSync(this.configPath, merged);
     }
  }

  public async getPermanentRemotesFromConfig(): Promise<string[]> {
      const permanentRemotes: string[] = [];
      const permanentConfigPath = path.join(os.homedir(), '.config', 'rclone', 'rclone_permanent.conf');

      if (fs.existsSync(permanentConfigPath)) {
          const configContent = fs.readFileSync(permanentConfigPath, 'utf8');
          // Parse rclone config brackets like [GoogleDrive]
          const matches = configContent.match(/\[(.*?)\]/g);
          if (matches) {
              matches.forEach(match => {
                  const remoteName = match.replace(/\[|\]/g, '') + ':';
                  permanentRemotes.push(remoteName);
              });
          }
      }
      return permanentRemotes;
  }

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
    let rcloneArgs = [
      'rcd',
      '--rc-web-gui',
      `--rc-addr`, RCLONE_RC_ADDR,
      `--rc-user`, RCLONE_RC_USER,
      `--rc-pass`, RCLONE_RC_PASS
    ];

    try {
       // 1. Copy original ephemeral config
       if (!fs.existsSync(this.configPath) && fs.existsSync(originalConfigPath)) {
          fs.copyFileSync(originalConfigPath, this.configPath);
          console.log(`[Rclone] Copied read-only config to writable ${this.configPath}`);
       } else if (!fs.existsSync(this.configPath)) {
          fs.writeFileSync(this.configPath, "");
       }

       // 2. Perform Boot-Time Merge of GitHub Secrets
       const permanentConfigPath = path.join(os.homedir(), '.config', 'rclone', 'rclone_permanent.conf');
       if (fs.existsSync(permanentConfigPath)) {
           const permContent = fs.readFileSync(permanentConfigPath, 'utf8');
           if (permContent.trim()) {
               console.log(`[Rclone] Found GitHub Secrets Permanent Config. Merging on boot.`);
               const existing = fs.readFileSync(this.configPath, 'utf8');
               if (!existing.includes(permContent)) {
                   fs.writeFileSync(this.configPath, `${existing}\n\n${permContent}`);
               }
           }
       }

       rcloneArgs.push('--config', this.configPath);
    } catch (e: any) {
       console.warn(`[Rclone] Could not setup temp config: ${e.message}`);
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

  /**
   * Generates a massive mathematical tree of the entire remote using fast-list.
   * This operates purely in Rclone's memory and is heavily paginated.
   */
  public async buildVfsTree(fsName: string): Promise<any[]> {
      if (!this.isRunning) throw new Error('Rclone daemon is not running');

      console.log(`[Rclone] Building High-Speed VFS Tree for ${fsName}...`);
      try {
          const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
          const response = await axios.post(`${RCLONE_RC_BASE_URL}/operations/list`, {
              fs: fsName,
              remote: "",
              opt: { recurse: true, fastList: true }
          }, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
              }
          });
          return response.data.list || [];
      } catch (error: any) {
          console.error(`[Rclone] Failed to build VFS tree for ${fsName}:`, error.message);
          return [];
      }
  }

  /**
   * Delta Sync: Uses the core/command RC API to ask Rclone to only return files that have
   * changed since a specific time, bypassing massive memory allocations.
   */
  public async buildVfsDeltaTree(fsName: string, lastSyncTime: Date): Promise<any[]> {
      if (!this.isRunning) throw new Error('Rclone daemon is not running');

      console.log(`[Rclone] Executing Delta Sync for ${fsName} since ${lastSyncTime.toISOString()}`);
      try {
          const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');

          // We use operations/list but filter by ModTime in the backend if API doesn't support --max-age
          // Since Rclone RC operations/list doesn't cleanly expose --max-age directly,
          // we fetch the tree but heavily optimize parsing. (For true delta, a custom rc command is needed,
          // but for MVP we will filter post-fetch).
          const response = await axios.post(`${RCLONE_RC_BASE_URL}/operations/list`, {
              fs: fsName,
              remote: "",
              opt: { recurse: true, fastList: true }
          }, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
              }
          });

          const list = response.data.list || [];

          // Filter out files that haven't changed since last sync
          const deltaList = list.filter((f: any) => new Date(f.ModTime) > lastSyncTime);
          console.log(`[Rclone] Delta Sync returned ${deltaList.length} changed files out of ${list.length} total.`);
          return deltaList;
      } catch (error: any) {
          console.error(`[Rclone] Failed Delta Sync for ${fsName}:`, error.message);
          return [];
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
