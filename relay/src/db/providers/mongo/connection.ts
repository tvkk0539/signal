import mongoose from 'mongoose';

export const connectMongo = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/swarm_db';
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[DB Manager] Successfully connected to MongoDB plugin.`);
  } catch (error) {
    console.error(`[DB Manager] Failed to connect to MongoDB plugin:`, error);
    throw error;
  }
};