import dns from "node:dns";
import mongoose from "mongoose";

/*
 * ========================================
 * MONGODB URI
 * ========================================
 *
 * Tách việc đọc biến môi trường thành hàm
 * trả về chắc chắn kiểu string.
 *
 * Điều này giúp TypeScript hiểu rằng
 * mongoose.connect() luôn nhận string,
 * không còn:
 *
 * string | undefined
 */
function getMongoUri(): string {
  const uri =
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Chưa khai báo MONGODB_URI trong file .env.local",
    );
  }

  return uri;
}

const mongoUri =
  getMongoUri();

/*
 * ========================================
 * LOCAL DNS
 * ========================================
 *
 * Máy Windows local có thể phân giải SRV
 * MongoDB Atlas không ổn định.
 *
 * Chỉ ép DNS khi không chạy trên Vercel.
 */
if (!process.env.VERCEL) {
  try {
    dns.setServers([
      "8.8.8.8",
      "1.1.1.1",
    ]);
  } catch (error) {
    console.error(
      "Không thể cấu hình DNS:",
      error,
    );
  }
}

/*
 * ========================================
 * MONGOOSE CACHE
 * ========================================
 *
 * Next.js development có thể reload module
 * nhiều lần.
 *
 * Cache connection trên globalThis giúp tránh
 * tạo quá nhiều connection tới MongoDB.
 */
interface MongooseCache {
  connection:
    | typeof mongoose
    | null;

  promise:
    | Promise<
        typeof mongoose
      >
    | null;
}

const globalWithMongoose =
  globalThis as typeof globalThis & {
    mongooseCache?:
      MongooseCache;
  };

const cached:
  MongooseCache =
    globalWithMongoose
      .mongooseCache ?? {
      connection:
        null,

      promise:
        null,
    };

globalWithMongoose.mongooseCache =
  cached;

/*
 * ========================================
 * CONNECT MONGODB
 * ========================================
 */
export default async function connectMongoDB(): Promise<
  typeof mongoose
> {
  /*
   * Đã có connection thì dùng lại.
   */
  if (
    cached.connection
  ) {
    return cached.connection;
  }

  /*
   * Chưa có promise kết nối thì tạo mới.
   */
  if (
    !cached.promise
  ) {
    cached.promise =
      mongoose.connect(
        mongoUri,
        {
          bufferCommands:
            false,

          serverSelectionTimeoutMS:
            15000,

          connectTimeoutMS:
            15000,

          socketTimeoutMS:
            45000,

          family:
            4,
        },
      );
  }

  try {
    cached.connection =
      await cached.promise;

    console.log(
      `MongoDB đã kết nối: ${
        cached.connection
          .connection.name
      }`,
    );

    return cached.connection;
  } catch (
    error
  ) {
    /*
     * Nếu connect lỗi, reset cache
     * để lần request sau có thể thử lại.
     */
    cached.promise =
      null;

    cached.connection =
      null;

    console.error(
      "Lỗi kết nối MongoDB:",
      error,
    );

    throw error;
  }
}