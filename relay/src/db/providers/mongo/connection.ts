import mongoose, { Connection } from 'mongoose';

// Map to hold multiple connections if different domains connect to different MongoDB clusters
const connections = new Map<string, Connection>();

export const createMongoConnection = async (connectionString?: string): Promise<Connection> => {
  const uri = connectionString || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/swarm_commander';

  if (connections.has(uri)) {
    console.log(`[MongoDB] Using existing connection for URI: ${uri}`);
    return connections.get(uri)!;
  }

  console.log(`[MongoDB] Creating new Mongoose connection to: ${uri}`);

  try {
    const conn = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000 // Fast fail for mock fallback
    });

    // Wait for the connection to actually be established
    await new Promise<void>((resolve, reject) => {
        conn.once('open', resolve);
        conn.once('error', reject);
    });

    console.log(`[MongoDB] Connection Successful to ${uri}`);
    connections.set(uri, conn);
    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection Failed:', error);
    throw error;
  }
};
