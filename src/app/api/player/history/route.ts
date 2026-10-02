import { NextResponse } from "next/server";
import { Types } from "mongoose";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";
import MatchModel from "@/models/Match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ========================================
 * TYPES
 * ========================================
 */

type MatchMode =
  | "1v1"
  | "3v3"
  | "5v5"
  | "bot";

type HSKLevel =
  | 3
  | 4
  | 5
  | 6;

type MatchStatus =
  | "waiting"
  | "filling-bots"
  | "in-progress"
  | "completed"
  | "cancelled";

type MatchTeam =
  | "red"
  | "blue";

type MatchWinner =
  | "red"
  | "blue"
  | "draw"
  | null;

type MatchResult =
  | "win"
  | "loss"
  | "draw";

interface RawUser {
  _id?: string;

  name?: string;

  fullName?: string;

  username?: string;

  email?: string;
}

interface RawMatchPlayer {
  _id?: string;

  user?:
    | string
    | RawUser
    | null;

  name?: string;

  displayName?: string;

  botName?: string;

  team?: MatchTeam;

  isBot?: boolean;

  score?: number;

  correctAnswers?: number;

  wrongAnswers?: number;

  totalTime?: number;

  submitted?: boolean;
}

interface RawRegion {
  _id?: string;

  name?: string;

  chineseName?: string;

  pinyin?: string;
}

interface RawMatch {
  _id: string;

  mode?: MatchMode;

  level?: HSKLevel;

  status?: MatchStatus;

  region?:
    | string
    | RawRegion;

  regionId?: string;

  regionName?: string;

  players?:
    RawMatchPlayer[];

  redScore?: number;

  blueScore?: number;

  redTime?: number;

  blueTime?: number;

  winner?:
    MatchWinner;

  startedAt?:
    string;

  completedAt?:
    string;

  createdAt?:
    string;

  updatedAt?:
    string;
}

/*
 * ========================================
 * HELPERS
 * ========================================
 */

function getString(
  value: unknown,
  fallback = "",
): string {
  return typeof value ===
    "string"
    ? value
    : fallback;
}

function getNumber(
  value: unknown,
  fallback = 0,
): number {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : fallback;
}

function getUserReferenceId(
  user:
    RawMatchPlayer["user"],
): string {
  if (
    !user
  ) {
    return "";
  }

  if (
    typeof user ===
    "string"
  ) {
    return user;
  }

  return getString(
    user._id,
  );
}

function getPlayerName(
  player:
    RawMatchPlayer,
): string {
  if (
    player.isBot
  ) {
    return (
      player.botName ??
      player.displayName ??
      player.name ??
      "Máy"
    );
  }

  if (
    player.user &&
    typeof player.user ===
      "object"
  ) {
    return (
      player.user.name ??
      player.user.fullName ??
      player.user.username ??
      player.displayName ??
      player.name ??
      "Người chơi"
    );
  }

  return (
    player.displayName ??
    player.name ??
    "Người chơi"
  );
}

function getRegionInformation(
  match: RawMatch,
) {
  if (
    match.region &&
    typeof match.region ===
      "object"
  ) {
    return {
      id:
        match.region._id ??
        match.regionId ??
        "",

      name:
        match.region.name ??
        match.regionName ??
        "Khu vực chưa xác định",

      chineseName:
        match.region
          .chineseName ??
        "",

      pinyin:
        match.region.pinyin ??
        "",
    };
  }

  return {
    id:
      match.regionId ??
      (
        typeof match.region ===
        "string"
          ? match.region
          : ""
      ),

    name:
      match.regionName ??
      "Khu vực chưa xác định",

    chineseName:
      "",

    pinyin:
      "",
  };
}

function getMatchResult(
  winner:
    MatchWinner,
  currentTeam:
    MatchTeam | null,
): MatchResult {
  if (
    !winner ||
    winner ===
      "draw" ||
    !currentTeam
  ) {
    return "draw";
  }

  return winner ===
    currentTeam
    ? "win"
    : "loss";
}

/*
 * ========================================
 * GET /api/player/history
 * ========================================
 */
