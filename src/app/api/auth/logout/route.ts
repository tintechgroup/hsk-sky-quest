import {
  NextResponse,
} from "next/server";

import {
  AUTH_COOKIE_NAME,
} from "@/lib/auth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function POST() {
  try {
    const response =
      NextResponse.json({
        success: true,

        message:
          "Đăng xuất thành công.",
      });

    /*
     * Xóa cookie auth chính.
     */
    response.cookies.set(
      AUTH_COOKIE_NAME,
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          0,

        expires:
          new Date(0),
      },
    );

    /*
     * Xóa luôn cookie cũ nếu project
     * từng sử dụng các tên này.
     */
    response.cookies.set(
      "auth-token",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          0,

        expires:
          new Date(0),
      },
    );

    response.cookies.set(
      "token",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          0,

        expires:
          new Date(0),
      },
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/logout:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể đăng xuất.",
      },
      {
        status: 500,
      },
    );
  }
}