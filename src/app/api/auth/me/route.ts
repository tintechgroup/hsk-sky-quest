import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import PlayerStatsModel from "@/models/PlayerStats";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: true,

          authenticated:
            false,

          user: null,
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    await connectMongoDB();

    const user =
      await UserModel.findOne({
        _id: userId,

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
          "_id name username email phone role lastLoginAt createdAt",
        )
        .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: true,

          authenticated:
            false,

          user: null,
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const stats =
      await PlayerStatsModel.findOne({
        user:
          user._id,
      })
        .lean();

    return NextResponse.json(
      {
        success: true,

        authenticated:
          true,

        user: {
          id:
            String(
              user._id,
            ),

          name:
            user.name ??
            user.username ??
            "Người chơi",

          username:
            user.username ??
            "",

          email:
            user.email ??
            "",

          phone:
            user.phone ??
            "",

          role:
            user.role ??
            "user",

          /**
           * Dùng PlayerStats làm
           * nguồn dữ liệu chính.
           */
          gamesPlayed:
            stats?.totalMatches ??
            0,

          totalMatches:
            stats?.totalMatches ??
            0,

          wins:
            stats?.wins ??
            0,

          losses:
            stats?.losses ??
            0,

          draws:
            stats?.draws ??
            0,

          correctAnswers:
            stats?.correctAnswers ??
            0,

          wrongAnswers:
            stats?.wrongAnswers ??
            0,

          totalScore:
            stats?.totalScore ??
            0,

          totalTime:
            stats?.totalTime ??
            0,

          bestScore:
            stats?.bestScore ??
            0,

          currentWinStreak:
            stats?.currentWinStreak ??
            0,

          bestWinStreak:
            stats?.bestWinStreak ??
            0,

          modeStats:
            stats?.modeStats ??
            {
              "1v1": {
                matches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalScore: 0,
                totalTime: 0,
              },

              "3v3": {
                matches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalScore: 0,
                totalTime: 0,
              },

              "5v5": {
                matches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalScore: 0,
                totalTime: 0,
              },

              bot: {
                matches: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalScore: 0,
                totalTime: 0,
              },
            },

          lastPlayedAt:
            stats?.lastPlayedAt ??
            null,

          lastLoginAt:
            user.lastLoginAt ??
            null,

          createdAt:
            user.createdAt ??
            null,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/auth/me:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        authenticated:
          false,

        user: null,

        message:
          "Không thể tải thông tin tài khoản.",
      },
      {
        status: 500,
      },
    );
  }
}