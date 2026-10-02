import { NextResponse } from "next/server";
import mongoose from "mongoose";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import ErrorLogModel from "@/models/ErrorLog";
import QuestionModel from "@/models/Question";
import RegionModel from "@/models/Region";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ========================================
 * HSK LEVEL
 * ========================================
 */
const VALID_LEVELS = [
  3,
  4,
  5,
  6,
] as const;

type HSKLevel =
  (typeof VALID_LEVELS)[number];

/*
 * ========================================
 * TEXT HELPER
 * ========================================
 */
function getText(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

/*
 * ========================================
 * LEVEL HELPER
 * ========================================
 */
function isHSKLevel(
  value: number,
): value is HSKLevel {
  return VALID_LEVELS.includes(
    value as HSKLevel,
  );
}

/*
 * ========================================
 * OBJECT ID
 * ========================================
 */
function toObjectId(
  value: string,
): mongoose.Types.ObjectId | null {
  if (
    !mongoose.Types.ObjectId.isValid(
      value,
    )
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    value,
  );
}

/*
 * ========================================
 * DUPLICATE KEY
 * ========================================
 */
function isDuplicateKeyError(
  error: unknown,
): boolean {
  return Boolean(
    error &&
      typeof error ===
        "object" &&
      "code" in error &&
      error.code ===
        11000,
  );
}

/*
 * ========================================
 * GET /api/error-logs
 * ========================================
 *
 * Lấy danh sách câu sai của user.
 *
 * Hỗ trợ:
 *
 * ?reviewed=true
 * ?reviewed=false
 * ?level=3
 * ?reviewed=false&level=3
 */
export async function GET(
  request: Request,
) {
  try {
    /*
     * ========================================
     * AUTH
     * ========================================
     */
    const userId =
      await getAuthenticatedUserId();

    if (
      !userId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn cần đăng nhập để xem câu sai.",
        },
        {
          status: 401,
        },
      );
    }

    const userObjectId =
      toObjectId(
        userId,
      );

    if (
      !userObjectId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Phiên đăng nhập không hợp lệ.",
        },
        {
          status: 401,
        },
      );
    }

    await connectMongoDB();

    /*
     * ========================================
     * QUERY PARAMS
     * ========================================
     */
    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const reviewedParam =
      searchParams.get(
        "reviewed",
      );

    const levelParam =
      searchParams.get(
        "level",
      );

    /*
     * Quan trọng:
     *
     * level phải là HSKLevel,
     * KHÔNG phải number.
     *
     * Model ErrorLog chỉ nhận:
     *
     * 3 | 4 | 5 | 6
     */
    const filter: {
      user:
        mongoose.Types.ObjectId;

      reviewed?:
        boolean;

      level?:
        HSKLevel;
    } = {
      user:
        userObjectId,
    };

    /*
     * ========================================
     * REVIEWED FILTER
     * ========================================
     */
    if (
      reviewedParam ===
        "true" ||
      reviewedParam ===
        "false"
    ) {
      filter.reviewed =
        reviewedParam ===
        "true";
    }

    /*
     * ========================================
     * LEVEL FILTER
     * ========================================
     */
    if (
      levelParam
    ) {
      const parsedLevel =
        Number(
          levelParam,
        );

      if (
        !Number.isInteger(
          parsedLevel,
        ) ||
        !isHSKLevel(
          parsedLevel,
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Cấp độ HSK không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Tại đây TypeScript biết chắc:
       *
       * parsedLevel = 3 | 4 | 5 | 6
       */
      filter.level =
        parsedLevel;
    }

    /*
     * Đăng ký các model trước populate.
     */
    void RegionModel;
    void QuestionModel;

    /*
     * ========================================
     * ERROR LOG LIST
     * ========================================
     */
    const errorLogs =
      await ErrorLogModel.find(
        filter,
      )
        .populate({
          path:
            "region",

          select:
            "name chineseName pinyin slug color isActive",
        })
        .sort({
          reviewed:
            1,

          wrongCount:
            -1,

          lastWrongAt:
            -1,
        })
        .limit(
          200,
        )
        .lean();

    /*
     * ========================================
     * TOTAL
     * ========================================
     */
    const total =
      await ErrorLogModel.countDocuments(
        filter,
      );

    /*
     * ========================================
     * NOT REVIEWED
     * ========================================
     */
    const notReviewed =
      await ErrorLogModel.countDocuments(
        {
          user:
            userObjectId,

          reviewed:
            false,
        },
      );

    return NextResponse.json(
      {
        success: true,

        data:
          errorLogs,

        total,

        notReviewed,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    console.error(
      "GET /api/error-logs:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách câu sai.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ========================================
 * POST /api/error-logs
 * ========================================
 *
 * Body:
 *
 * {
 *   questionId: "...",
 *   selectedIndex: 1
 * }
 *
 * Nếu hết thời gian:
 *
 * {
 *   questionId: "...",
 *   selectedIndex: null
 * }
 */
export async function POST(
  request: Request,
) {
  try {
    /*
     * ========================================
     * AUTH
     * ========================================
     */
    const userId =
      await getAuthenticatedUserId();

    if (
      !userId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn cần đăng nhập để lưu câu sai.",
        },
        {
          status: 401,
        },
      );
    }

    const userObjectId =
      toObjectId(
        userId,
      );

    if (
      !userObjectId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Phiên đăng nhập không hợp lệ.",
        },
        {
          status: 401,
        },
      );
    }

    await connectMongoDB();

    /*
     * ========================================
     * BODY
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
      typeof body !==
        "object" ||
      Array.isArray(
        body,
      )
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

    /*
     * ========================================
     * QUESTION ID
     * ========================================
     */
    const questionId =
      getText(
        data.questionId,
      );

    if (
      !questionId ||
      !mongoose.Types.ObjectId.isValid(
        questionId,
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

    const questionObjectId =
      new mongoose.Types.ObjectId(
        questionId,
      );

    /*
     * ========================================
     * SELECTED INDEX
     * ========================================
     *
     * null = hết thời gian.
     */
    const selectedIndex =
      data.selectedIndex ===
      null
        ? null
        : Number(
            data.selectedIndex,
          );

    if (
      selectedIndex !==
        null &&
      (
        !Number.isInteger(
          selectedIndex,
        ) ||
        selectedIndex <
          0 ||
        selectedIndex >
          3
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Đáp án đã chọn không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ========================================
     * LOAD QUESTION
     * ========================================
     *
     * Luôn đọc dữ liệu thật từ MongoDB.
     *
     * Không tin:
     *
     * - correctIndex client gửi
     * - answer client gửi
     * - level client gửi
     * - topic client gửi
     */
    const question =
      await QuestionModel.findById(
        questionObjectId,
      ).lean();

    if (
      !question
    ) {
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

    if (
      !question.region
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Câu hỏi chưa được gắn tỉnh/thành.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ========================================
     * CORRECT ANSWER CHECK
     * ========================================
     *
     * Câu trả lời đúng không được đưa
     * vào ErrorLog.
     */
    if (
      selectedIndex ===
      question.correctIndex
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Đáp án chính xác không được lưu vào Error Log.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ========================================
     * ANSWER TEXT
     * ========================================
     */
    const selectedAnswer =
      selectedIndex ===
      null
        ? "Không trả lời – hết thời gian"
        : getText(
            question.options[
              selectedIndex
            ],
          );

    const correctAnswer =
      getText(
        question.options[
          question.correctIndex
        ],
      );

    if (
      !correctAnswer
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Câu hỏi chưa có đáp án chính xác hợp lệ.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * ========================================
     * QUESTION LEVEL
     * ========================================
     *
     * Model Question hiện cũng sử dụng:
     *
     * 3 | 4 | 5 | 6
     *
     * Tuy nhiên vẫn validate lại để tránh
     * document cũ trong MongoDB có dữ liệu sai.
     */
    const questionLevel =
      Number(
        question.level,
      );

    if (
      !isHSKLevel(
        questionLevel,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Cấp độ HSK của câu hỏi không hợp lệ.",
        },
        {
          status: 500,
        },
      );
    }

    const now =
      new Date();

    /*
     * ========================================
     * UPSERT ERROR LOG
     * ========================================
     *
     * Nếu câu hỏi đã từng sai:
     * tăng wrongCount.
     *
     * Nếu chưa:
     * tạo ErrorLog mới.
     */
    const errorLog =
      await ErrorLogModel.findOneAndUpdate(
        {
          user:
            userObjectId,

          question:
            questionObjectId,
        },
        {
          $set: {
            region:
              question.region,

            level:
              questionLevel,

            topic:
              question.topic,

            questionText:
              question.question,

            pinyin:
              question.pinyin ??
              "",

            selectedAnswer,

            correctAnswer,

            explanation:
              question.explanation,

            reviewed:
              false,

            lastWrongAt:
              now,
          },

          $inc: {
            wrongCount:
              1,
          },
        },
        {
          upsert:
            true,

          new:
            true,

          runValidators:
            true,

          setDefaultsOnInsert:
            true,
        },
      )
        .populate({
          path:
            "region",

          select:
            "name chineseName pinyin slug color isActive",
        })
        .lean();

    return NextResponse.json(
      {
        success: true,

        message:
          "Đã lưu câu sai vào MongoDB.",

        data:
          errorLog,
      },
      {
        status:
          200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/error-logs:",
      error,
    );

    /*
     * Hai request đồng thời có thể cùng
     * cố gắng tạo một ErrorLog.
     */
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Error Log đang được cập nhật. Vui lòng thử lại.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể lưu câu sai.",
      },
      {
        status: 500,
      },
    );
  }
}