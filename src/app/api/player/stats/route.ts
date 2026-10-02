import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectMongoDB from "@/lib/mongodb";
import PlayerStatsModel from "@/models/PlayerStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ========================================
 * AUTH TOKEN
 * ========================================
 */
interface AuthTokenPayload {
  userId?: string;
  id?: string;
  sub?: string;
}

/*
 * ========================================
 * EMPTY MODE STATS
 * ========================================
 *
 * Đồng bộ với PlayerStats model hiện tại.
 */
const emptyModeStats = {
  matches: 0,

  wins: 0,

  losses: 0,

  draws: 0,

  correctAnswers: 0,

  wrongAnswers: 0,

  totalScore: 0,

  totalTime: 0,
};

/*
 * ========================================
 * EMPTY PLAYER STATS
 * ========================================
 *
 * Field chuẩn hiện tại:
 *
 * correctAnswers
 * wrongAnswers
 * totalTime
 *
 * Không dùng:
 *
 * totalCorrectAnswers
 * totalWrongAnswers
 * totalPlayingTime
 */
const emptyStats = {
  totalMatches: 0,

  wins: 0,

  losses: 0,

  draws: 0,

  correctAnswers: 0,

  wrongAnswers: 0,

  totalScore: 0,

  totalTime: 0,

  bestScore: 0,

  currentWinStreak: 0,

  bestWinStreak: 0,

  modeStats: {
    "1v1": {
      ...emptyModeStats,
    },

    "3v3": {
      ...emptyModeStats,
    },

    "5v5": {
      ...emptyModeStats,
    },

    bot: {
      ...emptyModeStats,
    },
  },
};

/*
 * ========================================
 * GET AUTHENTICATED USER ID
 * ========================================
 */
async function getAuthenticatedUserId(): Promise<string> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
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

  let decoded:
    AuthTokenPayload;

  try {
    decoded =
      jwt.verify(
        token,
        jwtSecret,
      ) as AuthTokenPayload;
  } catch {
    throw new Error(
      "Phiên đăng nhập không hợp lệ.",
    );
  }

  const userId =
    decoded.userId ??
    decoded.id ??
    decoded.sub;

  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(
      userId,
    )
  ) {
    throw new Error(
      "Phiên đăng nhập không hợp lệ.",
    );
  }

  return userId;
}

/*
 * ========================================
 * GET /api/player/stats
 * ========================================
 */
export async function GET() {
  try {
    const userId =
      await getAuthenticatedUserId();

    await connectMongoDB();

    /*
     * Dùng ObjectId rõ ràng để query
     * đúng kiểu với field user của model.
     */
    const userObjectId =
      new mongoose.Types.ObjectId(
        userId,
      );

    const savedStats =
      await PlayerStatsModel.findOne({
        user:
          userObjectId,
      })
        .select(
          "-__v",
        )
        .lean();

    /*
     * ========================================
     * CHƯA CÓ THỐNG KÊ
     * ========================================
     *
     * Người chơi chưa hoàn thành trận nào
     * sẽ nhận toàn bộ thống kê bằng 0.
     */
    if (
      !savedStats
    ) {
      return NextResponse.json({
        success: true,

        data: {
          userId,

          ...emptyStats,

          winRate: 0,

          accuracy: 0,
        },
      });
    }

    /*
     * ========================================
     * NORMALIZE MAIN STATS
     * ========================================
     */
    const totalMatches =
      savedStats.totalMatches ??
      0;

    const wins =
      savedStats.wins ??
      0;

    const losses =
      savedStats.losses ??
      0;

    const draws =
      savedStats.draws ??
      0;

    const correctAnswers =
      savedStats.correctAnswers ??
      0;

    const wrongAnswers =
      savedStats.wrongAnswers ??
      0;

    const totalScore =
      savedStats.totalScore ??
      0;

    const totalTime =
      savedStats.totalTime ??
      0;

    const bestScore =
      savedStats.bestScore ??
      0;

    const currentWinStreak =
      savedStats.currentWinStreak ??
      0;

    const bestWinStreak =
      savedStats.bestWinStreak ??
      0;

    const totalAnswers =
      correctAnswers +
      wrongAnswers;

    /*
     * ========================================
     * WIN RATE
     * ========================================
     */
    const winRate =
      totalMatches > 0
        ? Number(
            (
              (
                wins /
                totalMatches
              ) *
              100
            ).toFixed(
              1,
            ),
          )
        : 0;

    /*
     * ========================================
     * ACCURACY
     * ========================================
     */
    const accuracy =
      totalAnswers > 0
        ? Number(
            (
              (
                correctAnswers /
                totalAnswers
              ) *
              100
            ).toFixed(
              1,
            ),
          )
        : 0;

    /*
     * ========================================
     * RESPONSE
     * ========================================
     */
    return NextResponse.json({
      success: true,

      data: {
        /*
         * Trả userId rõ ràng,
         * không phụ thuộc object mongoose.
         */
        userId,

        totalMatches,

        wins,

        losses,

        draws,

        correctAnswers,

        wrongAnswers,

        totalScore,

        totalTime,

        bestScore,

        currentWinStreak,

        bestWinStreak,

        /*
         * Giữ các field thời gian nếu model có.
         */
        lastPlayedAt:
          savedStats.lastPlayedAt ??
          null,

        createdAt:
          savedStats.createdAt ??
          null,

        updatedAt:
          savedStats.updatedAt ??
          null,

        /*
         * ========================================
         * MODE STATS
         * ========================================
         *
         * Merge default để dữ liệu cũ thiếu field
         * vẫn trả về object đầy đủ.
         */
        modeStats: {
          "1v1": {
            ...emptyModeStats,

            ...savedStats.modeStats?.[
              "1v1"
            ],
          },

          "3v3": {
            ...emptyModeStats,

            ...savedStats.modeStats?.[
              "3v3"
            ],
          },

          "5v5": {
            ...emptyModeStats,

            ...savedStats.modeStats?.[
              "5v5"
            ],
          },

          bot: {
            ...emptyModeStats,

            ...savedStats.modeStats
              ?.bot,
          },
        },

        winRate,

        accuracy,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/player/stats:",
      error,
    );

    const message =
      error instanceof
      Error
        ? error.message
        : "Không thể tải thống kê tài khoản.";

    /*
     * Các lỗi liên quan authentication
     * trả HTTP 401.
     */
    const unauthorized =
      message.includes(
        "đăng nhập",
      ) ||
      message.includes(
        "Phiên đăng nhập",
      ) ||
      message
        .toLowerCase()
        .includes(
          "jwt",
        ) ||
      message
        .toLowerCase()
        .includes(
          "token",
        );

    return NextResponse.json(
      {
        success: false,

        message,
      },
      {
        status:
          unauthorized
            ? 401
            : 500,
      },
    );
  }
}