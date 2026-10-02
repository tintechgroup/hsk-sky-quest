import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import connectMongoDB from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegisterBody {
  name?: unknown;
  username?: unknown;
  password?: unknown;
}

interface MongoDuplicateError {
  code?: number;

  keyPattern?: Record<
    string,
    number
  >;

  keyValue?: Record<
    string,
    unknown
  >;
}

function normalizeUsername(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

function isDuplicateKeyError(
  error: unknown,
): error is MongoDuplicateError {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code === 11000
  );
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * =====================================
     * ĐỌC BODY
     * =====================================
     */

    let body: RegisterBody;

    try {
      body =
        (await request.json()) as RegisterBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Dữ liệu đăng ký không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : "";

    const username =
      typeof body.username ===
      "string"
        ? normalizeUsername(
            body.username,
          )
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    /*
     * =====================================
     * VALIDATE TÊN HIỂN THỊ
     * =====================================
     */

    if (
      name.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tên người dùng phải có ít nhất 2 ký tự.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      name.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tên người dùng không được quá 100 ký tự.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =====================================
     * VALIDATE USERNAME
     * =====================================
     */

    if (
      username.length < 4
    ) {
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

    if (
      username.length > 30
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tài khoản không được quá 30 ký tự.",
        },
        {
          status: 400,
        },
      );
    }

    const usernamePattern =
      /^[a-z0-9._-]+$/;

    if (
      !usernamePattern.test(
        username,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tài khoản chỉ được chứa chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =====================================
     * VALIDATE PASSWORD
     * =====================================
     */

    if (
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mật khẩu phải có ít nhất 6 ký tự.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length > 72
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Mật khẩu không được quá 72 ký tự.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =====================================
     * KẾT NỐI DATABASE
     * =====================================
     */

    await connectMongoDB();

    /*
     * =====================================
     * KIỂM TRA USERNAME TRÙNG
     * =====================================
     *
     * Chỉ username là tài khoản đăng nhập.
     *
     * name chỉ là tên hiển thị,
     * được phép trùng.
     */

    const existingUser =
      await UserModel.findOne({
        username,
      })
        .select(
          "_id username",
        )
        .lean();

    if (
      existingUser
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tài khoản này đã được sử dụng.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * =====================================
     * HASH PASSWORD
     * =====================================
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    /*
     * =====================================
     * TẠO USER
     * =====================================
     *
     * Không truyền email: ""
     * Không truyền phone: ""
     *
     * Điều này tránh một số trường hợp
     * unique index của email/phone
     * bị trùng chuỗi rỗng.
     */

    const createdUser =
      await UserModel.create({
        name,

        username,

        passwordHash,

        role:
          "user",

        status:
          "active",

        isActive:
          true,

        gamesPlayed:
          0,

        wins:
          0,

        losses:
          0,

        draws:
          0,

        totalScore:
          0,

        lastLoginAt:
          null,
      });

    /*
     * =====================================
     * SUCCESS
     * =====================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Đăng ký tài khoản thành công. Bạn có thể đăng nhập ngay.",

        user: {
          id:
            createdUser._id.toString(),

          name:
            createdUser.name,

          username:
            createdUser.username,

          role:
            createdUser.role,
        },
      },
      {
        status: 201,
      },
    );
  } catch (
    error: unknown
  ) {
    console.error(
      "POST /api/auth/register:",
      error,
    );

    /*
     * =====================================
     * DUPLICATE KEY
     * =====================================
     */

    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      const duplicateField =
        Object.keys(
          error.keyPattern ??
            error.keyValue ??
            {},
        )[0];

      /*
       * Username trùng thật.
       */
      if (
        duplicateField ===
        "username"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Tài khoản này đã được sử dụng.",
          },
          {
            status: 409,
          },
        );
      }

      /*
       * Nếu email có unique index
       * nhưng nhiều user không có email.
       */
      if (
        duplicateField ===
        "email"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Không thể tạo tài khoản vì chỉ mục email đang bị trùng. Cần kiểm tra cấu hình trường email trong User model.",
          },
          {
            status: 409,
          },
        );
      }

      /*
       * Nếu phone có unique index
       * nhưng nhiều user không có phone.
       */
      if (
        duplicateField ===
        "phone"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Không thể tạo tài khoản vì chỉ mục số điện thoại đang bị trùng. Cần kiểm tra cấu hình trường phone trong User model.",
          },
          {
            status: 409,
          },
        );
      }

      /*
       * Một field unique khác.
       */
      return NextResponse.json(
        {
          success: false,

          message:
            duplicateField
              ? `Dữ liệu bị trùng ở trường "${duplicateField}".`
              : "Có dữ liệu unique bị trùng trong tài khoản.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * =====================================
     * SERVER ERROR
     * =====================================
     */

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể đăng ký tài khoản. Vui lòng thử lại.",
      },
      {
        status: 500,
      },
    );
  }
}