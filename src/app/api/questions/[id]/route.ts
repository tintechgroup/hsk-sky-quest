import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectMongoDB from "@/lib/mongodb";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import QuestionModel from "@/models/Question";
import RegionModel from "@/models/Region";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_LEVELS = [3, 4, 5, 6] as const;

type HSKLevel =
  (typeof VALID_LEVELS)[number];

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Kiểm tra quyền admin trực tiếp từ MongoDB.
 */
async function isAdmin() {
  try {
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
          $nin: [
            "blocked",
            "inactive",
          ],
        },
      })
        .select("_id role")
        .lean();

    return Boolean(user);
  } catch (error) {
    console.error(
      "Question admin check:",
      error,
    );

    return false;
  }
}

/**
 * Chuẩn hóa string.
 */
function getText(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Kiểm tra HSK level.
 */
function isValidLevel(
  value: number,
): value is HSKLevel {
  return VALID_LEVELS.includes(
    value as HSKLevel,
  );
}

/**
 * GET /api/questions/[id]
 *
 * Lấy chi tiết một câu hỏi.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã câu hỏi không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    void RegionModel;

    const question =
      await QuestionModel.findById(
        id,
      )
        .populate({
          path: "region",

          select:
            "name chineseName pinyin slug color isActive",
        })
        .lean();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy câu hỏi.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: question,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/questions/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể tải câu hỏi.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * Hàm dùng chung cho PUT và PATCH.
 */
async function updateQuestion(
  request: Request,
  context: RouteContext,
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền cập nhật câu hỏi.",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã câu hỏi không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu JSON không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Dữ liệu cập nhật không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    const data =
      body as Record<
        string,
        unknown
      >;

    await connectMongoDB();

    const existingQuestion =
      await QuestionModel.findById(
        id,
      );

    if (!existingQuestion) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy câu hỏi.",
        },
        {
          status: 404,
        },
      );
    }

    const updateData: Record<
      string,
      unknown
    > = {};

    /**
     * Cập nhật trạng thái riêng.
     *
     * Đây là phần nút Ẩn/Bật sử dụng.
     */
    if (
      typeof data.isActive ===
      "boolean"
    ) {
      updateData.isActive =
        data.isActive;
    }

    /**
     * Region
     */
    const regionId =
      getText(data.region) ||
      getText(
        data.regionId,
      );

    if (
      data.region !==
        undefined ||
      data.regionId !==
        undefined
    ) {
      if (!regionId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vui lòng chọn tỉnh/thành.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          regionId,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Mã tỉnh/thành không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      const region =
        await RegionModel.findOne({
          _id: regionId,
          isActive: true,
        })
          .select("_id")
          .lean();

      if (!region) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tỉnh/thành không tồn tại hoặc đã bị ẩn.",
          },
          {
            status: 404,
          },
        );
      }

      updateData.region =
        region._id;
    }

    /**
     * HSK level
     */
    if (
      data.level !== undefined
    ) {
      const level =
        Number(data.level);

      if (
        !isValidLevel(level)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cấp độ HSK phải là 3, 4, 5 hoặc 6.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.level =
        level;
    }

    /**
     * Chủ đề
     */
    if (
      data.topic !== undefined
    ) {
      const topic =
        getText(data.topic);

      if (!topic) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vui lòng nhập chủ đề.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.topic =
        topic;
    }

    /**
     * Câu hỏi
     */
    if (
      data.question !==
      undefined
    ) {
      const question =
        getText(
          data.question,
        );

      if (!question) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vui lòng nhập nội dung câu hỏi.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.question =
        question;
    }

    /**
     * Pinyin
     */
    if (
      data.pinyin !== undefined
    ) {
      updateData.pinyin =
        getText(
          data.pinyin,
        );
    }

    /**
     * Hint
     */
    if (
      data.hint !== undefined
    ) {
      updateData.hint =
        getText(data.hint);
    }

    /**
     * Explanation
     */
    if (
      data.explanation !==
      undefined
    ) {
      const explanation =
        getText(
          data.explanation,
        );

      if (!explanation) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vui lòng nhập phần giải thích.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.explanation =
        explanation;
    }

    /**
     * Options
     */
    if (
      data.options !==
      undefined
    ) {
      if (
        !Array.isArray(
          data.options,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Danh sách đáp án không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      const options =
        data.options.map(
          (option) =>
            getText(option),
        );

      if (
        options.length !== 4 ||
        options.some(
          (option) =>
            !option,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Câu hỏi phải có đầy đủ 4 đáp án.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.options =
        options;
    }

    /**
     * Đáp án đúng.
     */
    if (
      data.correctIndex !==
      undefined
    ) {
      const correctIndex =
        Number(
          data.correctIndex,
        );

      if (
        !Number.isInteger(
          correctIndex,
        ) ||
        correctIndex < 0 ||
        correctIndex > 3
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Đáp án đúng không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.correctIndex =
        correctIndex;
    }

    /**
     * Không có trường nào để update.
     */
    if (
      Object.keys(
        updateData,
      ).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không có dữ liệu nào cần cập nhật.",
        },
        {
          status: 400,
        },
      );
    }

    const updatedQuestion =
      await QuestionModel.findByIdAndUpdate(
        id,

        {
          $set:
            updateData,
        },

        {
          new: true,
          runValidators: true,
        },
      )
        .populate({
          path: "region",

          select:
            "name chineseName pinyin slug color isActive",
        })
        .lean();

    return NextResponse.json(
      {
        success: true,

        message:
          "Đã cập nhật câu hỏi.",

        data:
          updatedQuestion,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "UPDATE /api/questions/[id]:",
      error,
    );

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Dữ liệu câu hỏi không hợp lệ.",

          error:
            error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể cập nhật câu hỏi.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * PUT
 */
export async function PUT(
  request: Request,
  context: RouteContext,
) {
  return updateQuestion(
    request,
    context,
  );
}

/**
 * PATCH
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  return updateQuestion(
    request,
    context,
  );
}

/**
 * DELETE /api/questions/[id]
 *
 * Xóa vĩnh viễn câu hỏi.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có quyền xóa câu hỏi.",
        },
        {
          status: 403,
        },
      );
    }

    const { id } =
      await context.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã câu hỏi không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const question =
      await QuestionModel.findByIdAndDelete(
        id,
      );

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy câu hỏi.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Đã xóa câu hỏi thành công.",

        data: {
          id,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "DELETE /api/questions/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Không thể xóa câu hỏi.",
      },
      {
        status: 500,
      },
    );
  }
}