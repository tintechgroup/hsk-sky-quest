import { NextResponse } from "next/server";

import connectMongoDB from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ========================================
 * NORMALIZE PHONE
 * ========================================
 */
function normalizePhone(
  value: string,
): string {
  return value.replace(
    /[^\d+]/g,
    "",
  );
}

/*
 * ========================================
 * VALIDATE EMAIL
 * ========================================
 */
function isValidEmail(
  value: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

/*
 * ========================================
 * VALIDATE PHONE
 * ========================================
 */
function isValidPhone(
  value: string,
): boolean {
  return /^\+?\d{9,15}$/.test(
    value,
  );
}

/*
 * ========================================
 * DUPLICATE KEY ERROR
 * ========================================
 */
function isDuplicateKeyError(
  error: unknown,
): boolean {
  if (
    !error ||
    typeof error !==
      "object" ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code ===
    11000
  );
}

/*
 * ========================================
 * GET STRING
 * ========================================
 */
function getString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value
    : "";
}

/*
 * ========================================
 * SERIALIZE USER
 * ========================================
 *
 * Không phụ thuộc trực tiếp vào inferred type
 * của Mongoose document.
 *
 * Điều này tránh lỗi TypeScript:
 *
 * Property '_id' does not exist on type 'never'
 */
function serializeUser(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const user =
    value as Record<
      string,
      unknown
    >;

  return {
    id:
      user._id
        ? String(
            user._id,
          )
        : "",

    name:
      getString(
        user.name,
      ),

    username:
      getString(
        user.username,
      ),

    phone:
      getString(
        user.phone,
      ),

    email:
      getString(
        user.email,
      ),

    role:
      getString(
        user.role,
      ) ||
      "user",

    status:
      getString(
        user.status,
      ) ||
      "active",

    isActive:
      user.isActive !==
      false,

    createdAt:
      user.createdAt
        ? String(
            user.createdAt,
          )
        : null,
  };
}

/*
 * ========================================
 * POST /api/users/register
 * ========================================
 */
export async function POST(
  request: Request,
) {
  try {
    /*
     * ========================================
     * PARSE BODY
     * ========================================
     */
    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Dữ liệu JSON gửi lên không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(
        body,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Dữ liệu gửi lên không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    const data =
      body as Record<
        string,
        unknown
      >;

    /*
     * ========================================
     * NORMALIZE INPUT
     * ========================================
     */
    const name =
      typeof data.name ===
        "string"
        ? data.name.trim()
        : "";

    const phone =
      typeof data.phone ===
        "string"
        ? normalizePhone(
            data.phone,
          )
        : "";

    const email =
      typeof data.email ===
        "string"
        ? data.email
            .trim()
            .toLowerCase()
        : "";

    /*
     * ========================================
     * VALIDATE NAME
     * ========================================
     */
    if (
      name.length <
      2
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Tên phải có ít nhất 2 ký tự.",
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * ========================================
     * VALIDATE PHONE
     * ========================================
     */
    if (
      !isValidPhone(
        phone,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Số điện thoại không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * ========================================
     * VALIDATE EMAIL
     * ========================================
     */
    if (
      !isValidEmail(
        email,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Email không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    await connectMongoDB();

    /*
     * ========================================
     * CHECK DUPLICATE
     * ========================================
     */
    const existingUser =
      await UserModel.findOne({
        $or: [
          {
            email,
          },

          {
            phone,
          },
        ],
      })
        .select(
          "_id email phone",
        )
        .lean();

    if (
      existingUser
    ) {
      const duplicatedField =
        existingUser.email ===
        email
          ? "Email"
          : "Số điện thoại";

      return NextResponse.json(
        {
          success:
            false,

          message:
            `${duplicatedField} đã được sử dụng.`,
        },
        {
          status:
            409,
        },
      );
    }

    /*
     * ========================================
     * CREATE USER
     * ========================================
     *
     * Không còn:
     *
     * emailVerified
     * avatar
     * stats
     *
     * vì không thuộc User schema hiện tại.
     *
     * Player statistics được lưu riêng
     * trong PlayerStats collection.
     */
    const createdUser =
      await UserModel.create({
        name,

        phone,

        email,

        role:
          "user",

        status:
          "active",

        isActive:
          true,

        lastLoginAt:
          null,
      });

    /*
     * ========================================
     * SERIALIZE
     * ========================================
     */
    const rawUser =
      createdUser.toObject() as unknown as Record<
        string,
        unknown
      >;

    const user =
      serializeUser(
        rawUser,
      );

    if (
      !user
    ) {
      throw new Error(
        "Không thể chuẩn hóa tài khoản vừa tạo.",
      );
    }

    /*
     * ========================================
     * RESPONSE
     * ========================================
     */
    return NextResponse.json(
      {
        success:
          true,

        message:
          "Tài khoản đã được tạo thành công.",

        data:
          user,
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/users/register:",
      error,
    );

    /*
     * Mongo duplicate key.
     */
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Email hoặc số điện thoại đã tồn tại.",
        },
        {
          status:
            409,
        },
      );
    }

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Không thể tạo tài khoản lúc này.",
      },
      {
        status:
          500,
      },
    );
  }
}