export async function GET(
  request: Request,
) {
  try {
    /*
     * ========================================
     * AUTH
     * ========================================
     */
    const userId =
      await getAuthenticatedUserId();

    if (
      !userId ||
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.",
        },
        {
          status:
            401,
        },
      );
    }

    await connectMongoDB();

    /*
     * ========================================
     * PAGINATION
     * ========================================
     */
    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const requestedPage =
      Number(
        searchParams.get(
          "page",
        ) ??
          "1",
      );

    const requestedLimit =
      Number(
        searchParams.get(
          "limit",
        ) ??
          "10",
      );

    const page =
      Number.isInteger(
        requestedPage,
      ) &&
      requestedPage >
        0
        ? requestedPage
        : 1;

    const limit =
      Number.isInteger(
        requestedLimit,
      ) &&
      requestedLimit >
        0
        ? Math.min(
            requestedLimit,
            30,
          )
        : 10;

    const skip =
      (
        page -
        1
      ) *
      limit;

    /*
     * ========================================
     * USER OBJECT ID
     * ========================================
     */
    const userObjectId =
      new Types.ObjectId(
        userId,
      );

    /*
     * ========================================
     * MATCH FILTER
     * ========================================
     *
     * Quan trọng:
     *
     * dùng "as const" để TypeScript
     * giữ nguyên literal "completed".
     *
     * Nếu không:
     *
     * status sẽ bị suy luận thành string
     * và không khớp MatchStatus.
     */
    const filter = {
      status:
        "completed" as const,

      "players.user":
        userObjectId,
    };

    /*
     * ========================================
     * LOAD HISTORY
     * ========================================
     */
    const [
      matchDocuments,
      total,
    ] =
      await Promise.all([
        MatchModel.find(
          filter,
        )
          .populate({
            path:
              "players.user",

            select:
              "name fullName username email",
          })
          .populate({
            path:
              "region",

            select:
              "name chineseName pinyin",
          })
          .sort({
            completedAt:
              -1,

            updatedAt:
              -1,

            createdAt:
              -1,
          })
          .skip(
            skip,
          )
          .limit(
            limit,
          )
          .lean(),

        MatchModel.countDocuments(
          filter,
        ),
      ]);

    /*
     * ========================================
     * SERIALIZE
     * ========================================
     *
     * Chuẩn hóa ObjectId + Date
     * thành plain JSON.
     */
    const matches =
      JSON.parse(
        JSON.stringify(
          matchDocuments,
        ),
      ) as RawMatch[];

    /*
     * ========================================
     * BUILD HISTORY
     * ========================================
     */
    const history =
      matches.map(
        (
          match,
        ) => {
          const players =
            Array.isArray(
              match.players,
            )
              ? match.players
              : [];

          const currentPlayer =
            players.find(
              (
                player,
              ) =>
                getUserReferenceId(
                  player.user,
                ) ===
                userId,
            );

          const currentTeam:
            MatchTeam | null =
              currentPlayer
                ?.team ??
              null;

          const winner =
            match.winner ??
            null;

          const result =
            getMatchResult(
              winner,
              currentTeam,
            );

          const region =
            getRegionInformation(
              match,
            );

          return {
            id:
              match._id,

            mode:
              match.mode ??
              "1v1",

            level:
              match.level ??
              3,

            region,

            result,

            winner:
              winner ??
              "draw",

            currentUserTeam:
              currentTeam,

            redScore:
              getNumber(
                match.redScore,
              ),

            blueScore:
              getNumber(
                match.blueScore,
              ),

            redTime:
              getNumber(
                match.redTime,
              ),

            blueTime:
              getNumber(
                match.blueTime,
              ),

            playerResult: {
              score:
                getNumber(
                  currentPlayer
                    ?.score,
                ),

              correctAnswers:
                getNumber(
                  currentPlayer
                    ?.correctAnswers,
                ),

              wrongAnswers:
                getNumber(
                  currentPlayer
                    ?.wrongAnswers,
                ),

              totalTime:
                getNumber(
                  currentPlayer
                    ?.totalTime,
                ),
            },

            players:
              players.map(
                (
                  player,
                ) => ({
                  id:
                    player._id ??
                    getUserReferenceId(
                      player.user,
                    ),

                  name:
                    getPlayerName(
                      player,
                    ),

                  team:
                    player.team ??
                    "red",

                  isBot:
                    player.isBot ===
                    true,

                  score:
                    getNumber(
                      player.score,
                    ),

                  correctAnswers:
                    getNumber(
                      player.correctAnswers,
                    ),

                  wrongAnswers:
                    getNumber(
                      player.wrongAnswers,
                    ),

                  totalTime:
                    getNumber(
                      player.totalTime,
                    ),

                  submitted:
                    player.submitted ===
                    true,
                }),
              ),

            startedAt:
              match.startedAt ??
              match.createdAt ??
              null,

            completedAt:
              match.completedAt ??
              match.updatedAt ??
              null,
          };
        },
      );

    /*
     * ========================================
     * PAGINATION RESULT
     * ========================================
     */
    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total /
            limit,
        ),
      );

    return NextResponse.json({
      success:
        true,

      data:
        history,

      pagination: {
        page,

        limit,

        total,

        totalPages,

        hasPreviousPage:
          page >
          1,

        hasNextPage:
          page <
          totalPages,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/player/history:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Không thể tải lịch sử thi đấu.",
      },
      {
        status:
          500,
      },
    );
  }
}