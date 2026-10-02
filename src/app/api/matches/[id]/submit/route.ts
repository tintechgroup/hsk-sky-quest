import jwt from "jsonwebtoken";

import {
  isValidObjectId,
  Types,
} from "mongoose";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import connectMongoDB from "@/lib/mongodb";

import MatchModel from "@/models/Match";
import PlayerStatsModel from "@/models/PlayerStats";
import UserModel from "@/models/User";

import type {
  MatchMode,
  MatchPlayerData,
  MatchTeam,
  MatchWinner,
} from "@/models/Match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenPayload {
  userId?: string;
  id?: string;
  sub?: string;
  email?: string;
}

interface SubmitResultBody {
  correctAnswers?: unknown;
  wrongAnswers?: unknown;
  totalTime?: unknown;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface FinalMatchResult {
  redScore: number;
  blueScore: number;

  redTime: number;
  blueTime: number;

  winner: MatchWinner;
}

/*
 * ========================================
 * AUTH
 * ========================================
 */
async function getAuthenticatedUserId() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "hsk-auth-token",
    )?.value;

  if (!token) {
    return null;
  }

  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "Chưa khai báo JWT_SECRET.",
    );
  }

  try {
    const decoded =
      jwt.verify(
        token,
        jwtSecret,
      );

    if (
      !decoded ||
      typeof decoded ===
        "string"
    ) {
      return null;
    }

    const payload =
      decoded as TokenPayload;

    const userId =
      payload.userId ??
      payload.id ??
      payload.sub;

    if (
      userId &&
      isValidObjectId(
        userId,
      )
    ) {
      return userId;
    }

    /*
     * Tương thích token cũ
     * chỉ chứa email.
     */
    if (
      payload.email
    ) {
      await connectMongoDB();

      const user =
        await UserModel.findOne({
          email:
            payload.email
              .trim()
              .toLowerCase(),
        })
          .select(
            "_id",
          )
          .lean();

      if (
        user?._id
      ) {
        return String(
          user._id,
        );
      }
    }

    return null;
  } catch (
    error
  ) {
    console.error(
      "Không thể xác thực người dùng:",
      error,
    );

    return null;
  }
}

/*
 * ========================================
 * RANDOM INTEGER
 * ========================================
 */
function randomInteger(
  minimum: number,
  maximum: number,
) {
  return (
    Math.floor(
      Math.random() *
        (
          maximum -
          minimum +
          1
        ),
    ) +
    minimum
  );
}

/*
 * ========================================
 * BOT RESULT
 * ========================================
 */
function createBotResult(
  bot: MatchPlayerData,
  questionCount: number,
) {
  let minimumCorrect =
    0;

  let maximumCorrect =
    questionCount;

  if (
    bot.botDifficulty ===
    "easy"
  ) {
    maximumCorrect =
      Math.max(
        1,
        Math.floor(
          questionCount *
            0.6,
        ),
      );
  }

  if (
    bot.botDifficulty ===
    "normal"
  ) {
    minimumCorrect =
      Math.floor(
        questionCount *
          0.35,
      );
  }

  if (
    bot.botDifficulty ===
    "hard"
  ) {
    minimumCorrect =
      Math.max(
        1,
        Math.floor(
          questionCount *
            0.7,
        ),
      );
  }

  /*
   * Giới hạn min/max theo
   * số lượng câu hỏi thực tế.
   */
  minimumCorrect =
    Math.max(
      0,
      Math.min(
        minimumCorrect,
        questionCount,
      ),
    );

  maximumCorrect =
    Math.max(
      minimumCorrect,
      Math.min(
        maximumCorrect,
        questionCount,
      ),
    );

  const correctAnswers =
    randomInteger(
      minimumCorrect,
      maximumCorrect,
    );

  const wrongAnswers =
    Math.max(
      0,
      questionCount -
        correctAnswers,
    );

  /*
   * Tổng thời gian chỉ tính
   * những câu trả lời đúng.
   *
   * Không dùng Array.from().reduce()
   * để tránh TypeScript suy luận
   * accumulator thành unknown.
   */
  let totalTime = 0;

  for (
    let index = 0;
    index <
    correctAnswers;
    index += 1
  ) {
    totalTime +=
      randomInteger(
        7,
        26,
      );
  }

  return {
    score:
      correctAnswers,

    correctAnswers,

    wrongAnswers,

    totalTime,
  };
}

/*
 * ========================================
 * CALCULATE FINAL RESULT
 * ========================================
 */
