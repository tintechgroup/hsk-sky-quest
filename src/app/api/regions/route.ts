import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import RegionModel from "@/models/Region";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegionRequestBody {
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

/**
 * Chuẩn hóa string.
 */
function normalizeString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Tạo slug từ chuỗi.
 */
function createSlug(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /đ/g,
      "d",
    )
    .replace(
      /Đ/g,
      "D",
    )
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

/**
 * Validate màu HEX.
 *
 * Ví dụ:
 * #34d399
 */
function isValidColor(
  value: string,
) {
  return /^#[0-9a-fA-F]{6}$/.test(
    value,
  );
}

/**
 * Kiểm tra duplicate key MongoDB.
 */
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
 * Kiểm tra tài khoản hiện tại có quyền admin.
 *
 * Luồng:
 *
 * Cookie
 * -> JWT
 * -> userId
 * -> MongoDB
 * -> role === "admin"
 *
 * Cách này lấy quyền mới nhất từ MongoDB.
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

    return Boolean(
      user,
    );
  } catch (
    error
  ) {
    console.error(
      "Kiểm tra quyền admin regions:",
      error,
    );

    return false;
  }
}

/**
 * Chuẩn hóa object Region trả về frontend.
 */
function serializeRegion(
  region: Record<
    string,
    unknown
  >,
) {
  const rawId =
    region._id;

  return {
    id:
      rawId &&
      typeof rawId === "object" &&
      "toString" in rawId
        ? String(
            rawId,
          )
        : String(
            rawId ?? "",
          ),

    name:
      normalizeString(
        region.name,
      ),

    chineseName:
      normalizeString(
        region.chineseName,
      ),

    pinyin:
      normalizeString(
        region.pinyin,
      ),

    slug:
      normalizeString(
        region.slug,
      ),

    geography:
      normalizeString(
        region.geography,
      ),

    culture:
      normalizeString(
        region.culture,
      ),

    landmark:
      normalizeString(
        region.landmark,
      ),

    mapX:
      typeof region.mapX ===
      "number"
        ? region.mapX
        : Number(
            region.mapX ??
              0,
          ),

    mapY:
      typeof region.mapY ===
      "number"
        ? region.mapY
        : Number(
            region.mapY ??
              0,
          ),

    flightOrder:
      typeof region.flightOrder ===
      "number"
        ? region.flightOrder
        : Number(
            region.flightOrder ??
              0,
          ),

    color:
      normalizeString(
        region.color,
      ) ||
      "#34d399",

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
 * GET /api/regions
 *
 * Public:
 * chỉ trả tỉnh đang hoạt động.
 *
 * GET /api/regions?scope=admin
 *
 * Admin:
 * trả cả tỉnh active + inactive.
 */
export async function GET(
  request: Request,
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const scope =
      searchParams.get(
        "scope",
      );

    const adminScope =
      scope === "admin";

    /**
     * Nếu request admin
     * thì phải có quyền admin.
     */
    if (
      adminScope &&
      !(await isAdminRequest())
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền quản trị tỉnh.",
        },
        {
          status: 403,
        },
      );
    }

    await connectMongoDB();

    /**
     * Game:
     * chỉ lấy tỉnh active.
     *
     * Admin:
     * lấy tất cả.
     */
    const filter =
      adminScope
        ? {}
        : {
            isActive:
              true,
          };

    const regions =
      await RegionModel.find(
        filter,
      )
        .sort({
          flightOrder: 1,
          name: 1,
        })
        .lean();

    const data =
      regions.map(
        (
          region,
        ) =>
          serializeRegion(
            region as unknown as Record<
              string,
              unknown
            >,
          ),
      );

    const response =
      NextResponse.json(
        {
          success: true,

          data,

          total:
            data.length,
        },
        {
          status: 200,
        },
      );

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );

    return response;
  } catch (
    error
  ) {
    console.error(
      "GET /api/regions:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải danh sách tỉnh.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * POST /api/regions
 *
 * Admin thêm tỉnh mới.
 */
export async function POST(
  request: Request,
) {
  try {
    /**
     * Kiểm tra quyền admin.
     */
    if (
      !(await isAdminRequest())
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền thêm tỉnh.",
        },
        {
          status: 403,
        },
      );
    }

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
      body as RegionRequestBody;

    /**
     * Chuẩn hóa dữ liệu.
     */
    const name =
      normalizeString(
        data.name,
      );

    const chineseName =
      normalizeString(
        data.chineseName,
      );

    const pinyin =
      normalizeString(
        data.pinyin,
      );

    const requestedSlug =
      normalizeString(
        data.slug,
      );

    const slug =
      createSlug(
        requestedSlug ||
          name,
      );

    const geography =
      normalizeString(
        data.geography,
      );

    const culture =
      normalizeString(
        data.culture,
      );

    const landmark =
      normalizeString(
        data.landmark,
      );

    const mapX =
      Number(
        data.mapX,
      );

    const mapY =
      Number(
        data.mapY,
      );

    const flightOrder =
      Number(
        data.flightOrder,
      );

    const requestedColor =
      normalizeString(
        data.color,
      );

    const color =
      requestedColor ||
      "#34d399";

    const isActive =
      typeof data.isActive ===
      "boolean"
        ? data.isActive
        : true;

    /**
     * Validate thông tin cơ bản.
     */
    if (
      !name ||
      !chineseName ||
      !pinyin ||
      !slug
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thiếu tên tỉnh, tên tiếng Trung, pinyin hoặc slug.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validate nội dung mô tả.
     */
    if (
      !geography ||
      !culture ||
      !landmark
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Vui lòng nhập đầy đủ địa lý, văn hóa và địa danh nổi bật.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validate mapX.
     */
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
            "Tọa độ X phải nằm trong khoảng từ 0 đến 100.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validate mapY.
     */
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
            "Tọa độ Y phải nằm trong khoảng từ 0 đến 100.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validate flightOrder.
     */
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
            "Thứ tự chuyến bay phải là số nguyên không âm.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validate color.
     */
    if (
      !isValidColor(
        color,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Màu tỉnh phải có dạng #34d399.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    /**
     * Kiểm tra slug đã tồn tại.
     */
    const existingRegion =
      await RegionModel.findOne({
        slug,
      })
        .select(
          "_id slug",
        )
        .lean();

    if (
      existingRegion
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Slug của tỉnh đã tồn tại.",
        },
        {
          status: 409,
        },
      );
    }

    /**
     * Tạo tỉnh.
     */
    const createdRegion =
      await RegionModel.create({
        name,

        chineseName,

        pinyin,

        slug,

        geography,

        culture,

        landmark,

        mapX,

        mapY,

        flightOrder,

        color,

        isActive,
      });

    /*
     * Quan trọng:
     *
     * Mongoose document không có index signature
     * tương thích trực tiếp với
     * Record<string, unknown>.
     *
     * Vì vậy phải cast qua unknown trước.
     */
    const serializedRegion =
      serializeRegion(
        createdRegion.toObject() as unknown as Record<
          string,
          unknown
        >,
      );

    return NextResponse.json(
      {
        success: true,

        message:
          "Đã thêm tỉnh vào MongoDB.",

        data:
          serializedRegion,
      },
      {
        status: 201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "POST /api/regions:",
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
            "Tỉnh hoặc slug này đã tồn tại.",
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
          "Không thể thêm tỉnh mới.",
      },
      {
        status: 500,
      },
    );
  }
}