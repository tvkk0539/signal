import { Server, Socket } from 'socket.io';
interface WorkerData {
    socket: Socket;
    grpcPort?: number;
    ipAddress: string;
}
export declare const connectedWorkers: Map<string, WorkerData>;
export declare const connectedUIClients: Map<string, Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>>;
export declare function setupSockets(io: Server): void;
export {};
