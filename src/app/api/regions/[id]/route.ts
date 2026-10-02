import { NextResponse } from "next/server";
import mongoose from "mongoose";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import RegionModel from "@/models/Region";
import UserModel from "@/models/User";
import QuestionModel from "@/models/Question";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface RegionUpdateBody {
  name?: unknown;
  chineseName?: unknown;
  pinyin?: unknown;
  slug?: unknown;

  geography?: unknown;
  culture?: unknown;
  landmark?: unknown;

  mapX?: unknown;
  mapY?: unknown;

  flightOrder?: unknown;

  color?: unknown;

  isActive?: unknown;
}

function getText(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createSlug(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function isValidColor(
  value: string,
) {
  return /^#[0-9a-fA-F]{6}$/.test(
    value,
  );
}

function isDuplicateKeyError(
  error: unknown,
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code === 11000
  );
}

/**
 * Kiểm tra quyền admin.
 *
 * JWT -> userId -> MongoDB -> role admin
 */
async function isAdminRequest() {
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
      "Region admin check:",
      error,
    );

    return false;
  }
}

function serializeRegion(
  region: Record<
    string,
    unknown
  >,
) {
  return {
    id:
      region._id
        ? String(region._id)
        : "",

    name:
      getText(region.name),

    chineseName:
      getText(
        region.chineseName,
      ),

    pinyin:
      getText(region.pinyin),

    slug:
      getText(region.slug),

    geography:
      getText(
        region.geography,
      ),

    culture:
      getText(
        region.culture,
      ),

    landmark:
      getText(
        region.landmark,
      ),

    mapX:
      Number(
        region.mapX ?? 0,
      ),

    mapY:
      Number(
        region.mapY ?? 0,
      ),

    flightOrder:
      Number(
        region.flightOrder ??
          0,
      ),

    color:
      getText(
        region.color,
      ) || "#34d399",

    isActive:
      region.isActive !==
      false,

    createdAt:
      region.createdAt ??
      null,

    updatedAt:
      region.updatedAt ??
      null,
  };
}

/**
 * GET /api/regions/[id]
 *
 * Lấy chi tiết 1 tỉnh.
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
            "Mã tỉnh không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const region =
      await RegionModel.findById(
        id,
      ).lean();

    if (!region) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy tỉnh.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,

        data:
          serializeRegion(
            region as unknown as Record<
              string,
              unknown
            >,
          ),
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
      "GET /api/regions/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải thông tin tỉnh.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * Hàm dùng chung cho PATCH và PUT.
 */
