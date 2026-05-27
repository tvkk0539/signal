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
exports.GrpcSwarmServer = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
// Load the shared protobuf definitions
const PROTO_PATH = path_1.default.resolve(__dirname, '../../../shared/src/proto/swarm.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const swarmProto = grpc.loadPackageDefinition(packageDefinition).swarm;
class GrpcSwarmServer {
    server;
    port = 0;
    constructor() {
        this.server = new grpc.Server();
        this.server.addService(swarmProto.SwarmNode.service, {
            PipeData: this.handlePipeData.bind(this)
        });
    }
    // Returns the port the gRPC server bound to
    async start() {
        return new Promise((resolve, reject) => {
            // Bind to an ephemeral port (0) for zero-configuration deployments
            this.server.bindAsync('0.0.0.0:0', grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.port = boundPort;
                    console.log(`[gRPC Server] Listening on 0.0.0.0:${this.port}`);
                    // Start the server (API changed in modern grpc-js, it starts automatically on bind, or we call start)
                    this.server.start();
                    resolve(this.port);
                }
            });
        });
    }
    getPort() {
        return this.port;
    }
    stop() {
        this.server.forceShutdown();
        console.log(`[gRPC Server] Shut down.`);
    }
    handlePipeData(call, callback) {
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
exports.GrpcSwarmServer = GrpcSwarmServer;
