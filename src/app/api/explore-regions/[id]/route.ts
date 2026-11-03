import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { isAuthenticatedAdmin } from "@/lib/auth";
import connectMongoDB from "@/lib/mongodb";
import ExploreRegionModel from "@/models/ExploreRegion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface QuestionInput {
  id?: unknown;
  question?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
}

interface StickerInput {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  icon?: unknown;
  image?: unknown;
  content?: unknown;
  questions?: unknown;
  isActive?: unknown;
}

interface RegionInput {
  name?: unknown;
  chineseName?: unknown;
  pinyin?: unknown;
  slug?: unknown;
  mapX?: unknown;
  mapY?: unknown;
  color?: unknown;
  stickers?: unknown;
  isActive?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function makeId(value: unknown): string {
  return text(value) || new mongoose.Types.ObjectId().toString();
}

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function serializeRegion(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const region = value as Record<string, unknown>;
  const rawStickers = Array.isArray(region.stickers) ? region.stickers : [];

  return {
    id: String(region._id ?? region.id ?? ""),
    name: text(region.name),
    chineseName: text(region.chineseName),
    pinyin: text(region.pinyin),
    slug: text(region.slug),
    mapX: Number(region.mapX ?? 50),
    mapY: Number(region.mapY ?? 50),
    color: text(region.color) || "#34d399",
    isActive: region.isActive !== false,
    stickers: rawStickers.map((value) => {
      const sticker =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};

      const rawQuestions = Array.isArray(sticker.questions)
        ? sticker.questions
        : [];

      return {
        id: text(sticker.id),
        type: sticker.type === "quiz" ? "quiz" : "info",
        title: text(sticker.title),
        icon: text(sticker.icon),
        content: text(sticker.content),
        isActive: sticker.isActive !== false,
        questions: rawQuestions.map((value) => {
          const question =
            value && typeof value === "object"
              ? (value as Record<string, unknown>)
              : {};

          return {
            id: text(question.id),
            question: text(question.question),
            options: Array.isArray(question.options)
              ? question.options.map(text).slice(0, 4)
              : ["", "", "", ""],
            correctIndex: Math.max(
              0,
              Math.min(3, Number(question.correctIndex) || 0),
            ),
            explanation: text(question.explanation),
          };
        }),
      };
    }),
  };
}

