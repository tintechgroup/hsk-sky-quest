import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import connectMongoDB from "@/lib/mongodb";
import ErrorLogModel from "@/models/ErrorLog";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenPayload {
  userId?: string;
  id?: string;
  sub?: string;
  email?: string;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/*
 * Lấy ID người dùng từ cookie đăng nhập.
 */
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    "hsk-auth-token",
  )?.value;

  if (!token) {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "Chưa khai báo JWT_SECRET.",
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      jwtSecret,
    );

    if (
      !decoded ||
      typeof decoded === "string"
    ) {
      return null;
    }

    const payload =
      decoded as TokenPayload;

    const userId =
      payload.userId ??
      payload.id ??
      payload.sub;

    /*
     * Trường hợp token đã chứa ID tài khoản.
     */
    if (
      userId &&
      isValidObjectId(userId)
    ) {
      return userId;
    }

    /*
     * Hỗ trợ token cũ chỉ chứa email.
     */
    if (payload.email) {
      await connectMongoDB();

      const user = await UserModel.findOne({
        email: payload.email
          .trim()
          .toLowerCase(),
      })
        .select("_id")
        .lean();

      if (user?._id) {
        return String(user._id);
      }
    }

    return null;
  } catch (error) {
    console.error(
      "Không thể xác thực người dùng:",
      error,
    );

    return null;
  }
}

/*
 * PATCH /api/error-logs/:id
 *
 * Body:
 * {
 *   "reviewed": true
 * }
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn cần đăng nhập để cập nhật câu sai.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã Error Log không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    if (
      typeof body.reviewed !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trạng thái reviewed không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    /*
     * Phải kiểm tra cả _id và user để không
     * cập nhật Error Log của tài khoản khác.
     */
    const updatedErrorLog =
      await ErrorLogModel.findOneAndUpdate(
        {
          _id: id,
          user: userId,
        },
        {
          $set: {
            reviewed: body.reviewed,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
        .populate(
          "region",
          "name chineseName pinyin",
        )
        .populate(
          "question",
          "question options correctIndex",
        )
        .lean();

    if (!updatedErrorLog) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy câu sai hoặc bạn không có quyền cập nhật.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: body.reviewed
        ? "Đã đánh dấu câu hỏi là đã ôn tập."
        : "Đã chuyển câu hỏi về trạng thái chưa ôn tập.",
      data: updatedErrorLog,
    });
  } catch (error) {
    console.error(
      "PATCH /api/error-logs/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể cập nhật trạng thái câu sai.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * DELETE /api/error-logs/:id
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn cần đăng nhập để xóa câu sai.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã Error Log không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    /*
     * Chỉ xóa khi Error Log thuộc tài khoản
     * đang đăng nhập.
     */
    const deletedErrorLog =
      await ErrorLogModel.findOneAndDelete({
        _id: id,
        user: userId,
      }).lean();

    if (!deletedErrorLog) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy câu sai hoặc bạn không có quyền xóa.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Đã xóa câu hỏi khỏi Error Log.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/error-logs/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể xóa câu hỏi khỏi Error Log.",
      },
      {
        status: 500,
      },
    );
  }
}