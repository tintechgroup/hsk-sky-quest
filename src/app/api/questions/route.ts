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

/**
 * Kiểm tra tài khoản hiện tại có quyền admin hay không.
 *
 * Luồng:
 * Cookie -> JWT -> userId -> MongoDB -> role === "admin"
 *
 * Cách này lấy quyền mới nhất từ database,
 * không phụ thuộc hoàn toàn vào role trong JWT.
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
        .select(
          "_id role status isActive",
        )
        .lean();

    return Boolean(user);
  } catch (error) {
    console.error(
      "Kiểm tra quyền admin:",
      error,
    );

    return false;
  }
}

/**
 * Chuẩn hóa chuỗi.
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
 * GET /api/questions
 *
 * Public:
 * GET /api/questions
 *
 * Lọc tỉnh:
 * GET /api/questions?region=REGION_ID
 *
 * Lọc HSK:
 * GET /api/questions?level=3
 *
 * Admin:
 * GET /api/questions?scope=admin
 *
 * Tương thích frontend cũ:
 * GET /api/questions?includeInactive=true
 */
export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const scope =
      searchParams.get("scope");

    const includeInactive =
      searchParams.get(
        "includeInactive",
      );

    const regionId =
      searchParams
        .get("region")
        ?.trim() ?? "";

    const levelParam =
      searchParams
        .get("level")
        ?.trim() ?? "";

    const adminScope =
      scope === "admin" ||
      includeInactive === "true";

    /**
     * Nếu yêu cầu dữ liệu admin
     * thì phải có quyền admin.
     */
    if (
      adminScope &&
      !(await isAdmin())
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền quản trị câu hỏi.",
        },
        {
          status: 403,
        },
      );
    }

    const filter: {
      isActive?: boolean;
      region?: mongoose.Types.ObjectId;
      level?: HSKLevel;
    } = {};

    /**
     * Người chơi bình thường
     * chỉ được lấy câu hỏi active.
     */
    if (!adminScope) {
      filter.isActive = true;
    }

    /**
     * Lọc theo region.
     */
    if (regionId) {
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

      filter.region =
        new mongoose.Types.ObjectId(
          regionId,
        );
    }

    /**
     * Lọc theo HSK level.
     */
    if (levelParam) {
      const level =
        Number(levelParam);

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

      filter.level = level;
    }

    await connectMongoDB();

    /**
     * Đảm bảo Region model
     * được đăng ký trước populate.
     */
    void RegionModel;

    const questions =
      await QuestionModel.find(
        filter,
      )
        .populate({
          path: "region",

          select:
            "name chineseName pinyin slug color isActive",
        })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .lean();

    return NextResponse.json(
      {
        success: true,

        data: questions,

        total:
          questions.length,
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
      "GET /api/questions:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách câu hỏi.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * POST /api/questions
 *
 * Admin tạo câu hỏi mới.
 */
export async function POST(
  request: Request,
) {
  try {
    /**
     * Kiểm tra admin.
     */
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền thêm câu hỏi.",
        },
        {
          status: 403,
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
            "Dữ liệu JSON gửi lên không hợp lệ.",
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
            "Dữ liệu gửi lên không hợp lệ.",
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

    const regionId =
      getText(data.region) ||
      getText(
        data.regionId,
      );

    const level =
      Number(data.level);

    const topic =
      getText(data.topic);

    const question =
      getText(
        data.question,
      );

    const pinyin =
      getText(data.pinyin);

    const hint =
      getText(data.hint);

    const explanation =
      getText(
        data.explanation,
      );

    const correctIndex =
      Number(
        data.correctIndex,
      );

    const options =
      Array.isArray(
        data.options,
      )
        ? data.options.map(
            (option) =>
              getText(option),
          )
        : [];

    /**
     * Validate region.
     */
    if (!regionId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng chọn tỉnh/thành cho câu hỏi.",
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

    /**
     * Validate HSK.
     */
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

    /**
     * Validate topic.
     */
    if (!topic) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập chủ đề câu hỏi.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validate question.
     */
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

    /**
     * Validate explanation.
     */
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

    /**
     * Phải có đúng 4 đáp án.
     */
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

    /**
     * correctIndex:
     *
     * 0 = A
     * 1 = B
     * 2 = C
     * 3 = D
     */
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

    await connectMongoDB();

    /**
     * Kiểm tra region tồn tại
     * và đang active.
     */
    const region =
      await RegionModel.findOne(
        {
          _id: regionId,

          isActive: true,
        },
      )
        .select(
          "_id name chineseName pinyin slug",
        )
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

    /**
     * Tạo câu hỏi.
     */
    const createdQuestion =
      await QuestionModel.create(
        {
          region:
            region._id,

          level,

          topic,

          question,

          pinyin,

          options,

          correctIndex,

          hint,

          explanation,

          isActive:
            data.isActive !==
            false,
        },
      );

    /**
     * Populate region.
     */
    const populatedQuestion =
      await QuestionModel.findById(
        createdQuestion._id,
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
          "Đã thêm câu hỏi vào MongoDB.",

        data:
          populatedQuestion,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/questions:",
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
          "Không thể thêm câu hỏi.",
      },
      {
        status: 500,
      },
    );
  }
}