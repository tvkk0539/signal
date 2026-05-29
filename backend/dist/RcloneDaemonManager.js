"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RcloneDaemonManager = void 0;
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const RCLONE_RC_ADDR = '127.0.0.1:5572';
const RCLONE_RC_USER = 'swarm';
const RCLONE_RC_PASS = 'swarm-local-secret';
const RCLONE_RC_BASE_URL = `http://${RCLONE_RC_ADDR}`;
class RcloneDaemonManager {
    rcloneProcess = null;
    isRunning = false;
    async start() {
        if (this.isRunning) {
            console.log('[Rclone] Daemon is already running.');
            return;
        }
        console.log('[Rclone] Booting Rclone Daemon in the background...');
        // To prevent "device or resource busy" config lock errors when deploying in Docker
        // or GitHub Actions where the config file is mapped as a read-only secret mount,
        // we copy the original config to a writable temporary file before booting rclone.
        const originalConfigPath = path_1.default.join(os_1.default.homedir(), '.config', 'rclone', 'rclone.conf');
        const tempConfigPath = '/tmp/rclone.conf';
        let rcloneArgs = [
            'rcd',
            '--rc-web-gui',
            `--rc-addr`, RCLONE_RC_ADDR,
            `--rc-user`, RCLONE_RC_USER,
            `--rc-pass`, RCLONE_RC_PASS
        ];
        try {
            if (fs_1.default.existsSync(originalConfigPath)) {
                fs_1.default.copyFileSync(originalConfigPath, tempConfigPath);
                console.log(`[Rclone] Copied read-only config to writable ${tempConfigPath}`);
                rcloneArgs.push('--config', tempConfigPath);
            }
        }
        catch (e) {
            console.warn(`[Rclone] Could not copy config to temp path: ${e.message}`);
        }
        // Using --rc-web-gui for local testing if requested, but mainly enabling rc
        this.rcloneProcess = (0, child_process_1.spawn)('rclone', rcloneArgs, {
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
            }
            catch (err) {
                retries--;
                console.log(`[Rclone] Waiting for daemon... (${10 - retries}/10)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('[Rclone] Failed to boot daemon. Timeout reached.');
    }
    stop() {
        if (this.rcloneProcess && this.isRunning) {
            console.log('[Rclone] Stopping daemon...');
            this.rcloneProcess.kill('SIGTERM');
            this.isRunning = false;
            this.rcloneProcess = null;
        }
    }
    async ping() {
        try {
            const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
            const response = await axios_1.default.post(`${RCLONE_RC_BASE_URL}/core/pid`, {}, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.status === 200;
        }
        catch (error) {
            throw error;
        }
    }
    async listFiles(fs = '/', path = '') {
        if (!this.isRunning) {
            throw new Error('Rclone daemon is not running');
        }
        // Default to the local root if fs is empty or missing
        const targetFs = fs || '/';
        try {
            console.log(`[Rclone] Executing listFiles on fs: "${targetFs}", path: "${path}"`);
            const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
            const response = await axios_1.default.post(`${RCLONE_RC_BASE_URL}/operations/list`, {
                fs: targetFs,
                remote: path
            }, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.list || [];
        }
        catch (error) {
            console.error(`[Rclone] listFiles Error: ${error.response?.data?.error || error.message}`);
            throw new Error(error.response?.data?.error || error.message);
        }
    }
    async getRemotes() {
        if (!this.isRunning) {
            throw new Error('Rclone daemon is not running');
        }
        try {
            console.log(`[Rclone] Fetching available remotes...`);
            const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
            const response = await axios_1.default.post(`${RCLONE_RC_BASE_URL}/config/dump`, {}, {
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
        }
        catch (error) {
            console.error(`[Rclone] getRemotes Error: ${error.response?.data?.error || error.message}`);
            throw new Error(error.response?.data?.error || error.message);
        }
    }
    async statFile(fs, path) {
        if (!this.isRunning) {
            throw new Error('Rclone daemon is not running');
        }
        const targetFs = fs || '/';
        try {
            console.log(`[Rclone] Executing stat on fs: "${targetFs}", path: "${path}"`);
            const auth = Buffer.from(`${RCLONE_RC_USER}:${RCLONE_RC_PASS}`).toString('base64');
            const response = await axios_1.default.post(`${RCLONE_RC_BASE_URL}/operations/stat`, {
                fs: targetFs,
                remote: path
            }, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.item;
        }
        catch (error) {
            console.error(`[Rclone] statFile Error: ${error.response?.data?.error || error.message}`);
            throw new Error(error.response?.data?.error || error.message);
        }
    }
    // Phase 4: On-The-Fly Memory Streaming
    // Streams a file from rclone VFS as a buffer stream, allowing us to pipe it into WebRTC
    async streamFile(fs, path, startByte = 0, endByte) {
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
            }
            else {
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
            // We spawn a child process to stream raw binary data directly, avoiding JSON wrappers
            // from the rclone rc core/command API.
            const child = (0, child_process_1.spawn)('rclone', args);
            child.on('error', (err) => {
                console.error(`[Rclone] streamFile child process error:`, err);
            });
            child.stderr.on('data', (data) => {
                console.warn(`[Rclone cat stderr]: ${data.toString()}`);
            });
            // Handle cases where rclone fails immediately (e.g., file not found)
            child.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`[Rclone] cat process exited with code ${code} for ${fullPath}`);
                    // If the stream is already returned, we should somehow emit an error.
                    // Since we return child.stdout, we can emit an error on it.
                    child.stdout.emit('error', new Error(`rclone cat exited with code ${code}`));
                }
            });
            return child.stdout;
        }
        catch (error) {
            console.error(`[Rclone] streamFile Error: ${error.message}`);
            throw error;
        }
    }
}
exports.RcloneDaemonManager = RcloneDaemonManager;
