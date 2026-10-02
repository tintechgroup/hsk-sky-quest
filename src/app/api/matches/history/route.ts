import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import MatchModel from "@/models/Match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeLimit(
  value: string | null,
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return 10;
  }

  return Math.min(
    parsed,
    50,
  );
}

export async function GET(
  request: Request,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn cần đăng nhập.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const limit =
      normalizeLimit(
        searchParams.get(
          "limit",
        ),
      );

    await connectMongoDB();

    const matches =
      await MatchModel.find({
        status:
          "completed",

        "players.user":
          userId,
      })
        .sort({
          completedAt: -1,
          createdAt: -1,
        })
        .limit(limit)
        .populate(
          "region",
          "name chineseName pinyin",
        )
        .lean();

    const data =
      matches.map(
        (match) => {
          const player =
            match.players.find(
              (item) =>
                !item.isBot &&
                item.user &&
                String(
                  item.user,
                ) ===
                  String(
                    userId,
                  ),
            );

          const playerTeam =
            player?.team ??
            null;

          let result:
            | "win"
            | "loss"
            | "draw" =
            "draw";

          if (
            match.winner !==
              "draw" &&
            playerTeam
          ) {
            result =
              match.winner ===
              playerTeam
                ? "win"
                : "loss";
          }

          const rawRegion =
            match.region as unknown as {
              _id?: unknown;
              name?: unknown;
              chineseName?: unknown;
              pinyin?: unknown;
            };

          return {
            id:
              String(
                match._id,
              ),

            mode:
              match.mode,

            level:
              match.level,

            status:
              match.status,

            result,

            playerTeam,

            player: player
              ? {
                  score:
                    player.score,

                  correctAnswers:
                    player.correctAnswers,

                  wrongAnswers:
                    player.wrongAnswers,

                  totalTime:
                    player.totalTime,
                }
              : null,

            region: {
              id:
                rawRegion?._id
                  ? String(
                      rawRegion._id,
                    )
                  : "",

              name:
                typeof rawRegion?.name ===
                "string"
                  ? rawRegion.name
                  : "Không xác định",

              chineseName:
                typeof rawRegion?.chineseName ===
                "string"
                  ? rawRegion.chineseName
                  : "",

              pinyin:
                typeof rawRegion?.pinyin ===
                "string"
                  ? rawRegion.pinyin
                  : "",
            },

            redScore:
              match.redScore,

            blueScore:
              match.blueScore,

            redTime:
              match.redTime,

            blueTime:
              match.blueTime,

            winner:
              match.winner,

            startedAt:
              match.startedAt ??
              null,

            completedAt:
              match.completedAt ??
              null,

            createdAt:
              match.createdAt,
          };
        },
      );

    return NextResponse.json(
      {
        success: true,

        data,

        total:
          data.length,
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
      "GET /api/matches/history:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải lịch sử trận đấu.",
      },
      {
        status: 500,
      },
    );
  }
}