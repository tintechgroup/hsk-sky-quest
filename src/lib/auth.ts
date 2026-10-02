import "server-only";

import jwt from "jsonwebtoken";

import type {
  JwtPayload,
  SignOptions,
} from "jsonwebtoken";

import {
  isValidObjectId,
} from "mongoose";

import { cookies } from "next/headers";

import connectMongoDB from "@/lib/mongodb";
import UserModel from "@/models/User";

/*
 * Tên cookie đăng nhập dùng chung
 * cho toàn bộ hệ thống.
 */
export const AUTH_COOKIE_NAME =
  "hsk-auth-token";

/*
 * Cookie đăng nhập tồn tại 30 ngày.
 */
export const AUTH_COOKIE_MAX_AGE =
  60 * 60 * 24 * 30;

export type AuthUserRole =
  | "user"
  | "admin";

export interface AuthTokenPayload
  extends JwtPayload {
  userId?: string;
  id?: string;
  _id?: string;

  name?: string;
  username?: string;
  email?: string;
  role?: AuthUserRole;

  user?: {
    userId?: string;
    id?: string;
    _id?: string;

    name?: string;
    username?: string;
    email?: string;
    role?: AuthUserRole;
  };
}

export interface CreateAuthTokenPayload {
  userId: string;
  name?: string;
  username?: string;
  email?: string;
  role?: AuthUserRole;
}

/*
 * Đọc khóa bảo mật JWT.
 */
function getJwtSecret() {
  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "Chưa khai báo JWT_SECRET trong .env.local.",
    );
  }

  return jwtSecret;
}

function getStringValue(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/*
 * Tạo JWT khi đăng nhập thành công.
 */
export function createAuthToken(
  payload: CreateAuthTokenPayload,
  expiresIn: SignOptions["expiresIn"] =
    "30d",
) {
  return jwt.sign(
    {
      userId: payload.userId,
      name: payload.name,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    },
    getJwtSecret(),
    {
      expiresIn,
    },
  );
}

/*
 * Giữ tên hàm cũ để những API trước đó
 * không bị lỗi import.
 */
export const signAuthToken =
  createAuthToken;

/*
 * Kiểm tra và giải mã JWT.
 */
export function verifyAuthToken(
  token: string,
): AuthTokenPayload | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret(),
    );

    if (
      !decoded ||
      typeof decoded === "string"
    ) {
      return null;
    }

    return decoded as AuthTokenPayload;
  } catch {
    return null;
  }
}

/*
 * Lấy JWT từ cookie.
 *
 * Các tên cookie cũ vẫn được hỗ trợ
 * để tránh làm mất phiên đăng nhập cũ.
 */
export async function getAuthToken() {
  const cookieStore =
    await cookies();

  return (
    cookieStore.get(
      AUTH_COOKIE_NAME,
    )?.value ||
    cookieStore.get(
      "auth-token",
    )?.value ||
    cookieStore.get(
      "token",
    )?.value ||
    null
  );
}

/*
 * Lấy toàn bộ dữ liệu trong JWT.
 */
export async function getAuthPayload() {
  const token =
    await getAuthToken();

  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
}

/*
 * Lấy ID người dùng đang đăng nhập.
 *
 * Hỗ trợ token mới:
 * { userId, username, role }
 *
 * Đồng thời hỗ trợ token cũ:
 * { id }
 * { _id }
 * { sub }
 * { email }
 * { user: { userId } }
 */
export async function getAuthenticatedUserId() {
  const payload =
    await getAuthPayload();

  if (!payload) {
    return null;
  }

  const nestedUser =
    payload.user &&
    typeof payload.user === "object"
      ? payload.user
      : undefined;

  const possibleUserIds = [
    payload.userId,
    payload.id,
    payload._id,
    payload.sub,

    nestedUser?.userId,
    nestedUser?.id,
    nestedUser?._id,
  ];

  /*
   * Ưu tiên lấy trực tiếp ObjectId
   * trong token để không phải truy vấn DB.
   */
  for (
    const possibleId of
    possibleUserIds
  ) {
    const userId =
      getStringValue(possibleId);

    if (
      userId &&
      isValidObjectId(userId)
    ) {
      return userId;
    }
  }

  /*
   * Nếu token không có ObjectId,
   * tìm người dùng bằng username.
   */
  const username =
    getStringValue(
      payload.username ||
        nestedUser?.username,
    ).toLowerCase();

  if (username) {
    await connectMongoDB();

    const userByUsername =
      await UserModel.findOne({
        username,

        isActive: {
          $ne: false,
        },

        status: {
          $ne: "blocked",
        },
      })
        .select("_id")
        .lean();

    if (userByUsername?._id) {
      return String(
        userByUsername._id,
      );
    }
  }

  /*
   * Tương thích với token cũ chỉ có email.
   */
  const email =
    getStringValue(
      payload.email ||
        nestedUser?.email,
    ).toLowerCase();

  if (!email) {
    return null;
  }

  await connectMongoDB();

  const userByEmail =
    await UserModel.findOne({
      email,

      isActive: {
        $ne: false,
      },

      status: {
        $ne: "blocked",
      },
    })
      .select("_id")
      .lean();

  if (!userByEmail?._id) {
    return null;
  }

  return String(
    userByEmail._id,
  );
}
export async function isAuthenticatedAdmin() {
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return false;
  }

  await connectMongoDB();

  const user =
    await UserModel.findOne({
      _id: userId,

      role: "admin",

      isActive: {
        $ne: false,
      },

      status: {
        $ne: "blocked",
      },
    })
      .select("_id role status isActive")
      .lean();

  return Boolean(user);
}