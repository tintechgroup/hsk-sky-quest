import type {
  HSKLevel,
} from "@/types/game";

import type {
  GameQuestion,
  QuestionItem,
  QuestionsApiResponse,
} from "@/types/question";

/*
 * ========================================
 * STRING NORMALIZER
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
 * NUMBER NORMALIZER
 * ========================================
 */
function getNumber(
  value: unknown,
  fallback = 0,
): number {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : fallback;
}

/*
 * ========================================
 * REGION ID
 * ========================================
 *
 * API có thể trả region:
 *
 * 1. ObjectId dạng string
 *
 * hoặc
 *
 * 2. Object đã populate:
 *
 * {
 *   _id: "...",
 *   name: "...",
 * }
 */
function getRegionId(
  region: QuestionItem["region"],
): string {
  if (!region) {
    return "";
  }

  if (
    typeof region ===
    "string"
  ) {
    return region.trim();
  }

  if (
    typeof region ===
      "object" &&
    "_id" in region
  ) {
    return getText(
      region._id,
    );
  }

  return "";
}

/*
 * ========================================
 * HSK LEVEL
 * ========================================
 */
function isHSKLevel(
  value: unknown,
): value is HSKLevel {
  return (
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6
  );
}

/*
 * ========================================
 * OPTIONS
 * ========================================
 */
function getOptions(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.map(
    (
      option,
    ) =>
      getText(
        option,
      ),
  );
}

/*
 * ========================================
 * MAP API QUESTION -> GAME QUESTION
 * ========================================
 */
function mapQuestion(
  item: QuestionItem,
): GameQuestion {
  /*
   * level theo schema chỉ hợp lệ:
   *
   * 3 | 4 | 5 | 6
   *
   * Nếu API trả sai dữ liệu thì đặt 3 tạm thời,
   * sau đó validation sẽ kiểm tra tiếp.
   */
  const level:
    HSKLevel =
      isHSKLevel(
        item.level,
      )
        ? item.level
        : 3;

  return {
    id:
      getText(
        item._id,
      ),

    regionId:
      getRegionId(
        item.region,
      ),

    level,

    topic:
      getText(
        item.topic,
      ),

    question:
      getText(
        item.question,
      ),

    pinyin:
      getText(
        item.pinyin,
      ),

    options:
      getOptions(
        item.options,
      ),

    correctIndex:
      getNumber(
        item.correctIndex,
        -1,
      ),

    hint:
      getText(
        item.hint,
      ),

    explanation:
      getText(
        item.explanation,
      ),
  };
}

/*
 * ========================================
 * SHUFFLE QUESTIONS
 * ========================================
 *
 * Fisher-Yates shuffle.
 *
 * Không mutate mảng câu hỏi gốc.
 */
function shuffleQuestions(
  questions: GameQuestion[],
): GameQuestion[] {
  const result = [
    ...questions,
  ];

  for (
    let index =
      result.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (
            index +
            1
          ),
      );

    const temporary =
      result[index];

    result[index] =
      result[
        randomIndex
      ];

    result[
      randomIndex
    ] =
      temporary;
  }

  return result;
}

/*
 * ========================================
 * VALIDATE QUESTION
 * ========================================
 */
function isValidQuestion(
  question: GameQuestion,
): boolean {
  if (
    !question.id
  ) {
    return false;
  }

  if (
    !question.regionId
  ) {
    return false;
  }

  if (
    !isHSKLevel(
      question.level,
    )
  ) {
    return false;
  }

  if (
    !question.topic
  ) {
    return false;
  }

  if (
    !question.question
  ) {
    return false;
  }

  if (
    !question.explanation
  ) {
    return false;
  }

  if (
    !Array.isArray(
      question.options,
    )
  ) {
    return false;
  }

  if (
    question.options.length !==
    4
  ) {
    return false;
  }

  if (
    !question.options.every(
      (
        option,
      ) =>
        Boolean(
          option.trim(),
        ),
    )
  ) {
    return false;
  }

  if (
    !Number.isInteger(
      question.correctIndex,
    )
  ) {
    return false;
  }

  if (
    question.correctIndex <
      0 ||
    question.correctIndex >
      3
  ) {
    return false;
  }

  return true;
}

/*
 * ========================================
 * GET BATTLE QUESTIONS
 * ========================================
 *
 * Lấy câu hỏi theo:
 *
 * - tỉnh/thành
 * - cấp độ HSK
 *
 * Sau đó:
 *
 * 1. Chuẩn hóa dữ liệu
 * 2. Validate
 * 3. Loại câu không hợp lệ
 * 4. Trộn ngẫu nhiên
 * 5. Giới hạn số lượng
 */
export async function getBattleQuestions(
  regionId: string,
  level: HSKLevel,
  limit = 3,
): Promise<GameQuestion[]> {
  const normalizedRegionId =
    regionId.trim();

  if (
    !normalizedRegionId
  ) {
    throw new Error(
      "Không xác định được tỉnh/thành.",
    );
  }

  /*
   * Đảm bảo level hợp lệ.
   */
  if (
    !isHSKLevel(
      level,
    )
  ) {
    throw new Error(
      "Cấp độ HSK không hợp lệ.",
    );
  }

  /*
   * Chuẩn hóa limit.
   */
  const numericLimit =
    Number.isFinite(
      limit,
    )
      ? Math.floor(
          limit,
        )
      : 3;

  const safeLimit =
    Math.max(
      1,
      numericLimit,
    );

  /*
   * Query API.
   */
  const searchParams =
    new URLSearchParams({
      region:
        normalizedRegionId,

      level:
        String(
          level,
        ),
    });

  const response =
    await fetch(
      `/api/questions?${searchParams.toString()}`,
      {
        method:
          "GET",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  /*
   * Parse JSON an toàn.
   */
  let result:
    QuestionsApiResponse;

  try {
    result =
      (await response.json()) as
        QuestionsApiResponse;
  } catch {
    throw new Error(
      "Máy chủ trả về dữ liệu câu hỏi không hợp lệ.",
    );
  }

  /*
   * API error.
   */
  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
        "Không thể tải câu hỏi từ MongoDB.",
    );
  }

  /*
   * Đảm bảo data luôn là array.
   */
  const rawQuestions =
    Array.isArray(
      result.data,
    )
      ? result.data
      : [];

  /*
   * Chuẩn hóa + validate.
   */
  const questions =
    rawQuestions
      .map(
        mapQuestion,
      )
      .filter(
        isValidQuestion,
      );

  /*
   * Shuffle + limit.
   */
  return shuffleQuestions(
    questions,
  ).slice(
    0,
    safeLimit,
  );
}