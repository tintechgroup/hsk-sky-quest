import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectMongoDB from "@/lib/mongodb";
import MatchModel from "@/models/Match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuthTokenPayload {
  userId?: string;
  id?: string;
  sub?: string;
}

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    "hsk-auth-token",
  )?.value;

  if (!token) {
    throw new Error(
      "Bạn chưa đăng nhập.",
    );
  }

  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "Chưa khai báo JWT_SECRET.",
    );
  }

  const decoded = jwt.verify(
    token,
    jwtSecret,
  ) as AuthTokenPayload;

  const userId =
    decoded.userId ??
    decoded.id ??
    decoded.sub;

  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error(
      "Phiên đăng nhập không hợp lệ.",
    );
  }

  return userId;
}

export async function POST(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    const body = await request.json();

    const matchId =
      typeof body.matchId === "string"
        ? body.matchId.trim()
        : "";

    if (
      !matchId ||
      !mongoose.Types.ObjectId.isValid(matchId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mã phòng ghép trận không hợp lệ.",
        },
        {
          status: 400,
        },
      );
    }

    await connectMongoDB();

    const match = await MatchModel.findById(
      matchId,
    );

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy phòng ghép trận.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Chỉ cho phép rời phòng khi phòng
     * vẫn đang chờ người chơi.
     */
    if (match.status !== "waiting") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trận đấu đã bắt đầu nên không thể rời phòng.",
        },
        {
          status: 409,
        },
      );
    }

    const playerIndex =
      match.players.findIndex((player) => {
        if (player.isBot || !player.user) {
          return false;
        }

        return (
          player.user.toString() === userId
        );
      });

    if (playerIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn không có trong phòng này.",
        },
        {
          status: 404,
        },
      );
    }

    match.players.splice(playerIndex, 1);

    const remainingRealPlayers =
      match.players.filter(
        (player) => !player.isBot,
      );

    /*
     * Xóa phòng nếu không còn người thật.
     */
    if (remainingRealPlayers.length === 0) {
      await MatchModel.deleteOne({
        _id: match._id,
        status: "waiting",
      });

      return NextResponse.json({
        success: true,
        message:
          "Đã rời và đóng phòng ghép trận.",
        roomDeleted: true,
      });
    }

    await match.save();

    return NextResponse.json({
      success: true,
      message:
        "Đã rời phòng ghép trận.",
      roomDeleted: false,
      remainingPlayers:
        remainingRealPlayers.length,
    });
  } catch (error) {
    console.error(
      "POST /api/matchmaking/leave:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Không thể rời phòng ghép trận.";

    const unauthorized =
      message.includes("đăng nhập") ||
      message.includes("Phiên đăng nhập") ||
      message.includes("jwt") ||
      message.includes("token");

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: unauthorized ? 401 : 500,
      },
    );
  }
}