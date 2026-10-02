import {
  model,
  models,
  Schema,
} from "mongoose";

import type {
  HydratedDocument,
  Model,
  Types,
} from "mongoose";

export interface ErrorLogData {
  /*
   * Người chơi trả lời sai.
   */
  user: Types.ObjectId;

  /*
   * Câu hỏi gốc trong MongoDB.
   */
  question: Types.ObjectId;

  /*
   * Tỉnh/thành của câu hỏi.
   */
  region: Types.ObjectId;

  /*
   * Dữ liệu snapshot.
   *
   * Các trường này giúp Error Log vẫn xem
   * được nội dung cũ nếu admin chỉnh sửa
   * câu hỏi sau này.
   */
  level: 3 | 4 | 5 | 6;
  topic: string;
  questionText: string;
  pinyin: string;

  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;

  /*
   * Số lần người dùng làm sai câu này.
   */
  wrongCount: number;

  /*
   * Người dùng đã ôn lại câu sai hay chưa.
   */
  reviewed: boolean;

  /*
   * Lần trả lời sai gần nhất.
   */
  lastWrongAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ErrorLogDocument =
  HydratedDocument<ErrorLogData>;

const errorLogSchema =
  new Schema<ErrorLogData>(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      question: {
        type: Schema.Types.ObjectId,
        ref: "Question",
        required: true,
        index: true,
      },

      region: {
        type: Schema.Types.ObjectId,
        ref: "Region",
        required: true,
        index: true,
      },

      level: {
        type: Number,
        enum: [3, 4, 5, 6],
        required: true,
        index: true,
      },

      topic: {
        type: String,
        required: true,
        trim: true,
      },

      questionText: {
        type: String,
        required: true,
        trim: true,
      },

      pinyin: {
        type: String,
        default: "",
        trim: true,
      },

      selectedAnswer: {
        type: String,
        required: true,
        trim: true,
      },

      correctAnswer: {
        type: String,
        required: true,
        trim: true,
      },

      explanation: {
        type: String,
        required: true,
        trim: true,
      },

      wrongCount: {
        type: Number,
        default: 1,
        min: 1,
      },

      reviewed: {
        type: Boolean,
        default: false,
        index: true,
      },

      lastWrongAt: {
        type: Date,
        default: Date.now,
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

/*
 * Mỗi người dùng chỉ có một Error Log
 * cho mỗi câu hỏi.
 *
 * Nếu làm sai lại, API sẽ tăng wrongCount
 * thay vì tạo thêm bản ghi trùng lặp.
 */
errorLogSchema.index(
  {
    user: 1,
    question: 1,
  },
  {
    unique: true,
  },
);

/*
 * Tăng tốc trang Error Log khi lọc theo
 * tài khoản, trạng thái và thời gian.
 */
errorLogSchema.index({
  user: 1,
  reviewed: 1,
  lastWrongAt: -1,
});

/*
 * Tăng tốc lọc theo cấp độ HSK.
 */
errorLogSchema.index({
  user: 1,
  level: 1,
  wrongCount: -1,
});

const ErrorLogModel: Model<ErrorLogData> =
  models.ErrorLog ||
  model<ErrorLogData>(
    "ErrorLog",
    errorLogSchema,
  );

export default ErrorLogModel;