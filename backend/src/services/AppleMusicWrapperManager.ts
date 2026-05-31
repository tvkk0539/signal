import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { EventEmitter } from 'events';

export class AppleMusicWrapperManager extends EventEmitter {
    private static instance: AppleMusicWrapperManager;

    // The user explicitly requested to follow the original bash script structure
    // which installs the wrapper globally in /app instead of the temporary folder.
    private readonly APP_DIR = '/app';
    private readonly WRAPPER_DIR = '/app/wrapper';
    private readonly BINARY_NAME = 'wrapper';

    private readonly DOWNLOAD_URL_X86 = 'https://github.com/zhaarey/wrapper/releases/download/linux.V2/wrapper.x86_64.tar.gz';
    private readonly DOWNLOAD_URL_ARM = 'https://github.com/zhaarey/wrapper/releases/download/arm64/wrapper.arm64.tar.gz';

    private process: ChildProcess | null = null;
    private logHistory: string[] = [];
    private readonly MAX_LOGS = 100;

    private constructor() {
        super();
        // Ensure base directories exist
        if (!fs.existsSync(this.APP_DIR)) {
            fs.mkdirSync(this.APP_DIR, { recursive: true });
        }
    }

    public static getInstance(): AppleMusicWrapperManager {
        if (!AppleMusicWrapperManager.instance) {
            AppleMusicWrapperManager.instance = new AppleMusicWrapperManager();
        }
        return AppleMusicWrapperManager.instance;
    }

    private log(message: string) {
        const ts = new Date().toISOString().split('T')[1].substring(0, 8);
        const entry = `[${ts}] ${message}`;
        this.logHistory.push(entry);
        if (this.logHistory.length > this.MAX_LOGS) {
            this.logHistory.shift();
        }
        this.emit('log', entry);
        console.log(`[AM Wrapper] ${message}`);
    }

    public isInstalled(): boolean {
        const exePath = path.join(this.WRAPPER_DIR, this.BINARY_NAME);
        return fs.existsSync(exePath);
    }

    public getStatus() {
        return {
            installed: this.isInstalled(),
            running: this.process !== null && !this.process.killed,
            pid: this.process ? this.process.pid : null,
            logs: [...this.logHistory]
        };
    }

    public async install(): Promise<void> {
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

            const child = spawn('bash', ['-c', `
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
                } else {
                    reject(new Error(`Installation failed with code ${code}`));
                }
            });
        });
    }

    public async start(username?: string, password?: string): Promise<void> {
        if (this.process) {
            throw new Error("Wrapper is already running.");
        }
        if (!this.isInstalled()) {
            throw new Error("Wrapper is not installed.");
        }

        const exePath = path.join(this.WRAPPER_DIR, this.BINARY_NAME);
        const args: string[] = ['-H', '0.0.0.0', '-D', '10020', '-M', '20020'];

        if (username && password) {
            args.push('-L', `${username}:${password}`);
        }

        this.log(`Starting wrapper proxy: ${exePath} ${args.join(' ')}`);

        // Spawn actual wrapper process using the absolute path to prevent ENOENT
        this.process = spawn(exePath, args, {
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

    public stop(): void {
        this.log("Stopping wrapper process & cleaning up ports...");

        // Execute cleanup similar to stop_wrapper.sh
        const child = spawn('bash', ['-c', `
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

    public sendInput(text: string): void {
        if (!this.process || !this.process.stdin) {
            throw new Error("Wrapper is not running or stdin is unavailable.");
        }

        this.log(`Sending input to wrapper (length: ${text.length})`);
        // Ensure newline is sent to simulate pressing "Enter"
        const payload = text.endsWith('\n') ? text : `${text}\n`;
        this.process.stdin.write(payload);
    }
}