function cleanStickers(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("Danh sách sticker không hợp lệ.");
  }

  return value.map((item, stickerIndex) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Sticker thứ ${stickerIndex + 1} không hợp lệ.`);
    }

    const sticker = item as StickerInput;
    const type = sticker.type === "quiz" ? "quiz" : "info";
    const title = text(sticker.title);
    const icon = text(sticker.icon) || text(sticker.image);

    if (!title) {
      throw new Error(`Sticker thứ ${stickerIndex + 1} chưa có tên.`);
    }

    if (!icon) {
      throw new Error(`Sticker “${title}” chưa có ảnh.`);
    }

    const questions =
      type === "quiz"
        ? Array.isArray(sticker.questions)
          ? sticker.questions.map((questionValue, questionIndex) => {
              if (
                !questionValue ||
                typeof questionValue !== "object" ||
                Array.isArray(questionValue)
              ) {
                throw new Error(
                  `Câu ${questionIndex + 1} của sticker “${title}” không hợp lệ.`,
                );
              }

              const question = questionValue as QuestionInput;
              const options = Array.isArray(question.options)
                ? question.options.map(text).slice(0, 4)
                : [];

              if (!text(question.question)) {
                throw new Error(
                  `Câu ${questionIndex + 1} của sticker “${title}” đang trống.`,
                );
              }

              if (options.length !== 4 || options.some((option) => !option)) {
                throw new Error(
                  `Câu ${questionIndex + 1} của sticker “${title}” cần đủ bốn đáp án.`,
                );
              }

              const correctIndex = Number(question.correctIndex);

              if (
                !Number.isInteger(correctIndex) ||
                correctIndex < 0 ||
                correctIndex > 3
              ) {
                throw new Error(
                  `Đáp án đúng của câu ${questionIndex + 1} không hợp lệ.`,
                );
              }

              return {
                id: makeId(question.id),
                question: text(question.question),
                options,
                correctIndex,
                explanation: text(question.explanation),
              };
            })
          : []
        : [];

    if (type === "quiz" && questions.length === 0) {
      throw new Error(`Sticker “${title}” cần có ít nhất một câu hỏi.`);
    }

    const content = type === "info" ? text(sticker.content) : "";

    if (type === "info" && !content) {
      throw new Error(`Sticker nội dung “${title}” chưa có nội dung chat.`);
    }

    return {
      id: makeId(sticker.id),
      type,
      title,
      icon,
      content,
      questions,
      isActive: sticker.isActive !== false,
    };
  });
}

async function isAdminRequest(): Promise<boolean> {
  try {
    return await isAuthenticatedAdmin();
  } catch {
    return false;
  }
}

async function parseJson(request: Request): Promise<RegionInput> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Dữ liệu JSON gửi lên không hợp lệ.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Dữ liệu tỉnh không hợp lệ.");
  }

  return body as RegionInput;
}

/**
 * PUT /api/explore-regions/[id]
 * Cập nhật tỉnh và lưu toàn bộ danh sách sticker vào MongoDB.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền cập nhật tỉnh." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã tỉnh không hợp lệ." },
        { status: 400 },
      );
    }

    const body = await parseJson(request);
    const name = text(body.name);
    const slug = createSlug(text(body.slug) || name);
    const mapX = Number(body.mapX);
    const mapY = Number(body.mapY);
    const color = text(body.color) || "#34d399";

    if (!name) throw new Error("Tên tỉnh không được để trống.");
    if (!slug) throw new Error("Slug tỉnh không hợp lệ.");
    if (!Number.isFinite(mapX) || mapX < 0 || mapX > 100) {
      throw new Error("Tọa độ X phải nằm trong khoảng 0 đến 100.");
    }
    if (!Number.isFinite(mapY) || mapY < 0 || mapY > 100) {
      throw new Error("Tọa độ Y phải nằm trong khoảng 0 đến 100.");
    }
    if (!validColor(color)) {
      throw new Error("Màu tỉnh phải có dạng #34d399.");
    }

    const stickers = cleanStickers(body.stickers ?? []);

    await connectMongoDB();

    const existing = await ExploreRegionModel.findById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tỉnh khám phá." },
        { status: 404 },
      );
    }

    const duplicate = await ExploreRegionModel.findOne({
      _id: { $ne: id },
      slug,
    })
      .select("_id")
      .lean();

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "Slug này đã được tỉnh khác sử dụng." },
        { status: 409 },
      );
    }

    existing.name = name;
    existing.chineseName = text(body.chineseName);
    existing.pinyin = text(body.pinyin);
    existing.slug = slug;
    existing.mapX = mapX;
    existing.mapY = mapY;
    existing.color = color;
    existing.stickers = stickers;
    existing.isActive = body.isActive !== false;

    await existing.save();

    return NextResponse.json(
      {
        success: true,
        message: `Đã lưu tỉnh và ${stickers.length} sticker.`,
        data: serializeRegion(existing.toObject()),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: "Slug tỉnh đã tồn tại." },
        { status: 409 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật tỉnh và sticker.";

    console.error("PUT /api/explore-regions/[id]:", error);

    return NextResponse.json(
      { success: false, message },
      { status: 400 },
    );
  }
}

/**
 * DELETE /api/explore-regions/[id]
 * Ẩn tỉnh khỏi bản đồ nhưng vẫn giữ dữ liệu.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền ẩn tỉnh." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Mã tỉnh không hợp lệ." },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const region = await ExploreRegionModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();

    if (!region) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tỉnh khám phá." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đã ẩn tỉnh khỏi bản đồ.",
        data: serializeRegion(region),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/explore-regions/[id]:", error);

    return NextResponse.json(
      { success: false, message: "Không thể ẩn tỉnh." },
      { status: 500 },
    );
  }
}