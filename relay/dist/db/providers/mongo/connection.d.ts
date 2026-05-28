import { Connection } from 'mongoose';
export declare const createMongoConnection: (connectionString?: string) => Promise<Connection>;
