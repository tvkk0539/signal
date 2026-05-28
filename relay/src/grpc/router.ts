import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PROTO_PATH = path.resolve(__dirname, '../../../shared/src/proto/swarm.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const swarmProto: any = grpc.loadPackageDefinition(packageDefinition).swarm;

interface TransferBridge {
  sourceStream?: grpc.ServerReadableStream<any, any>;
  targetStream?: grpc.ServerWritableStream<any, any>;
  sourceCallback?: grpc.sendUnaryData<any>;
  buffer: any[];
  isClosed: boolean;
}

export class GrpcRelayRouter {
  private server: grpc.Server;
  private port: number = 0;
  private ipAddress: string = '0.0.0.0';

  // Maps transfer_id to a TransferBridge
  private bridges = new Map<string, TransferBridge>();

  constructor() {
    this.server = new grpc.Server();
    this.server.addService(swarmProto.SwarmNode.service, {
      PipeData: this.handlePipeData.bind(this),
      ReceivePipe: this.handleReceivePipe.bind(this)
    });
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.bindAsync(`${this.ipAddress}:0`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
          reject(err);
        } else {
          this.port = boundPort;
          console.log(`[gRPC Relay Router] Listening on ${this.ipAddress}:${this.port}`);
          this.server.start();
          resolve(this.port);
        }
      });
    });
  }

  public getPort(): number {
    return this.port;
  }

  public getIp(): string {
    // In a real prod setup, this should return the public IP of the Relay.
    // For local dev/docker, we'll return a placeholder or 127.0.0.1
    return process.env.RELAY_PUBLIC_IP || '127.0.0.1';
  }

  public stop() {
    this.server.forceShutdown();
    console.log(`[gRPC Relay Router] Shut down.`);
  }

  public createTransferSession(): string {
    const transferId = uuidv4();
    this.bridges.set(transferId, {
      buffer: [],
      isClosed: false
    });
    console.log(`[gRPC Relay Router] Created transfer session: ${transferId}`);
    return transferId;
  }

  // Worker A streams data TO the Relay
  private handlePipeData(call: grpc.ServerReadableStream<any, any>, callback: grpc.sendUnaryData<any>) {
    console.log(`[gRPC Relay Router] Incoming PipeData stream initiated...`);

    let transferId = '';
    let totalBytes = 0;

    call.on('data', (chunk) => {
      if (!transferId && chunk.transfer_id) {
         transferId = chunk.transfer_id;
         console.log(`[gRPC Relay Router] PipeData identified transfer: ${transferId}`);
      }

      const bridge = this.bridges.get(transferId);
      if (bridge) {
         bridge.sourceStream = call;
         bridge.sourceCallback = callback;
         totalBytes += chunk.content.length;

         if (bridge.targetStream) {
             // If Target is already connected, pipe it directly
             bridge.targetStream.write(chunk);
         } else {
             // Buffer it temporarily if Target hasn't connected yet (handle with care in prod!)
             bridge.buffer.push(chunk);
         }

         if (chunk.is_last) {
            console.log(`[gRPC Relay Router] Received final chunk from Source for transfer: ${transferId}`);
            if (bridge.targetStream) {
                bridge.targetStream.end();
            }
         }
      }
    });

    call.on('end', () => {
      console.log(`[gRPC Relay Router] Source stream complete. Total bytes received: ${totalBytes}`);
      const bridge = this.bridges.get(transferId);
      if (bridge) {
          bridge.isClosed = true;
      }
      callback(null, {
        success: true,
        message: 'Data routed successfully via Relay',
        bytes_received: totalBytes
      });
      // Cleanup
      setTimeout(() => this.bridges.delete(transferId), 5000);
    });

    call.on('error', (err) => {
      console.error(`[gRPC Relay Router] Source stream error:`, err);
      callback(err, null);
    });
  }

  // Worker B connects to Relay to pull data FROM the Relay
  private handleReceivePipe(call: grpc.ServerWritableStream<any, any>) {
    const request = call.request;
    const transferId = request.transfer_id;

    console.log(`[gRPC Relay Router] Target Worker connected for ReceivePipe: ${transferId}`);

    const bridge = this.bridges.get(transferId);
    if (bridge) {
        bridge.targetStream = call;

        // Flush any buffered data
        while (bridge.buffer.length > 0) {
            const chunk = bridge.buffer.shift();
            call.write(chunk);
        }

        // If the source already finished before target connected (unlikely but possible)
        if (bridge.isClosed) {
           call.end();
        }
    } else {
        console.error(`[gRPC Relay Router] ReceivePipe error: Invalid transfer_id ${transferId}`);
        call.end();
    }
  }
}
