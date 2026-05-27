import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Load the shared protobuf definitions
const PROTO_PATH = path.resolve(__dirname, '../../../shared/src/proto/swarm.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const swarmProto: any = grpc.loadPackageDefinition(packageDefinition).swarm;

export class GrpcSwarmServer {
  private server: grpc.Server;
  private port: number = 0;

  constructor() {
    this.server = new grpc.Server();
    this.server.addService(swarmProto.SwarmNode.service, {
      PipeData: this.handlePipeData.bind(this)
    });
  }

  // Returns the port the gRPC server bound to
  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Bind to an ephemeral port (0) for zero-configuration deployments
      this.server.bindAsync('0.0.0.0:0', grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
          reject(err);
        } else {
          this.port = boundPort;
          console.log(`[gRPC Server] Listening on 0.0.0.0:${this.port}`);
          // Start the server (API changed in modern grpc-js, it starts automatically on bind, or we call start)
          this.server.start();
          resolve(this.port);
        }
      });
    });
  }

  public getPort(): number {
    return this.port;
  }

  public stop() {
    this.server.forceShutdown();
    console.log(`[gRPC Server] Shut down.`);
  }

  private handlePipeData(call: grpc.ServerReadableStream<any, any>, callback: grpc.sendUnaryData<any>) {
    console.log(`[gRPC Server] Incoming PipeData stream initiated...`);

    let totalBytes = 0;

    call.on('data', (chunk) => {
      // In a real MapReduce scenario, this worker would process the binary data here.
      // For MVP, we'll just log the speed and volume.
      totalBytes += chunk.content.length;
      if (chunk.is_last) {
         console.log(`[gRPC Server] Received final chunk for transfer: ${chunk.transfer_id}`);
      }
    });

    call.on('end', () => {
      console.log(`[gRPC Server] Stream complete. Total bytes received: ${totalBytes}`);
      callback(null, {
        success: true,
        message: 'Data piped successfully via gRPC',
        bytes_received: totalBytes
      });
    });

    call.on('error', (err) => {
      console.error(`[gRPC Server] Stream error:`, err);
      callback(err, null);
    });
  }
}
