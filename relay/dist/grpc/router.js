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
exports.GrpcRelayRouter = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const PROTO_PATH = path_1.default.resolve(__dirname, '../../../shared/src/proto/swarm.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const swarmProto = grpc.loadPackageDefinition(packageDefinition).swarm;
class GrpcRelayRouter {
    server;
    port = 0;
    ipAddress = '0.0.0.0';
    // Maps transfer_id to a TransferBridge
    bridges = new Map();
    constructor() {
        this.server = new grpc.Server();
        this.server.addService(swarmProto.SwarmNode.service, {
            PipeData: this.handlePipeData.bind(this),
            ReceivePipe: this.handleReceivePipe.bind(this)
        });
    }
    async start() {
        return new Promise((resolve, reject) => {
            this.server.bindAsync(`${this.ipAddress}:0`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.port = boundPort;
                    console.log(`[gRPC Relay Router] Listening on ${this.ipAddress}:${this.port}`);
                    this.server.start();
                    resolve(this.port);
                }
            });
        });
    }
    getPort() {
        return this.port;
    }
    getIp() {
        // In a real prod setup, this should return the public IP of the Relay.
        // For local dev/docker, we'll return a placeholder or 127.0.0.1
        return process.env.RELAY_PUBLIC_IP || '127.0.0.1';
    }
    stop() {
        this.server.forceShutdown();
        console.log(`[gRPC Relay Router] Shut down.`);
    }
    createTransferSession() {
        const transferId = (0, uuid_1.v4)();
        this.bridges.set(transferId, {
            buffer: [],
            isClosed: false
        });
        console.log(`[gRPC Relay Router] Created transfer session: ${transferId}`);
        return transferId;
    }
    // Worker A streams data TO the Relay
    handlePipeData(call, callback) {
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
                }
                else {
                    // Buffer it temporarily if Target hasn't connected yet
                    // Add backpressure to prevent Memory OOM crash for massive files
                    if (bridge.buffer.length > 5000) { // Limit buffer to ~320MB assuming 64KB chunks
                        console.warn(`[gRPC Relay Router] Buffer limit reached for transfer ${transferId}. Dropping chunks.`);
                    }
                    else {
                        bridge.buffer.push(chunk);
                    }
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
    handleReceivePipe(call) {
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
        }
        else {
            console.error(`[gRPC Relay Router] ReceivePipe error: Invalid transfer_id ${transferId}`);
            call.end();
        }
    }
}
exports.GrpcRelayRouter = GrpcRelayRouter;
