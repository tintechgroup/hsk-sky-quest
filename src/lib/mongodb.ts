import dns from "node:dns";
import mongoose from "mongoose";

/*
 * Máy Windows từng gặp lỗi querySrv ECONNREFUSED.
 * Chỉ ép DNS khi chạy trên máy local.
 * Khi deploy Vercel, hệ thống dùng DNS của Vercel.
 */
if (!process.env.VERCEL) {
  try {
    dns.setServers([
      "8.8.8.8",
      "1.1.1.1",
    ]);

    dns.setDefaultResultOrder("ipv4first");
  } catch (error) {
    console.warn(
      "Không thể thiết lập DNS:",
      error,
    );
  }
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
  /*
   * Khai báo bên trong hàm để Next.js không lỗi
   * khi kiểm tra TypeScript trong quá trình build.
   */
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "Chưa khai báo biến MONGODB_URI",
    );
  }

  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(
      mongoUri as string,
      {
        dbName: "hsk_sky_quest",
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      },
    );
  }

  try {
    cached.connection =
      await cached.promise;

    return cached.connection;
  } catch (error) {
    cached.connection = null;
    cached.promise = null;

    console.error(
      "Lỗi kết nối MongoDB:",
      error,
    );

    throw error;
  }
}