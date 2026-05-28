import { Server, Socket } from 'socket.io';
import { GrpcRelayRouter } from '../grpc/router';
export declare const grpcRouter: GrpcRelayRouter;
interface WorkerData {
    socket: Socket;
    grpcPort?: number;
    ipAddress: string;
    grpcMode?: 'DIRECT' | 'RELAY';
}
export declare const connectedWorkers: Map<string, WorkerData>;
export declare const connectedUIClients: Map<string, Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>>;
export declare const publicKeyRegistry: Map<string, string>;
export declare function setupSockets(io: Server): void;
export {};
