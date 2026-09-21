import dns from "node:dns";
import { NextResponse } from "next/server";

// Dùng đường dẫn chính xác, tránh import nhầm file lib ngoài src.
import connectMongoDB from "../../../lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ép DNS ngay trước khi Mongoose kết nối.
    dns.setServers([
      "8.8.8.8",
      "1.1.1.1",
    ]);

    dns.setDefaultResultOrder("ipv4first");

    const mongoose = await connectMongoDB();
    const connection = mongoose.connection;

    return NextResponse.json({
      success: true,
      message: "MongoDB đã kết nối thành công",
      database: connection.name,
      host: connection.host,
    });
  } catch (error) {
    console.error(
      "Lỗi kết nối MongoDB:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Không thể kết nối MongoDB",
        details:
          error instanceof Error
            ? error.message
            : "Lỗi không xác định",
      },
      {
        status: 500,
      },
    );
  }
}