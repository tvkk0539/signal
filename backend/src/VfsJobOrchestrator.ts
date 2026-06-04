import { spawn, ChildProcess } from 'child_process';
import { RcloneDaemonManager } from './RcloneDaemonManager';

export class VfsJobOrchestrator {
  private activeJobs = new Map<string, ChildProcess>();

  constructor(private rcloneManager: RcloneDaemonManager) {}

  public executeBatchAction(
    jobId: string,
    action: 'move' | 'copy',
    srcFs: string,
    dstFs: string,
    paths: { src: string; dst: string }[],
    onProgress: (progressStr: string) => void,
    onComplete: (success: boolean, error?: string) => void
  ) {
    if (paths.length === 0) {
      onComplete(true);
      return;
    }

    // We use a temporary file to pass a list of source/destination pairs if possible,
    // or we iterate sequentially using child processes to get individual stats.
    // For simplicity and immediate progress feedback, let's orchestrate them sequentially
    // inside an async worker function and pipe the combined progress.

    const runSequentially = async () => {
      let completed = 0;
      const total = paths.length;

      for (const p of paths) {
        // If job was cancelled
        if (!this.activeJobs.has(jobId) && completed > 0) {
            onComplete(false, 'Job was cancelled');
            return;
        }

        try {
          await this.executeSingle(jobId, action, srcFs, p.src, dstFs, p.dst, (prog) => {
             // Combine overall item progress with byte progress
             const baseProg = Math.floor((completed / total) * 100);
             onProgress(`[${completed + 1}/${total}] ${prog}`);
          });
          completed++;
        } catch (error: any) {
          onComplete(false, error.message);
          return;
        }
      }
      onComplete(true);
    };

    // Initialize the job state
    // We put a dummy process initially just to mark it active. It gets replaced by actual processes.
    this.activeJobs.set(jobId, {} as ChildProcess);
    runSequentially();
  }

  private executeSingle(
    jobId: string,
    action: 'move' | 'copy',
    srcFs: string,
    srcPath: string,
    dstFs: string,
    dstPath: string,
    onProgress: (prog: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const srcFull = this.formatPath(srcFs, srcPath);
      const dstFull = this.formatPath(dstFs, dstPath);

      console.log(`[VFS Orchestrator] ${action} ${srcFull} -> ${dstFull}`);

      const args = [
        action === 'move' ? 'moveto' : 'copyto',
        srcFull,
        dstFull,
        '--config', '/tmp/rclone.conf',
        '--stats', '500ms',
        '--stats-one-line'
      ];

      const child = spawn('rclone', args);

      // Update the active map with the real process
      this.activeJobs.set(jobId, child);

      child.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text) onProgress(text);
      });

      // rclone stats go to stderr by default!
      child.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text) {
           // Parse rclone stats: "  0 B / 50 MiB, 0%, 0 B/s, ETA -"
           onProgress(text);
        }
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else if (code === null) reject(new Error('Process was killed'));
        else reject(new Error(`rclone exited with code ${code}`));
      });
    });
  }

  public cancelJob(jobId: string) {
    const child = this.activeJobs.get(jobId);
    if (child) {
      console.log(`[VFS Orchestrator] Cancelling job ${jobId}`);
      if (typeof child.kill === 'function') {
         child.kill('SIGKILL');
      }
      this.activeJobs.delete(jobId);
    }
  }

  private formatPath(fs: string, path: string): string {
    const cleanFs = fs === '/' ? '' : (fs.endsWith(':') ? fs : `${fs}:`);
    const cleanPath = path.startsWith('/') && cleanFs ? path.substring(1) : path;
    if (!cleanFs) return path.startsWith('/') ? path : `/${path}`;
    return `${cleanFs}${cleanPath}`;
  }
}
