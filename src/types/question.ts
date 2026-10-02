import type {
  HSKLevel,
} from "@/types/game";

/*
 * Thông tin tỉnh/thành được populate
 * kèm theo câu hỏi.
 */
export interface QuestionRegion {
  id: string;
  name: string;
  chineseName?: string;
  pinyin?: string;
}

/*
 * Câu hỏi được sử dụng trong trận đấu.
 */
export interface GameQuestion {
  id: string;

  /*
   * regionId có thể không xuất hiện trong
   * dữ liệu trận cũ nên để optional.
   */
  regionId?: string;

  level: HSKLevel;
  topic: string;

  question: string;
  pinyin?: string;

  options: string[];
  correctIndex: number;

  hint: string;
  explanation: string;
}

/*
 * Câu hỏi đầy đủ dùng trong trang Admin.
 */
export interface AdminQuestion
  extends GameQuestion {
  /*
   * MongoDB có thể trả về _id trước khi
   * dữ liệu được chuẩn hóa thành id.
   */
  _id?: string;

  region:
    | string
    | QuestionRegion;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

/*
 * Dữ liệu form thêm hoặc sửa câu hỏi.
 */
export interface QuestionFormData {
  regionId: string;
  level: HSKLevel;
  topic: string;

  question: string;
  pinyin: string;

  options: [
    string,
    string,
    string,
    string,
  ];

  correctIndex: number;

  hint: string;
  explanation: string;

  isActive: boolean;
}

/*
 * Kiểu dữ liệu thô MongoDB/API có thể trả về.
 * Hàm chuẩn hóa sẽ chuyển kiểu này thành
 * GameQuestion hoặc AdminQuestion.
 */
export interface RawQuestionData {
  _id?: unknown;
  id?: unknown;

  region?: unknown;
  regionId?: unknown;

  level?: unknown;
  topic?: unknown;

  question?: unknown;
  pinyin?: unknown;

  options?: unknown;
  correctIndex?: unknown;

  hint?: unknown;
  explanation?: unknown;

  isActive?: unknown;

  createdAt?: unknown;
  updatedAt?: unknown;
}

/*
 * Response lấy danh sách câu hỏi.
 */
export interface QuestionsApiResponse {
  success: boolean;
  data?: AdminQuestion[];
  total?: number;
  message?: string;
}

/*
 * Response thêm, sửa hoặc lấy một câu hỏi.
 */
export interface QuestionApiResponse {
  success: boolean;
  data?: AdminQuestion;
  message?: string;
}

/*
 * Dữ liệu câu hỏi trong một trận ghép đội.
 */
export interface MatchQuestion
  extends GameQuestion {
  matchId?: string;
  order?: number;
}

/*
 * Các alias giúp những component cũ vẫn
 * hoạt động nếu đang import QuestionItem
 * hoặc QuestionData.
 */
export type QuestionItem =
  AdminQuestion;

export type QuestionData =
  AdminQuestion;

/*
 * Chuẩn hóa giá trị trình độ HSK.
 */
export function normalizeHSKLevel(
  value: unknown,
): HSKLevel {
  const level = Number(value);

  if (
    level === 3 ||
    level === 4 ||
    level === 5 ||
    level === 6
  ) {
    return level;
  }

  return 3;
}

/*
 * Chuẩn hóa region từ MongoDB/API.
 */
export function normalizeQuestionRegion(
  value: unknown,
): QuestionRegion | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const region = value as {
    _id?: unknown;
    id?: unknown;
    name?: unknown;
    chineseName?: unknown;
    pinyin?: unknown;
  };

  const id = String(
    region.id ??
      region._id ??
      "",
  );

  const name =
    typeof region.name === "string"
      ? region.name.trim()
      : "";

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,

    chineseName:
      typeof region.chineseName ===
      "string"
        ? region.chineseName.trim()
        : "",

    pinyin:
      typeof region.pinyin === "string"
        ? region.pinyin.trim()
        : "",
  };
}

/*
 * Chuẩn hóa câu hỏi để đưa vào trận đấu.
 */
export function normalizeGameQuestion(
  rawData: RawQuestionData,
): GameQuestion | null {
  const id = String(
    rawData.id ??
      rawData._id ??
      "",
  );

  const question =
    typeof rawData.question === "string"
      ? rawData.question.trim()
      : "";

  const topic =
    typeof rawData.topic === "string"
      ? rawData.topic.trim()
      : "";

  const rawOptions =
    Array.isArray(rawData.options)
      ? rawData.options
      : [];

  const options = rawOptions.map(
    (option) =>
      typeof option === "string"
        ? option.trim()
        : "",
  );

  const correctIndex = Number(
    rawData.correctIndex,
  );

  if (
    !id ||
    !question ||
    options.length < 2 ||
    options.some(
      (option) => !option,
    ) ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return null;
  }

  let regionId = "";

  if (
    typeof rawData.regionId ===
    "string"
  ) {
    regionId =
      rawData.regionId.trim();
  } else if (
    typeof rawData.region ===
    "string"
  ) {
    regionId =
      rawData.region.trim();
  } else {
    const normalizedRegion =
      normalizeQuestionRegion(
        rawData.region,
      );

    regionId =
      normalizedRegion?.id ?? "";
  }

  return {
    id,
    regionId:
      regionId || undefined,

    level:
      normalizeHSKLevel(
        rawData.level,
      ),

    topic:
      topic ||
      "Kiến thức tổng hợp",

    question,

    pinyin:
      typeof rawData.pinyin ===
      "string"
        ? rawData.pinyin.trim()
        : "",

    options,
    correctIndex,

    hint:
      typeof rawData.hint ===
        "string" &&
      rawData.hint.trim()
        ? rawData.hint.trim()
        : "Hãy đọc kỹ câu hỏi và loại trừ các đáp án không phù hợp.",

    explanation:
      typeof rawData.explanation ===
        "string" &&
      rawData.explanation.trim()
        ? rawData.explanation.trim()
        : "Hãy xem lại đáp án chính xác của câu hỏi.",
  };
}

/*
 * Chuẩn hóa một mảng câu hỏi.
 * Những câu không hợp lệ sẽ tự bị loại bỏ.
 */
export function normalizeGameQuestions(
  rawData: unknown,
): GameQuestion[] {
  if (!Array.isArray(rawData)) {
    return [];
  }

  return rawData
    .map((item) =>
      normalizeGameQuestion(
        item as RawQuestionData,
      ),
    )
    .filter(
      (
        question,
      ): question is GameQuestion =>
        question !== null,
    );
}