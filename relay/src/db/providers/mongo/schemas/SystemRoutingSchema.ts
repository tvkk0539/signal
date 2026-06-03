import { Schema, Document } from 'mongoose';

export interface ISystemRoutingDocument extends Document {
  domain: string;
  primary: {
    engine: string;
    connectionString?: string;
    apiKey?: string;
  };
  mirrors: Array<{
    engine: string;
    connectionString?: string;
    apiKey?: string;
  }>;
  updatedAt: Date;
}

export const SystemRoutingSchema = new Schema<ISystemRoutingDocument>({
  domain: { type: String, required: true, unique: true, index: true },
  primary: {
    engine: { type: String, required: true },
    connectionString: { type: String },
    apiKey: { type: String }
  },
  mirrors: [{
    engine: { type: String, required: true },
    connectionString: { type: String },
    apiKey: { type: String }
  }],
  updatedAt: { type: Date, default: Date.now }
});
