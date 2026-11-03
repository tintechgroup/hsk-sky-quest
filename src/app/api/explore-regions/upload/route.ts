import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getAuthenticatedUserId } from "@/lib/auth";
import connectMongoDB from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

async function isAdminRequest(): Promise<boolean> {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return false;
    }

    await connectMongoDB();

    const user = await UserModel.findOne({
      _id: userId,
      role: "admin",
      isActive: { $ne: false },
      status: { $nin: ["blocked", "inactive"] },
    })
      .select("_id")
      .lean();

    return Boolean(user);
  } catch (error) {
    console.error("Kiểm tra quyền tải ảnh sticker:", error);
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json(
      {
        success: false,
        message: "Tài khoản hiện tại chưa được API xác nhận quyền Admin.",
      },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Bạn chưa chọn ảnh." },
        { status: 400 },
      );
    }

    if (!allowedTypes[file.type]) {
      return NextResponse.json(
        {
          success: false,
          message: "Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.",
        },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Ảnh phải có dung lượng lớn hơn 0 và không quá 5 MB.",
        },
        { status: 400 },
      );
    }

    const extension = allowedTypes[file.type];
    const fileName = `${randomUUID()}${extension}`;
    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "explore-stickers",
    );
    const filePath = path.join(uploadDirectory, fileName);

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      message: "Đã tải ảnh sticker lên.",
      data: {
        url: `/uploads/explore-stickers/${fileName}`,
      },
    });
  } catch (error) {
    console.error("Lỗi tải ảnh sticker:", error);

    return NextResponse.json(
      { success: false, message: "Không tải được ảnh sticker." },
      { status: 500 },
    );
  }
}