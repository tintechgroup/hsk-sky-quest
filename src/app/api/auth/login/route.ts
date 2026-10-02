import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createAuthToken,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as LoginBody;

    const username =
      typeof body.username === "string"
        ? normalizeUsername(body.username)
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vui lòng nhập tài khoản và mật khẩu.",
        },
        {
          status: 400,
        },
      );
    }

    if (username.length < 4) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản phải có ít nhất 4 ký tự.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    /*
     * passwordHash có select: false trong model,
     * vì vậy phải chủ động lấy bằng
     * .select("+passwordHash").
     */
    const user =
      await UserModel.findOne({
        username,
      }).select("+passwordHash");

    if (
      !user ||
      !user.passwordHash
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản hoặc mật khẩu không chính xác.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Không cho tài khoản bị khóa đăng nhập.
     */
    if (
      user.isActive === false ||
      user.status === "blocked" ||
      user.status === "inactive"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản đã bị khóa hoặc ngừng hoạt động.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * So sánh mật khẩu nhập vào
     * với mật khẩu đã mã hóa.
     */
    const passwordMatches =
      await bcrypt.compare(
        password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản hoặc mật khẩu không chính xác.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Cập nhật lần đăng nhập gần nhất.
     */
    user.lastLoginAt = new Date();

    await user.save();

    /*
     * Tạo JWT lưu thông tin cần thiết.
     */
    const token = createAuthToken({
      userId: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const response =
      NextResponse.json(
        {
          success: true,
          message: `Chào mừng ${user.name} quay trở lại!`,

          user: {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            role: user.role,

            gamesPlayed:
              user.gamesPlayed,
            wins: user.wins,
            losses: user.losses,
            draws: user.draws,
            totalScore:
              user.totalScore,
          },
        },
        {
          status: 200,
        },
      );

    /*
     * Cookie HttpOnly giúp JavaScript phía
     * trình duyệt không đọc được token.
     */
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/login:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể đăng nhập. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}