function calculateFinalResult(
  players: MatchPlayerData[],
): FinalMatchResult {
  const redPlayers =
    players.filter(
      (
        player,
      ) =>
        player.team ===
        "red",
    );

  const bluePlayers =
    players.filter(
      (
        player,
      ) =>
        player.team ===
        "blue",
    );

  const redScore =
    redPlayers.reduce(
      (
        total,
        player,
      ) =>
        total +
        player.score,
      0,
    );

  const blueScore =
    bluePlayers.reduce(
      (
        total,
        player,
      ) =>
        total +
        player.score,
      0,
    );

  const redTime =
    redPlayers.reduce(
      (
        total,
        player,
      ) =>
        total +
        player.totalTime,
      0,
    );

  const blueTime =
    bluePlayers.reduce(
      (
        total,
        player,
      ) =>
        total +
        player.totalTime,
      0,
    );

  let winner:
    MatchWinner =
      null;

  if (
    redScore >
    blueScore
  ) {
    winner =
      "red";
  } else if (
    blueScore >
    redScore
  ) {
    winner =
      "blue";
  } else if (
    redTime <
    blueTime
  ) {
    winner =
      "red";
  } else if (
    blueTime <
    redTime
  ) {
    winner =
      "blue";
  } else {
    winner =
      "draw";
  }

  return {
    redScore,
    blueScore,

    redTime,
    blueTime,

    winner,
  };
}

/*
 * ========================================
 * UPDATE PLAYER STATS
 * ========================================
 */
async function updatePlayerStats({
  userId,
  mode,
  team,
  winner,
  score,
  correctAnswers,
  wrongAnswers,
  totalTime,
}: {
  userId:
    Types.ObjectId;

  mode:
    MatchMode;

  team:
    MatchTeam;

  winner:
    MatchWinner;

  score:
    number;

  correctAnswers:
    number;

  wrongAnswers:
    number;

  totalTime:
    number;
}) {
  const isDraw =
    winner ===
    "draw";

  const isWinner =
    winner ===
    team;

  const isLoser =
    !isDraw &&
    !isWinner;

  const winIncrement =
    isWinner
      ? 1
      : 0;

  const lossIncrement =
    isLoser
      ? 1
      : 0;

  const drawIncrement =
    isDraw
      ? 1
      : 0;

  const modePath =
    `modeStats.${mode}`;

  const stats =
    await PlayerStatsModel.findOneAndUpdate(
      {
        user:
          userId,
      },
      {
        $setOnInsert: {
          user:
            userId,
        },

        $set: {
          lastPlayedAt:
            new Date(),
        },

        $inc: {
          totalMatches:
            1,

          wins:
            winIncrement,

          losses:
            lossIncrement,

          draws:
            drawIncrement,

          correctAnswers,

          wrongAnswers,

          totalScore:
            score,

          totalTime,

          [`${modePath}.matches`]:
            1,

          [`${modePath}.wins`]:
            winIncrement,

          [`${modePath}.losses`]:
            lossIncrement,

          [`${modePath}.draws`]:
            drawIncrement,

          [`${modePath}.correctAnswers`]:
            correctAnswers,

          [`${modePath}.wrongAnswers`]:
            wrongAnswers,

          [`${modePath}.totalScore`]:
            score,

          [`${modePath}.totalTime`]:
            totalTime,
        },

        $max: {
          bestScore:
            score,
        },
      },
      {
        new:
          true,

        upsert:
          true,

        setDefaultsOnInsert:
          true,
      },
    );

  if (
    !stats
  ) {
    return;
  }

  /*
   * Thắng thì tăng streak.
   * Hòa/thua thì reset về 0.
   */
  const newWinStreak =
    isWinner
      ? stats.currentWinStreak +
        1
      : 0;

  await PlayerStatsModel.updateOne(
    {
      _id:
        stats._id,
    },
    {
      $set: {
        currentWinStreak:
          newWinStreak,
      },

      $max: {
        bestWinStreak:
          newWinStreak,
      },
    },
  );
}

/*
 * ========================================
 * SUBMIT BOT RESULTS
 * ========================================
 */
