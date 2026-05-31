import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { EventEmitter } from 'events';

export class AppleMusicWrapperManager extends EventEmitter {
    private static instance: AppleMusicWrapperManager;

    // The user explicitly requested to follow the original bash script structure
    // which installs the wrapper globally in /app instead of the temporary folder.
    private APP_DIR: string;
    private WRAPPER_DIR: string;
    private readonly BINARY_NAME = 'wrapper';

    private readonly DOWNLOAD_URL_X86 = 'https://github.com/zhaarey/wrapper/releases/download/linux.V2/wrapper.x86_64.tar.gz';
    private readonly DOWNLOAD_URL_ARM = 'https://github.com/zhaarey/wrapper/releases/download/arm64/wrapper.arm64.tar.gz';

    private process: ChildProcess | null = null;
    private logHistory: string[] = [];
    private readonly MAX_LOGS = 100;

    private constructor() {
        super();
        // Evaluate permissions dynamically ONCE during initialization
        const targetAppDir = '/app';
        try {
            if (!fs.existsSync(targetAppDir)) {
                fs.mkdirSync(targetAppDir, { recursive: true });
            }
            // If we successfully created/accessed /app, use it
            this.APP_DIR = targetAppDir;
            this.WRAPPER_DIR = path.join(targetAppDir, 'wrapper');
        } catch (e: any) {
            console.warn(`[AM Wrapper] Failed to create ${targetAppDir}. Ensure the user has permissions, or use a local folder. Using /tmp/app fallback. Error: ${e.message}`);
            this.APP_DIR = '/tmp/app';
            this.WRAPPER_DIR = '/tmp/app/wrapper';
            if (!fs.existsSync(this.APP_DIR)) {
                fs.mkdirSync(this.APP_DIR, { recursive: true });
            }
        }
        console.log(`[AM Wrapper] Resolved Base Execution Path to: ${this.WRAPPER_DIR}`);
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

        // Detect system architecture as in the original setup_wrapper.sh
        const arch = process.arch;
        let url = '';
        if (arch === 'x64') { // Node process.arch 'x64' maps to bash 'x86_64'
            url = this.DOWNLOAD_URL_X86;
        } else if (arch === 'arm64') { // Node process.arch 'arm64' maps to bash 'aarch64'
            url = this.DOWNLOAD_URL_ARM;
        } else {
            throw new Error(`Unsupported architecture: ${arch}`);
        }

        this.log(`Detected architecture: ${arch}. Using URL: ${url}`);

        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.WRAPPER_DIR)) {
                fs.mkdirSync(this.WRAPPER_DIR, { recursive: true });
            }

            // Exactly mimic the configure_environment data directory structure
            const rootFs = path.join(this.APP_DIR, 'rootfs', 'data');
            if (!fs.existsSync(rootFs)) {
                fs.mkdirSync(rootFs, { recursive: true });
            }

            // Implement the missing chmod 777 permission fix for rootless environments
            try {
                fs.chmodSync(rootFs, 0o777);
            } catch (e: any) {
                this.log(`[WARN] Failed to apply 777 to ${rootFs} using Node. Fallback to bash chmod.`);
            }

            this.log("Downloading wrapper tarball...");

            // Execute the precise commands from setup_wrapper.sh using local permissions
            const child = spawn('bash', ['-c', `
                wget -q "${url}" -O wrapper.tar.gz && \
                tar -xzf wrapper.tar.gz && \
                rm wrapper.tar.gz && \
                chmod +x ${this.BINARY_NAME} && \
                chmod -R 777 "${rootFs}"
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

        // Enforce strict credential validation to prevent anonymous wrapper boots
        if (!username || !password) {
            throw new Error("Strict Authentication Enforced: Wrapper requires valid Apple ID credentials to start.");
        }

        // Host Timezone Mapping Fix: Map the container's tzdata into the wrapper's fake rootfs
        // This permanently silences the '__bionic_open_tzdata: couldn't find any tzdata' warning
        try {
            const hostTzPath = '/usr/share/zoneinfo';
            const wrapperTzPath = path.join(this.APP_DIR, 'rootfs', 'system', 'usr', 'share', 'zoneinfo');
            if (fs.existsSync(hostTzPath)) {
                if (!fs.existsSync(wrapperTzPath)) {
                    fs.mkdirSync(wrapperTzPath, { recursive: true });
                }
                // Use bash to perform a safe copy to prevent cross-device link errors
                spawn('bash', ['-c', `cp -rn ${hostTzPath}/* ${wrapperTzPath}/ || true`]);
            }
        } catch (e: any) {
            this.log(`[WARN] Failed to map host tzdata to wrapper rootfs: ${e.message}`);
        }

        // Exact argument parsing based on configure_environment in setup_wrapper.sh
        const args: string[] = ['-H', '0.0.0.0'];
        args.push('-L', `${username}:${password}`);

        args.push('-D', '10020');
        args.push('-M', '20020');

        this.log(`Starting wrapper proxy via bash handoff`);

        // Spawn wrapper process using bash handoff to resolve dynamic linker paths
        // securely passing arguments as positional parameters to prevent command injection
        // and preserve passwords containing special characters (like $).
        this.process = spawn('bash', ['-c', `exec ./${this.BINARY_NAME} "$@"`, '--', ...args], {
            cwd: this.WRAPPER_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                // Inject fake Android env vars to silence noisy __bionic_open_tzdata_path warnings
                ANDROID_ROOT: '/system',
                ANDROID_DATA: '/data'
            }
        });

        this.process.stdout?.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                this.log(output);
                // The crucial 2FA detection logic!
                if (output.includes('Enter 2FA') || output.includes('Verification code') || output.includes('2FA Code') || output.includes('two-factor') || output.includes('2FA: true')) {
                    this.emit('requires_2fa');
                }
            }
        });

        this.process.stderr?.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                // The wrapper binary uses stderr for standard INFO logging (e.g. "[+] starting...").
                // We map it directly instead of prepending [ERROR] to keep the UI terminal clean.
                this.log(output);
                 if (output.includes('Enter 2FA') || output.includes('Verification code') || output.includes('2FA Code') || output.includes('two-factor') || output.includes('2FA: true')) {
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

        // Execute EXACT cleanup sequence from stop_wrapper.sh
        const child = spawn('bash', ['-c', `
            echo "Stopping all wrapper processes..."
            pkill -f wrapper || echo "No wrapper processes found"
            sleep 1
            pkill -9 -f wrapper || true
            fuser -k 10020/tcp 20020/tcp >/dev/null 2>&1 || true
            echo "Cleanup complete. Current wrapper processes:"
            ps aux | grep '[w]rapper'
        `]);

        child.stdout.on('data', (d) => this.log(d.toString().trim()));
        child.stderr.on('data', (d) => this.log(`[ERROR] ${d.toString().trim()}`));

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
