import {
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import type {
  HydratedDocument,
  Model,
} from "mongoose";

export type QuestionLevel =
  | 3
  | 4
  | 5
  | 6;

export interface QuestionData {
  /*
   * Tỉnh sở hữu câu hỏi.
   *
   * null dùng cho những câu hỏi cũ
   * chưa được gán tỉnh.
   */
  region: Types.ObjectId | null;

  level: QuestionLevel;

  topic: string;
  question: string;
  pinyin: string;

  options: string[];
  correctIndex: number;

  hint: string;
  explanation: string;

  isActive: boolean;
}

export type QuestionDocument =
  HydratedDocument<QuestionData>;

const questionSchema =
  new Schema<QuestionData>(
    {
      /*
       * Liên kết đến collection regions.
       */
      region: {
        type: Schema.Types.ObjectId,
        ref: "Region",
        default: null,
        index: true,
      },

      level: {
        type: Number,
        enum: [3, 4, 5, 6],
        required: [
          true,
          "Trình độ HSK là bắt buộc.",
        ],
        index: true,
      },

      topic: {
        type: String,
        required: [
          true,
          "Chủ đề là bắt buộc.",
        ],
        trim: true,
        maxlength: [
          150,
          "Chủ đề không được vượt quá 150 ký tự.",
        ],
        index: true,
      },

      question: {
        type: String,
        required: [
          true,
          "Nội dung câu hỏi là bắt buộc.",
        ],
        trim: true,
        maxlength: [
          1000,
          "Câu hỏi không được vượt quá 1000 ký tự.",
        ],
      },

      pinyin: {
        type: String,
        default: "",
        trim: true,
        maxlength: [
          1000,
          "Pinyin không được vượt quá 1000 ký tự.",
        ],
      },

      options: {
        type: [String],
        required: [
          true,
          "Danh sách đáp án là bắt buộc.",
        ],

        validate: {
          validator(
            value: string[],
          ) {
            return (
              Array.isArray(value) &&
              value.length === 4 &&
              value.every(
                (option) =>
                  typeof option ===
                    "string" &&
                  option.trim().length > 0,
              )
            );
          },

          message:
            "Câu hỏi phải có đúng 4 đáp án và không được để trống.",
        },
      },

      correctIndex: {
        type: Number,
        required: [
          true,
          "Đáp án đúng là bắt buộc.",
        ],
        min: [
          0,
          "Vị trí đáp án đúng phải từ 0 đến 3.",
        ],
        max: [
          3,
          "Vị trí đáp án đúng phải từ 0 đến 3.",
        ],
      },

      hint: {
        type: String,
        default: "",
        trim: true,
        maxlength: [
          1000,
          "Gợi ý không được vượt quá 1000 ký tự.",
        ],
      },

      explanation: {
        type: String,
        required: [
          true,
          "Phần giải thích là bắt buộc.",
        ],
        trim: true,
        maxlength: [
          3000,
          "Giải thích không được vượt quá 3000 ký tự.",
        ],
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

/*
 * Chuẩn hóa các đáp án trước khi lưu.
 */
questionSchema.pre(
  "validate",
  function () {
    if (Array.isArray(this.options)) {
      this.options = this.options.map(
        (option) =>
          typeof option === "string"
            ? option.trim()
            : "",
      );
    }
  },
);

/*
 * Index dùng khi game lấy câu hỏi theo:
 * tỉnh + HSK + trạng thái.
 */
questionSchema.index({
  region: 1,
  level: 1,
  isActive: 1,
  createdAt: -1,
});

/*
 * Index dùng trong trang Admin.
 */
questionSchema.index({
  isActive: 1,
  updatedAt: -1,
});

/*
 * Index dùng để tìm kiếm theo chủ đề.
 */
questionSchema.index({
  topic: "text",
  question: "text",
});

const QuestionModel: Model<QuestionData> =
  (models.Question as Model<QuestionData>) ||
  model<QuestionData>(
    "Question",
    questionSchema,
  );

export default QuestionModel;