async function updateRegion(
  request: Request,
  context: RouteContext,
) {
  try {
    if (
      !(await isAdminRequest())
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền cập nhật tỉnh.",
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
            "Mã tỉnh không hợp lệ.",
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
      typeof body !==
        "object" ||
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
      body as RegionUpdateBody;

    await connectMongoDB();

    const existingRegion =
      await RegionModel.findById(
        id,
      );

    if (!existingRegion) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy tỉnh.",
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
     * NAME
     */
    if (
      data.name !==
      undefined
    ) {
      const name =
        getText(data.name);

      if (!name) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Tên tỉnh không được để trống.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.name =
        name;
    }

    /**
     * CHINESE NAME
     */
    if (
      data.chineseName !==
      undefined
    ) {
      const chineseName =
        getText(
          data.chineseName,
        );

      if (!chineseName) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Tên tiếng Trung không được để trống.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.chineseName =
        chineseName;
    }

    /**
     * PINYIN
     */
    if (
      data.pinyin !==
      undefined
    ) {
      const pinyin =
        getText(
          data.pinyin,
        );

      if (!pinyin) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Pinyin không được để trống.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.pinyin =
        pinyin;
    }

    /**
     * SLUG
     */
    if (
      data.slug !==
      undefined
    ) {
      const rawSlug =
        getText(
          data.slug,
        );

      const slug =
        createSlug(
          rawSlug,
        );

      if (!slug) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Slug không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      const duplicated =
        await RegionModel.findOne({
          _id: {
            $ne: id,
          },

          slug,
        })
          .select("_id")
          .lean();

      if (duplicated) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Slug này đã được sử dụng bởi tỉnh khác.",
          },
          {
            status: 409,
          },
        );
      }

      updateData.slug =
        slug;
    }

    /**
     * GEOGRAPHY
     */
    if (
      data.geography !==
      undefined
    ) {
      const geography =
        getText(
          data.geography,
        );

      if (!geography) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Vui lòng nhập thông tin địa lý.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.geography =
        geography;
    }

    /**
     * CULTURE
     */
    if (
      data.culture !==
      undefined
    ) {
      const culture =
        getText(
          data.culture,
        );

      if (!culture) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Vui lòng nhập thông tin văn hóa.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.culture =
        culture;
    }

    /**
     * LANDMARK
     */
    if (
      data.landmark !==
      undefined
    ) {
      const landmark =
        getText(
          data.landmark,
        );

      if (!landmark) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Vui lòng nhập địa danh nổi bật.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.landmark =
        landmark;
    }

    /**
     * MAP X
     */
    if (
      data.mapX !==
      undefined
    ) {
      const mapX =
        Number(
          data.mapX,
        );

      if (
        !Number.isFinite(
          mapX,
        ) ||
        mapX < 0 ||
        mapX > 100
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Tọa độ X phải nằm trong khoảng 0 đến 100.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.mapX =
        mapX;
    }

    /**
     * MAP Y
     */
    if (
      data.mapY !==
      undefined
    ) {
      const mapY =
        Number(
          data.mapY,
        );

      if (
        !Number.isFinite(
          mapY,
        ) ||
        mapY < 0 ||
        mapY > 100
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Tọa độ Y phải nằm trong khoảng 0 đến 100.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.mapY =
        mapY;
    }

    /**
     * FLIGHT ORDER
     */
    if (
      data.flightOrder !==
      undefined
    ) {
      const flightOrder =
        Number(
          data.flightOrder,
        );

      if (
        !Number.isInteger(
          flightOrder,
        ) ||
        flightOrder < 0
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Thứ tự bay phải là số nguyên không âm.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.flightOrder =
        flightOrder;
    }

    /**
     * COLOR
     */
    if (
      data.color !==
      undefined
    ) {
      const color =
        getText(
          data.color,
        );

      if (
        !isValidColor(
          color,
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Màu phải có dạng #34d399.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.color =
        color;
    }

    /**
     * ACTIVE / INACTIVE
     *
     * Dùng cho nút:
     * Ẩn tỉnh
     * Kích hoạt
     */
    if (
      typeof data.isActive ===
      "boolean"
    ) {
      updateData.isActive =
        data.isActive;
    }

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

    const updatedRegion =
      await RegionModel.findByIdAndUpdate(
        id,

        {
          $set:
            updateData,
        },

        {
          new: true,

          runValidators:
            true,
        },
      ).lean();

    if (!updatedRegion) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy tỉnh sau khi cập nhật.",
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
          typeof data.isActive ===
            "boolean" &&
          Object.keys(
            updateData,
          ).length === 1
            ? data.isActive
              ? "Đã kích hoạt tỉnh."
              : "Đã ẩn tỉnh."
            : "Đã cập nhật tỉnh thành công.",

        data:
          serializeRegion(
            updatedRegion as unknown as Record<
              string,
              unknown
            >,
          ),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "UPDATE /api/regions/[id]:",
      error,
    );

    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Tên hoặc slug tỉnh đã tồn tại.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof
      mongoose.Error
        .ValidationError
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Dữ liệu tỉnh không hợp lệ.",

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
          "Không thể cập nhật tỉnh.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * PATCH
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  return updateRegion(
    request,
    context,
  );
}

/**
 * PUT
 */
export async function PUT(
  request: Request,
  context: RouteContext,
) {
  return updateRegion(
    request,
    context,
  );
}

/**
 * DELETE /api/regions/[id]
 *
 * Xóa vĩnh viễn tỉnh.
 *
 * Chỉ cho xóa khi tỉnh không còn câu hỏi.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    if (
      !(await isAdminRequest())
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xóa tỉnh.",
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
            "Mã tỉnh không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const region =
      await RegionModel.findById(
        id,
      )
        .select(
          "_id name",
        )
        .lean();

    if (!region) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Không tìm thấy tỉnh.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * Không cho xóa tỉnh nếu còn câu hỏi.
     */
    const questionCount =
      await QuestionModel.countDocuments(
        {
          region: id,
        },
      );

    if (
      questionCount > 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Không thể xóa tỉnh vì đang có ${questionCount} câu hỏi thuộc tỉnh này. Hãy xóa hoặc chuyển các câu hỏi trước.`,
        },
        {
          status: 409,
        },
      );
    }

    await RegionModel.findByIdAndDelete(
      id,
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "Đã xóa tỉnh vĩnh viễn.",

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
      "DELETE /api/regions/[id]:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể xóa tỉnh.",
      },
      {
        status: 500,
      },
    );
  }
}