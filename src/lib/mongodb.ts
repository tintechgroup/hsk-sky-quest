import dns from "node:dns";
import mongoose from "mongoose";

// Ép Node.js dùng DNS công cộng để tra bản ghi MongoDB SRV.
dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Chưa khai báo MONGODB_URI trong file .env.local",
  );
}

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose =
  globalThis as typeof globalThis & {
    mongooseCache?: MongooseCache;
  };

const cached: MongooseCache =
  globalWithMongoose.mongooseCache ?? {
    connection: null,
    promise: null,
  };

globalWithMongoose.mongooseCache = cached;

export default async function connectMongoDB() {
  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(
      MONGODB_URI,
      {
        dbName: "hsk_sky_quest",
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000,
      },
    );
  }

  try {
    cached.connection = await cached.promise;
    return cached.connection;
  } catch (error) {
    cached.promise = null;
    cached.connection = null;
    throw error;
  }
}