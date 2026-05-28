import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(__dirname, '../../../shared/src/proto/swarm.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const swarmProto: any = grpc.loadPackageDefinition(packageDefinition).swarm;

export class GrpcSwarmClient {
  private client: any;

  constructor(ipAddress: string, port: number) {
    const target = `${ipAddress}:${port}`;
    console.log(`[gRPC Client] Constructing client for target: ${target}`);
    this.client = new swarmProto.SwarmNode(target, grpc.credentials.createInsecure());
  }

  // Worker B (RELAY mode) connects to Relay Server to pull data
  public async receivePipe(transferId: string, onData: (chunk: Buffer) => void, onEnd: () => void, onError: (err: Error) => void) {
    console.log(`[gRPC Client] Initiating ReceivePipe connection to Relay...`);

    const call = this.client.ReceivePipe({ transfer_id: transferId });

    call.on('data', (chunk: any) => {
      onData(chunk.content);
    });

    call.on('end', () => {
      console.log(`[gRPC Client] ReceivePipe stream complete.`);
      onEnd();
    });

    call.on('error', (err: Error) => {
      console.error(`[gRPC Client] ReceivePipe stream error:`, err);
      onError(err);
    });
  }

  // Pipes a Node.js Readable stream directly into the gRPC connection
  public async pipeStream(transferId: string, stream: NodeJS.ReadableStream): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`[gRPC Client] Initiating PipeData stream to remote worker...`);

      const call = this.client.PipeData((error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });

      stream.on('data', (chunk: Buffer) => {
        call.write({
          transfer_id: transferId,
          content: chunk,
          is_last: false
        });
      });

      stream.on('end', () => {
        // Send a tiny final message to flag completion before ending the call
        call.write({
          transfer_id: transferId,
          content: Buffer.from([]),
          is_last: true
        });
        call.end();
        console.log(`[gRPC Client] Stream piping complete. Closing gRPC stream.`);
      });

      stream.on('error', (err) => {
        console.error(`[gRPC Client] Source stream error:`, err);
        call.cancel();
        reject(err);
      });
    });
  }
}