async function submitBotResults(
  matchId: string,
) {
  const match =
    await MatchModel.findById(
      matchId,
    );

  if (
    !match ||
    match.status !==
      "in-progress"
  ) {
    return;
  }

  const questionCount =
    match.questions.length;

  const unsubmittedBots =
    match.players.filter(
      (
        player,
      ) =>
        player.isBot &&
        !player.submitted &&
        player.botKey,
    );

  for (
    const bot of
    unsubmittedBots
  ) {
    if (
      !bot.botKey
    ) {
      continue;
    }

    const result =
      createBotResult(
        bot,
        questionCount,
      );

    await MatchModel.updateOne(
      {
        _id:
          matchId,

        status:
          "in-progress",
      },
      {
        $set: {
          "players.$[bot].score":
            result.score,

          "players.$[bot].correctAnswers":
            result.correctAnswers,

          "players.$[bot].wrongAnswers":
            result.wrongAnswers,

          "players.$[bot].totalTime":
            result.totalTime,

          "players.$[bot].submitted":
            true,
        },
      },
      {
        arrayFilters: [
          {
            "bot.isBot":
              true,

            "bot.botKey":
              bot.botKey,

            "bot.submitted":
              false,
          },
        ],
      },
    );
  }
}

/*
 * ========================================
 * COMPLETE MATCH
 * ========================================
 */
async function tryCompleteMatch(
  matchId: string,
) {
  const match =
    await MatchModel.findById(
      matchId,
    );

  if (
    !match ||
    match.status !==
      "in-progress"
  ) {
    return null;
  }

  const allSubmitted =
    match.players.length >
      0 &&
    match.players.every(
      (
        player,
      ) =>
        player.submitted,
    );

  if (
    !allSubmitted
  ) {
    return null;
  }

  const finalResult =
    calculateFinalResult(
      match.players,
    );

  /*
   * status trong filter giúp chỉ một
   * request được quyền hoàn tất trận.
   */
  const completedMatch =
    await MatchModel.findOneAndUpdate(
      {
        _id:
          matchId,

        status:
          "in-progress",

        players: {
          $not: {
            $elemMatch: {
              submitted:
                false,
            },
          },
        },
      },
      {
        $set: {
          status:
            "completed",

          redScore:
            finalResult.redScore,

          blueScore:
            finalResult.blueScore,

          redTime:
            finalResult.redTime,

          blueTime:
            finalResult.blueTime,

          winner:
            finalResult.winner,

          completedAt:
            new Date(),
        },
      },
      {
        new:
          true,
      },
    );

  /*
   * Request khác đã hoàn tất trước.
   */
  if (
    !completedMatch
  ) {
    return null;
  }

  /*
   * Chỉ cập nhật stats
   * cho người chơi thật.
   */
  const realPlayers =
    completedMatch.players.filter(
      (
        player,
      ) =>
        !player.isBot &&
        player.user,
    );

  await Promise.all(
    realPlayers.map(
      (
        player,
      ) => {
        if (
          !player.user
        ) {
          return Promise.resolve();
        }

        return updatePlayerStats({
          userId:
            player.user,

          mode:
            completedMatch.mode,

          team:
            player.team,

          winner:
            completedMatch.winner,

          score:
            player.score,

          correctAnswers:
            player.correctAnswers,

          wrongAnswers:
            player.wrongAnswers,

          totalTime:
            player.totalTime,
        });
      },
    ),
  );

  return completedMatch;
}

/*
 * ========================================
 * POST /api/matches/:id/submit
 * ========================================
 */
