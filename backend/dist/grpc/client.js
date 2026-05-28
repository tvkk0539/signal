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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcSwarmClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const PROTO_PATH = path_1.default.resolve(__dirname, '../../../shared/src/proto/swarm.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const swarmProto = grpc.loadPackageDefinition(packageDefinition).swarm;
class GrpcSwarmClient {
    client;
    constructor(ipAddress, port) {
        const target = `${ipAddress}:${port}`;
        console.log(`[gRPC Client] Constructing client for target: ${target}`);
        this.client = new swarmProto.SwarmNode(target, grpc.credentials.createInsecure());
    }
    // Worker B (RELAY mode) connects to Relay Server to pull data
    async receivePipe(transferId, onData, onEnd, onError) {
        return new Promise((resolve, reject) => {
            console.log(`[gRPC Client] Initiating ReceivePipe connection to Relay...`);
            const call = this.client.ReceivePipe({ transfer_id: transferId });
            call.on('data', (chunk) => {
                onData(chunk.content);
            });
            call.on('end', () => {
                console.log(`[gRPC Client] ReceivePipe stream complete.`);
                onEnd();
                resolve();
            });
            call.on('error', (err) => {
                console.error(`[gRPC Client] ReceivePipe stream error:`, err);
                onError(err);
                reject(err);
            });
        });
    }
    // Pipes a Node.js Readable stream directly into the gRPC connection
    async pipeStream(transferId, stream) {
        return new Promise((resolve, reject) => {
            console.log(`[gRPC Client] Initiating PipeData stream to remote worker...`);
            const call = this.client.PipeData((error, response) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
            stream.on('data', (chunk) => {
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
exports.GrpcSwarmClient = GrpcSwarmClient;
