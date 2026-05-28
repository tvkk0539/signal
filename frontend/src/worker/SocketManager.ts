export class SocketManager {
  private static instance: SocketManager | null = null;
  private worker: Worker | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public connect(relayUrl: string, token: string) {
    if (this.worker) return; // Already connected

    console.log(`[SocketManager] Initializing Web Worker for WebSocket offloading...`);
    this.worker = new Worker(new URL('../worker/swarm.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      this.dispatch(type, payload);
    };

    this.worker.postMessage({
      type: 'INIT',
      payload: { relayUrl, token }
    });
  }

  public disconnect() {
    if (this.worker) {
      this.worker.postMessage({ type: 'DISCONNECT' });
      this.worker.terminate();
      this.worker = null;
    }
    this.listeners.clear();
    console.log(`[SocketManager] Web Worker Terminated.`);
  }

  public emit(event: string, data: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: 'EMIT',
        payload: { event, data }
      });
    }
  }

  public clearTasks() {
      if(this.worker) {
          this.worker.postMessage({ type: 'CLEAR_TASKS' });
      }
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: (data: any) => void) {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const filtered = this.listeners.get(event)!.filter(cb => cb !== callback);
      this.listeners.set(event, filtered);
    } else {
      this.listeners.delete(event);
    }
  }

  private dispatch(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => cb(data));
    }
  }
}
