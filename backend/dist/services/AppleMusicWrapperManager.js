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
exports.AppleMusicWrapperManager = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
class AppleMusicWrapperManager extends events_1.EventEmitter {
    static instance;
    // The user explicitly requested to follow the original bash script structure
    // which installs the wrapper globally in /app instead of the temporary folder.
    APP_DIR = '/app';
    WRAPPER_DIR = '/app/wrapper';
    BINARY_NAME = 'wrapper';
    DOWNLOAD_URL_X86 = 'https://github.com/zhaarey/wrapper/releases/download/linux.V2/wrapper.x86_64.tar.gz';
    DOWNLOAD_URL_ARM = 'https://github.com/zhaarey/wrapper/releases/download/arm64/wrapper.arm64.tar.gz';
    process = null;
    logHistory = [];
    MAX_LOGS = 100;
    constructor() {
        super();
        // Ensure base directories exist
        if (!fs.existsSync(this.APP_DIR)) {
            fs.mkdirSync(this.APP_DIR, { recursive: true });
        }
    }
    static getInstance() {
        if (!AppleMusicWrapperManager.instance) {
            AppleMusicWrapperManager.instance = new AppleMusicWrapperManager();
        }
        return AppleMusicWrapperManager.instance;
    }
    log(message) {
        const ts = new Date().toISOString().split('T')[1].substring(0, 8);
        const entry = `[${ts}] ${message}`;
        this.logHistory.push(entry);
        if (this.logHistory.length > this.MAX_LOGS) {
            this.logHistory.shift();
        }
        this.emit('log', entry);
        console.log(`[AM Wrapper] ${message}`);
    }
    isInstalled() {
        const exePath = path.join(this.WRAPPER_DIR, this.BINARY_NAME);
        return fs.existsSync(exePath);
    }
    getStatus() {
        return {
            installed: this.isInstalled(),
            running: this.process !== null && !this.process.killed,
            pid: this.process ? this.process.pid : null,
            logs: [...this.logHistory]
        };
    }
    async install() {
        this.log("Starting installation process...");
        const arch = process.arch;
        const url = arch === 'arm64' ? this.DOWNLOAD_URL_ARM : this.DOWNLOAD_URL_X86;
        this.log(`Detected architecture: ${arch}. Using URL: ${url}`);
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.WRAPPER_DIR)) {
                fs.mkdirSync(this.WRAPPER_DIR, { recursive: true });
            }
            const rootFs = path.join(this.APP_DIR, 'rootfs', 'data');
            if (!fs.existsSync(rootFs)) {
                fs.mkdirSync(rootFs, { recursive: true });
            }
            this.log("Downloading wrapper tarball...");
            const tarPath = path.join(this.WRAPPER_DIR, 'wrapper.tar.gz');
            const child = (0, child_process_1.spawn)('bash', ['-c', `
                wget -q "${url}" -O wrapper.tar.gz && \
                tar -xzf wrapper.tar.gz && \
                rm wrapper.tar.gz && \
                chmod +x ${this.BINARY_NAME} && \
                chmod -R 777 ${rootFs}
            `], { cwd: this.WRAPPER_DIR });
            child.stdout.on('data', (d) => this.log(d.toString().trim()));
            child.stderr.on('data', (d) => this.log(`[ERROR] ${d.toString().trim()}`));
            child.on('close', (code) => {
                if (code === 0) {
                    this.log("Installation successful.");
                    resolve();
                }
                else {
                    reject(new Error(`Installation failed with code ${code}`));
                }
            });
        });
    }
    async start(username, password) {
        if (this.process) {
            throw new Error("Wrapper is already running.");
        }
        if (!this.isInstalled()) {
            throw new Error("Wrapper is not installed.");
        }
        const exePath = path.join(this.WRAPPER_DIR, this.BINARY_NAME);
        const args = ['-H', '0.0.0.0', '-D', '10020', '-M', '20020'];
        if (username && password) {
            args.push('-L', `${username}:${password}`);
        }
        this.log(`Starting wrapper proxy: ./wrapper ${args.join(' ')}`);
        // Spawn actual wrapper process
        this.process = (0, child_process_1.spawn)('./' + this.BINARY_NAME, args, {
            cwd: this.WRAPPER_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.process.stdout?.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                this.log(output);
                // The crucial 2FA detection logic!
                if (output.includes('Enter 2FA') || output.includes('Verification code') || output.includes('2FA Code') || output.includes('two-factor')) {
                    this.emit('requires_2fa');
                }
            }
        });
        this.process.stderr?.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                this.log(`[ERROR] ${output}`);
                if (output.includes('Enter 2FA') || output.includes('Verification code') || output.includes('2FA Code') || output.includes('two-factor')) {
                    this.emit('requires_2fa');
                }
            }
        });
        this.process.on('close', (code) => {
            this.log(`Wrapper exited with code ${code}`);
            this.process = null;
            this.emit('stopped');
        });
        this.emit('started', this.process.pid);
    }
    stop() {
        this.log("Stopping wrapper process & cleaning up ports...");
        // Execute cleanup similar to stop_wrapper.sh
        const child = (0, child_process_1.spawn)('bash', ['-c', `
            echo "Killing wrapper..."
            pkill -f wrapper || true
            sleep 1
            pkill -9 -f wrapper || true
            fuser -k 10020/tcp 20020/tcp >/dev/null 2>&1 || true
            echo "Cleanup complete."
        `]);
        child.stdout.on('data', (d) => this.log(d.toString().trim()));
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
        }
        this.emit('stopped');
    }
    sendInput(text) {
        if (!this.process || !this.process.stdin) {
            throw new Error("Wrapper is not running or stdin is unavailable.");
        }
        this.log(`Sending input to wrapper (length: ${text.length})`);
        // Ensure newline is sent to simulate pressing "Enter"
        const payload = text.endsWith('\n') ? text : `${text}\n`;
        this.process.stdin.write(payload);
    }
}
exports.AppleMusicWrapperManager = AppleMusicWrapperManager;
