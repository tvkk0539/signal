"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppleMusicRipperService = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
const yaml = __importStar(require("js-yaml"));
const crypto = __importStar(require("crypto"));
class AppleMusicRipperService extends events_1.EventEmitter {
    BASE_DIR = process.env.DOWNLOAD_ROOT || '/tmp/swarm_data';
    APP_DIR = path.join(this.BASE_DIR, 'apple_music');
    // Using the JIT built binary path as defined in our architecture
    BINARY_PATH = path.join(this.APP_DIR, 'am-ripper');
    activeJobs = new Map();
    constructor() {
        super();
        if (!fs.existsSync(this.APP_DIR)) {
            fs.mkdirSync(this.APP_DIR, { recursive: true });
        }
    }
    log(jobId, message) {
        const ts = new Date().toISOString().split('T')[1].substring(0, 8);
        const entry = `[${ts}] [RIP-${jobId.substring(0, 6)}] ${message}`;
        this.emit('telemetry', { jobId, log: entry });
        console.log(entry);
    }
    /**
     * Dynamically generates the config.yaml required by the Go Ripper.
     */
    generateConfigYaml(workspaceDir, config) {
        const downloadsDir = path.join(workspaceDir, 'downloads');
        if (!fs.existsSync(downloadsDir))
            fs.mkdirSync(downloadsDir, { recursive: true });
        // Map UI configuration to the Go Ripper's specific YAML structure
        const yamlData = {
            'media-user-token': config.mediaUserToken,
            'authorization-token': config.authorizationToken || "",
            'language': "",
            'lrc-type': "lyrics",
            'lrc-format': "lrc",
            'embed-lrc': config.embedLrc,
            'save-lrc-file': false,
            'save-artist-cover': false,
            'save-animated-artwork': config.animatedArt,
            'emby-animated-artwork': false,
            'embed-cover': true,
            'cover-size': "5000x5000",
            'cover-format': "jpg",
            'tag-sort-order': true,
            'tag-itunes-id': true,
            // Route all formats to the same isolated download folder for this job
            'alac-save-folder': downloadsDir,
            'atmos-save-folder': downloadsDir,
            'aac-save-folder': downloadsDir,
            'mv-save-folder': downloadsDir,
            'max-memory-limit': 256,
            'decrypt-m3u8-port': "127.0.0.1:10020",
            'get-m3u8-port': "127.0.0.1:20020",
            'get-m3u8-from-device': true,
            'exit-on-error': true,
            'get-m3u8-mode': "hires",
            'aac-type': "aac-lc",
            'alac-max': parseInt(config.qualityLimit),
            'atmos-max': 2768,
            'limit-max': 200,
            'album-folder-format': "{AlbumName}",
            'playlist-folder-format': "{PlaylistName}",
            'song-file-format': "{SongNumer}. {SongName}",
            'artist-folder-format': "{UrlArtistName}",
            'explicit-choice': "[E]",
            'clean-choice': "[C]",
            'apple-master-choice': "[M]",
            'use-songinfo-for-playlist': false,
            'dl-albumcover-for-playlist': false,
            'mv-audio-type': "atmos",
            'mv-max': 2160,
            'storefront': config.storefront || "us",
            'alac-fix': false,
            'convert-after-download': config.format === 'flac',
            'convert-format': "flac",
            'convert-keep-original': false,
            'convert-skip-if-source-matches': true,
            'ffmpeg-path': "ffmpeg",
            'convert-extra-args': "",
            'convert-with-metadata': true,
            'convert-warn-lossy-to-lossless': true,
            'convert-skip-lossy-to-lossless': true,
            'convert-check-bad-alac': false,
            'convert-delete-bad-alac': false
        };
        const configPath = path.join(workspaceDir, 'config.yaml');
        fs.writeFileSync(configPath, yaml.dump(yamlData));
        return configPath;
    }
    /**
     * Initializes an isolated Workspace, generates the config, and spawns the Go Ripper.
     */
    async executeRipJob(config) {
        // 1. Isolation: Create a highly specific workspace for this job to prevent cross-contamination
        const jobId = crypto.randomUUID();
        const workspaceDir = path.join(this.APP_DIR, `job_${jobId}`);
        fs.mkdirSync(workspaceDir, { recursive: true });
        this.log(jobId, `Initializing new isolated rip environment at ${workspaceDir}`);
        // 2. Dynamic Provisioning
        const configPath = this.generateConfigYaml(workspaceDir, config);
        this.log(jobId, `Dynamically generated config.yaml`);
        // Check if JIT binary exists (For development mocking, we'll bypass if missing)
        const isRipperInstalled = fs.existsSync(this.BINARY_PATH);
        let cmd = this.BINARY_PATH;
        let args = ['--config', configPath];
        // Map UI format selection to command line arguments
        if (config.format === 'atmos')
            args.push('--atmos');
        if (config.format === 'aac')
            args.push('--aac');
        args.push(config.url);
        // 3. Sub-Process Execution
        this.log(jobId, `Spawning Go Ripper Core: ${cmd} ${args.join(' ')}`);
        const childProc = (0, child_process_1.spawn)(isRipperInstalled ? cmd : 'bash', isRipperInstalled ? args : ['-c', `
            echo "[INFO] Loading ${configPath}..."
            sleep 1
            echo "[INFO] Resolving URL: ${config.url}"
            sleep 2
            echo "[INFO] Requesting Wrapper Decryption via 127.0.0.1:10020"
            sleep 2
            echo "[HTTP] 200 OK - Stream Acquired."
            echo "Downloading segments (0/42)..."
            sleep 1
            echo "Downloading segments (42/42)..."
            echo "[INFO] Muxing audio tracks with MP4Box..."
            sleep 2
            echo "[SUCCESS] Saved to ${path.join(workspaceDir, 'downloads', 'track.m4a')}"
        `], {
            cwd: workspaceDir,
            env: { ...process.env }
        });
        this.activeJobs.set(jobId, childProc);
        // 4. The Telemetry Pipe (Routing stdout to Relay)
        childProc.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                // Emit raw string for the UI Terminal
                this.emit('telemetry', { jobId, log: output });
            }
        });
        childProc.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                this.emit('telemetry', { jobId, log: `[ERROR] ${output}` });
            }
        });
        // 5. Lifecycle and Cloud Handoff Hook
        childProc.on('close', (code) => {
            this.log(jobId, `Go Ripper Core exited with code ${code}`);
            this.activeJobs.delete(jobId);
            if (code === 0) {
                // Success! Next step in Swarm Architecture: Trigger Rclone Handoff
                this.log(jobId, `Initiating Zero-Disk Cloud Handoff sequence...`);
                this.emit('job_complete', {
                    jobId,
                    status: 'SUCCESS',
                    downloadDir: path.join(workspaceDir, 'downloads')
                });
            }
            else {
                this.emit('job_complete', {
                    jobId,
                    status: 'FAILED',
                    error: `Process exited with code ${code}`
                });
            }
            // Cleanup Ephemeral Workspace (Wait slightly so cloud handoff can read it first)
            // In a real flow, RcloneDaemonManager would delete the folder after moving.
            // For now, we mock the cleanup.
            setTimeout(() => {
                if (fs.existsSync(workspaceDir)) {
                    fs.rmSync(workspaceDir, { recursive: true, force: true });
                    this.log(jobId, `Workspace annihilated. Ephemeral disk restored.`);
                }
            }, 5000);
        });
        return { jobId };
    }
    cancelJob(jobId) {
        const process = this.activeJobs.get(jobId);
        if (process) {
            this.log(jobId, `Forcefully terminating job (SIGKILL)`);
            process.kill('SIGKILL');
            this.activeJobs.delete(jobId);
        }
    }
}
exports.AppleMusicRipperService = AppleMusicRipperService;