export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (
      !userId
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Bạn cần đăng nhập để nộp kết quả.",
        },
        {
          status:
            401,
        },
      );
    }

    const {
      id:
        matchId,
    } =
      await context.params;

    if (
      !isValidObjectId(
        matchId,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Mã trận đấu không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * ========================================
     * BODY
     * ========================================
     */
    let body:
      SubmitResultBody;

    try {
      body =
        (await request.json()) as
          SubmitResultBody;
    } catch {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Dữ liệu JSON gửi lên không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    const correctAnswers =
      Number(
        body.correctAnswers,
      );

    const wrongAnswers =
      Number(
        body.wrongAnswers,
      );

    const totalTime =
      Number(
        body.totalTime,
      );

    /*
     * ========================================
     * VALIDATE RESULTS
     * ========================================
     */
    if (
      !Number.isInteger(
        correctAnswers,
      ) ||
      correctAnswers <
        0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Số câu trả lời đúng không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      !Number.isInteger(
        wrongAnswers,
      ) ||
      wrongAnswers <
        0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Số câu trả lời sai không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      !Number.isFinite(
        totalTime,
      ) ||
      totalTime <
        0 ||
      totalTime >
        3600
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Tổng thời gian không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    await connectMongoDB();

    const userObjectId =
      new Types.ObjectId(
        userId,
      );

    /*
     * ========================================
     * LOAD MATCH
     * ========================================
     */
    const match =
      await MatchModel.findOne({
        _id:
          matchId,

        "players.user":
          userObjectId,
      });

    if (
      !match
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Không tìm thấy trận đấu hoặc bạn không thuộc trận này.",
        },
        {
          status:
            404,
        },
      );
    }

    /*
     * Match đã hoàn tất.
     */
    if (
      match.status ===
      "completed"
    ) {
      return NextResponse.json({
        success:
          true,

        alreadySubmitted:
          true,

        completed:
          true,

        message:
          "Trận đấu đã kết thúc.",

        data: {
          matchId:
            String(
              match._id,
            ),

          winner:
            match.winner,

          redScore:
            match.redScore,

          blueScore:
            match.blueScore,

          redTime:
            match.redTime,

          blueTime:
            match.blueTime,
        },
      });
    }

    /*
     * Match chưa bắt đầu.
     */
    if (
      match.status !==
      "in-progress"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Trận đấu chưa bắt đầu.",
        },
        {
          status:
            409,
        },
      );
    }

    const questionCount =
      match.questions.length;

    /*
     * Tổng đúng + sai phải bằng
     * số câu hỏi của trận.
     */
    if (
      correctAnswers >
        questionCount ||
      wrongAnswers >
        questionCount ||
      correctAnswers +
        wrongAnswers !==
        questionCount
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `Kết quả phải có tổng cộng ${questionCount} câu trả lời.`,
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * ========================================
     * CURRENT PLAYER
     * ========================================
     */
    const currentPlayer =
      match.players.find(
        (
          player,
        ) =>
          !player.isBot &&
          player.user?.toString() ===
            userId,
      );

    if (
      !currentPlayer
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Không tìm thấy người chơi trong trận.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      currentPlayer.submitted
    ) {
      return NextResponse.json({
        success:
          true,

        alreadySubmitted:
          true,

        completed:
          false,

        message:
          "Kết quả của bạn đã được ghi nhận trước đó.",
      });
    }

    /*
     * Mỗi câu đúng = 1 điểm.
     */
    const score =
      correctAnswers;

    /*
     * ========================================
     * SAVE PLAYER RESULT
     * ========================================
     */
    const updatedMatch =
      await MatchModel.findOneAndUpdate(
        {
          _id:
            matchId,

          status:
            "in-progress",

          players: {
            $elemMatch: {
              user:
                userObjectId,

              isBot:
                false,

              submitted:
                false,
            },
          },
        },
        {
          $set: {
            "players.$[player].score":
              score,

            "players.$[player].correctAnswers":
              correctAnswers,

            "players.$[player].wrongAnswers":
              wrongAnswers,

            "players.$[player].totalTime":
              Math.round(
                totalTime,
              ),

            "players.$[player].submitted":
              true,
          },
        },
        {
          new:
            true,

          arrayFilters: [
            {
              "player.user":
                userObjectId,

              "player.isBot":
                false,

              "player.submitted":
                false,
            },
          ],
        },
      );

    /*
     * Request khác đã submit trước.
     */
    if (
      !updatedMatch
    ) {
      return NextResponse.json({
        success:
          true,

        alreadySubmitted:
          true,

        completed:
          false,

        message:
          "Kết quả đã được ghi nhận.",
      });
    }

    /*
     * ========================================
     * BOT RESULTS
     * ========================================
     */
    await submitBotResults(
      matchId,
    );

    /*
     * ========================================
     * COMPLETE MATCH
     * ========================================
     */
    const completedMatch =
      await tryCompleteMatch(
        matchId,
      );

    if (
      completedMatch
    ) {
      return NextResponse.json({
        success:
          true,

        alreadySubmitted:
          false,

        completed:
          true,

        message:
          "Trận đấu đã kết thúc.",

        data: {
          matchId:
            String(
              completedMatch._id,
            ),

          winner:
            completedMatch.winner,

          redScore:
            completedMatch.redScore,

          blueScore:
            completedMatch.blueScore,

          redTime:
            completedMatch.redTime,

          blueTime:
            completedMatch.blueTime,
        },
      });
    }

    /*
     * Chưa đủ người submit.
     */
    return NextResponse.json({
      success:
        true,

      alreadySubmitted:
        false,

      completed:
        false,

      message:
        "Đã lưu kết quả. Đang chờ những người chơi khác hoàn thành.",

      data: {
        matchId,

        score,

        correctAnswers,

        wrongAnswers,

        totalTime:
          Math.round(
            totalTime,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/matches/[id]/submit:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Không thể lưu kết quả trận đấu.",
      },
      {
        status:
          500,
      },
    );
  }
}