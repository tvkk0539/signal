import { Server, Socket } from 'socket.io';
export declare const connectedWorkers: Map<string, Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>>;
export declare const connectedUIClients: Map<string, Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>>;
export declare function setupSockets(io: Server): void;
