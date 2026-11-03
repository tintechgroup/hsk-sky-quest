import mongoose, { Schema, model, models } from "mongoose";

export interface ExploreQuestionData {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExploreStickerData {
  id: string;
  type: "info" | "quiz";
  title: string;
  icon: string;
  content: string;
  questions: ExploreQuestionData[];
  isActive: boolean;
}

export interface ExploreRegionData {
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;
  mapX: number;
  mapY: number;
  color: string;
  stickers: ExploreStickerData[];
  isActive: boolean;
}

const ExploreQuestionSchema = new Schema<ExploreQuestionData>(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    question: {
      type: String,
      default: "",
      trim: true,
    },
    options: {
      type: [String],
      default: ["", "", "", ""],
    },
    correctIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const ExploreStickerSchema = new Schema<ExploreStickerData>(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    type: {
      type: String,
      enum: ["info", "quiz"],
      required: true,
      default: "info",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
    questions: {
      type: [ExploreQuestionSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

const ExploreRegionSchema = new Schema<ExploreRegionData>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    chineseName: {
      type: String,
      default: "",
      trim: true,
    },
    pinyin: {
      type: String,
      default: "",
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    mapX: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 50,
    },
    mapY: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 50,
    },
    color: {
      type: String,
      default: "#34d399",
      trim: true,
    },
    stickers: {
      type: [ExploreStickerSchema],
      default: [],
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
    collection: "exploreregions",
  },
);

/**
 * Kiểm tra model Mongoose cũ có đủ các trường sticker và câu hỏi không.
 * Next.js có thể giữ model đã biên dịch trong cache khi chạy dev.
 */
type NestedSchemaPath = mongoose.SchemaType & {
  schema?: mongoose.Schema;
};

const cachedExploreRegionModel = models.ExploreRegion as
  | mongoose.Model<ExploreRegionData>
  | undefined;

const cachedStickerPath = cachedExploreRegionModel?.schema.path(
  "stickers",
) as NestedSchemaPath | undefined;

const cachedStickerSchema = cachedStickerPath?.schema;

const cachedQuestionsPath = cachedStickerSchema?.path(
  "questions",
) as NestedSchemaPath | undefined;

const cachedQuestionSchema = cachedQuestionsPath?.schema;

const cachedModelHasStickerSchema = Boolean(
  cachedStickerSchema?.path("id") &&
    cachedStickerSchema.path("type") &&
    cachedStickerSchema.path("title") &&
    cachedStickerSchema.path("icon") &&
    cachedStickerSchema.path("content") &&
    cachedStickerSchema.path("questions") &&
    cachedStickerSchema.path("isActive") &&
    cachedQuestionSchema?.path("id") &&
    cachedQuestionSchema.path("question") &&
    cachedQuestionSchema.path("options") &&
    cachedQuestionSchema.path("correctIndex") &&
    cachedQuestionSchema.path("explanation"),
);

if (cachedExploreRegionModel && !cachedModelHasStickerSchema) {
  mongoose.deleteModel("ExploreRegion");
}

const ExploreRegionModel =
  (models.ExploreRegion as
    | mongoose.Model<ExploreRegionData>
    | undefined) ?? model<ExploreRegionData>("ExploreRegion", ExploreRegionSchema);

export default ExploreRegionModel;