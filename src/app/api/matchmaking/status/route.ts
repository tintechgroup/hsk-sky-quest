import {
  isValidObjectId,
  Types,
} from "mongoose";

import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import MatchModel from "@/models/Match";

import type {
  MatchPlayerData,
  MatchTeam,
} from "@/models/Match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ========================================
 * TYPES
 * ========================================
 */

type MatchStatus =
  | "waiting"
  | "filling-bots"
  | "in-progress"
  | "completed"
  | "cancelled";

const ACTIVE_MATCH_STATUSES: MatchStatus[] = [
  "waiting",
  "filling-bots",
  "in-progress",
];

/*
 * ========================================
 * BOT DATA
 * ========================================
 */

const BOT_NAMES = [
  "Tiểu Long",
  "Mộc Lan",
  "Vương Hạo",
  "Linh Linh",
  "Tiểu Minh",
  "An Nhiên",
  "Gia Huy",
  "Hải Yến",
  "Thiên Vũ",
  "Ngọc Anh",
];

const BOT_AVATARS = [
  "🤖",
  "🐼",
  "🐲",
  "🦊",
  "🐯",
  "🦁",
  "🐵",
  "🦅",
  "🐺",
  "🧠",
];

/*
 * ========================================
 * CREATE BOT
 * ========================================
 */

function createBotPlayer(
  team: MatchTeam,
  index: number,
): MatchPlayerData {
  const botIndex =
    index %
    BOT_NAMES.length;

  return {
    team,

    displayName:
      BOT_NAMES[
        botIndex
      ],

    avatar:
      BOT_AVATARS[
        botIndex %
          BOT_AVATARS.length
      ],

    isBot:
      true,

    botKey:
      [
        "bot",
        Date.now(),
        team,
        index,
        Math.random()
          .toString(
            36,
          )
          .slice(
            2,
            8,
          ),
      ].join(
        "-",
      ),

    botDifficulty:
      "normal",

    score:
      0,

    correctAnswers:
      0,

    wrongAnswers:
      0,

    totalTime:
      0,

    joinedAt:
      new Date(),

    isReady:
      true,

    disconnected:
      false,

    submitted:
      false,
  };
}

/*
 * ========================================
 * OBJECT HELPER
 * ========================================
 */

function getObjectRecord(
  value: unknown,
): Record<
  string,
  unknown
> | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

/*
 * ========================================
 * STRING HELPER
 * ========================================
 */

function getStringValue(
  value: unknown,
  fallback = "",
): string {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    value !==
      undefined &&
    value !==
      null
  ) {
    return String(
      value,
    );
  }

  return fallback;
}

/*
 * ========================================
 * NUMBER HELPER
 * ========================================
 */

function getNumberValue(
  value: unknown,
  fallback = 0,
): number {
  const converted =
    Number(
      value,
    );

  return Number.isFinite(
    converted,
  )
    ? converted
    : fallback;
}

/*
 * ========================================
 * SERIALIZE USER
 * ========================================
 */

function serializeUser(
  value: unknown,
) {
  const user =
    getObjectRecord(
      value,
    );

  if (
    !user
  ) {
    return {
      id:
        getStringValue(
          value,
        ),

      name:
        "Người chơi",

      email:
        "",

      avatar:
        "",
    };
  }

  return {
    id:
      getStringValue(
        user._id ??
          user.id,
      ),

    name:
      getStringValue(
        user.name,
        "Người chơi",
      ),

    email:
      getStringValue(
        user.email,
      ),

    /*
     * User schema hiện tại
     * không bắt buộc avatar.
     */
    avatar:
      getStringValue(
        user.avatar,
      ),
  };
}

/*
 * ========================================
 * SERIALIZE REGION
 * ========================================
 */

function serializeRegion(
  value: unknown,
) {
  const region =
    getObjectRecord(
      value,
    );

  if (
    !region
  ) {
    return {
      id:
        getStringValue(
          value,
        ),

      name:
        "Chưa xác định",

      chineseName:
        "",

      pinyin:
        "",
    };
  }

  return {
    id:
      getStringValue(
        region._id ??
          region.id,
      ),

    name:
      getStringValue(
        region.name,
        "Chưa xác định",
      ),

    chineseName:
      getStringValue(
        region.chineseName,
      ),

    pinyin:
      getStringValue(
        region.pinyin,
      ),
  };
}

/*
 * ========================================
 * SERIALIZE QUESTION
 * ========================================
 */

function serializeQuestion(
  value: unknown,
) {
  const question =
    getObjectRecord(
      value,
    );

  if (
    !question
  ) {
    return {
      id:
        getStringValue(
          value,
        ),
    };
  }

  return {
    id:
      getStringValue(
        question._id ??
          question.id,
      ),

    level:
      getNumberValue(
        question.level,
      ),

    topic:
      getStringValue(
        question.topic,
      ),

    question:
      getStringValue(
        question.question,
      ),

    pinyin:
      getStringValue(
        question.pinyin,
      ),

    options:
      Array.isArray(
        question.options,
      )
        ? question.options.map(
            (
              option,
            ) =>
              getStringValue(
                option,
              ),
          )
        : [],

    correctIndex:
      getNumberValue(
        question.correctIndex,
      ),

    hint:
      getStringValue(
        question.hint,
      ),

    explanation:
      getStringValue(
        question.explanation,
      ),
  };
}

/*
 * ========================================
 * SERIALIZE MATCH
 * ========================================
 */

function serializeMatch(
  value: unknown,
  currentUserId: string,
) {
  const match =
    getObjectRecord(
      value,
    );

  if (
    !match
  ) {
    return null;
  }

  const rawPlayers =
    Array.isArray(
      match.players,
    )
      ? match.players
      : [];

  const players =
    rawPlayers.map(
      (
        rawPlayer,
      ) => {
        const player =
          getObjectRecord(
            rawPlayer,
          ) ??
          {};

        const isBot =
          player.isBot ===
          true;

        let user;

        if (
          isBot
        ) {
          user = {
            id:
              getStringValue(
                player.botKey,
              ),

            name:
              getStringValue(
                player.displayName,
                "Máy",
              ),

            email:
              "",

            avatar:
              getStringValue(
                player.avatar,
                "🤖",
              ),
          };
        } else {
          const serializedUser =
            serializeUser(
              player.user,
            );

          /*
           * Nếu User không có avatar,
           * lấy avatar đã lưu trong player.
           */
          user = {
            ...serializedUser,

            avatar:
              serializedUser.avatar ||
              getStringValue(
                player.avatar,
              ),
          };
        }

        return {
          user,

          team:
            player.team ===
            "blue"
              ? ("blue" as const)
              : ("red" as const),

          isBot,

          botDifficulty:
            getStringValue(
              player.botDifficulty,
            ),

          score:
            getNumberValue(
              player.score,
            ),

          correctAnswers:
            getNumberValue(
              player.correctAnswers,
            ),

          wrongAnswers:
            getNumberValue(
              player.wrongAnswers,
            ),

          totalTime:
            getNumberValue(
              player.totalTime,
            ),

          joinedAt:
            player.joinedAt ??
            null,

          isReady:
            player.isReady !==
            false,

          disconnected:
            player.disconnected ===
            true,

          submitted:
            player.submitted ===
            true,
        };
      },
    );

  const maxPlayers =
    getNumberValue(
      match.maxPlayers,
      2,
    );

  const currentPlayer =
    players.find(
      (
        player,
      ) =>
        !player.isBot &&
        player.user.id ===
          currentUserId,
    );

  /*
   * ========================================
   * FALLBACK TIMER
   * ========================================
   */

  const fallbackAt =
    match.fallbackAt
      ? new Date(
          String(
            match.fallbackAt,
          ),
        )
      : null;

  const fallbackSeconds =
    fallbackAt &&
    !Number.isNaN(
      fallbackAt.getTime(),
    )
      ? Math.max(
          0,
          Math.ceil(
            (
              fallbackAt.getTime() -
              Date.now()
            ) /
              1000,
          ),
        )
      : 0;

  return {
    id:
      getStringValue(
        match._id ??
          match.id,
      ),

    region:
      serializeRegion(
        match.region,
      ),

    level:
      getNumberValue(
        match.level,
        3,
      ),

    mode:
      getStringValue(
        match.mode,
        "1v1",
      ),

    teamSize:
      getNumberValue(
        match.teamSize,
        1,
      ),

    status:
      getStringValue(
        match.status,
        "waiting",
      ),

    maxPlayers,

    playerCount:
      players.length,

    humanPlayerCount:
      players.filter(
        (
          player,
        ) =>
          !player.isBot,
      ).length,

    botPlayerCount:
      players.filter(
        (
          player,
        ) =>
          player.isBot,
      ).length,

    waitingForPlayers:
      Math.max(
        0,
        maxPlayers -
          players.length,
      ),

    fallbackAt:
      match.fallbackAt ??
      null,

    fallbackSeconds,

    isFull:
      players.length >=
      maxPlayers,

    hasStarted:
      match.status ===
        "in-progress" ||
      match.status ===
        "completed",

    isCompleted:
      match.status ===
      "completed",

    currentUserTeam:
      currentPlayer?.team ??
      null,

    players,

    teams: {
      red:
        players.filter(
          (
            player,
          ) =>
            player.team ===
            "red",
        ),

      blue:
        players.filter(
          (
            player,
          ) =>
            player.team ===
            "blue",
        ),
    },

    questions:
      Array.isArray(
        match.questions,
      )
        ? match.questions.map(
            serializeQuestion,
          )
        : [],

    redScore:
      getNumberValue(
        match.redScore,
      ),

    blueScore:
      getNumberValue(
        match.blueScore,
      ),

    redTime:
      getNumberValue(
        match.redTime,
      ),

    blueTime:
      getNumberValue(
        match.blueTime,
      ),

    winner:
      match.winner ??
      null,

    startedAt:
      match.startedAt ??
      null,

    completedAt:
      match.completedAt ??
      null,

    cancelledAt:
      match.cancelledAt ??
      null,

    createdAt:
      match.createdAt ??
      null,

    updatedAt:
      match.updatedAt ??
      null,
  };
}

/*
 * ========================================
 * POPULATE MATCH
 * ========================================
 */

async function populateMatch(
  matchId: unknown,
) {
  return MatchModel.findById(
    matchId,
  )
    /*
     * User model hiện tại
     * không có avatar.
     */
    .populate(
      "players.user",
      "name email",
    )
    .populate(
      "region",
      "name chineseName pinyin",
    )
    .populate(
      "questions",
      [
        "level",
        "topic",
        "question",
        "pinyin",
        "options",
        "correctIndex",
        "hint",
        "explanation",
      ].join(
        " ",
      ),
    )
    .lean();
}

/*
 * ========================================
 * FILL MISSING PLAYERS WITH BOTS
 * ========================================
 *
 * Chỉ một request được phép chuyển:
 *
 * waiting
 *
 * ->
 *
 * filling-bots
 */
async function fillMissingPlayersWithBots(
  matchId: string,
) {
  const lockedMatch =
    await MatchModel.findOneAndUpdate(
      {
        _id:
          new Types.ObjectId(
            matchId,
          ),

        status:
          "waiting",

        fallbackAt: {
          $lte:
            new Date(),
        },
      },
      {
        $set: {
          status:
            "filling-bots",
        },
      },
      {
        new:
          true,
      },
    );

  /*
   * Request khác đã khóa phòng.
   */
  if (
    !lockedMatch
  ) {
    return null;
  }

  const players = [
    ...lockedMatch.players,
  ];

  let redCount =
    players.filter(
      (
        player,
      ) =>
        player.team ===
        "red",
    ).length;

  let blueCount =
    players.filter(
      (
        player,
      ) =>
        player.team ===
        "blue",
    ).length;

  let botIndex =
    0;

  /*
   * Lấp đủ từng đội tới teamSize.
   */
  while (
    redCount <
      lockedMatch.teamSize ||
    blueCount <
      lockedMatch.teamSize
  ) {
    if (
      redCount <
      lockedMatch.teamSize
    ) {
      players.push(
        createBotPlayer(
          "red",
          botIndex,
        ),
      );

      redCount +=
        1;

      botIndex +=
        1;
    }

    if (
      blueCount <
      lockedMatch.teamSize
    ) {
      players.push(
        createBotPlayer(
          "blue",
          botIndex,
        ),
      );

      blueCount +=
        1;

      botIndex +=
        1;
    }
  }

  lockedMatch.players =
    players;

  lockedMatch.status =
    "in-progress";

  lockedMatch.startedAt =
    new Date();

  await lockedMatch.save();

  return lockedMatch;
}

/*
 * ========================================
 * START FULL MATCH
 * ========================================
 *
 * Nếu đủ người thật trước timeout
 * thì bắt đầu ngay.
 */
async function startFullMatch(
  matchId: string,
) {
  const match =
    await MatchModel.findById(
      new Types.ObjectId(
        matchId,
      ),
    ).select(
      "_id status players maxPlayers",
    );

  if (
    !match ||
    match.status !==
      "waiting" ||
    match.players.length <
      match.maxPlayers
  ) {
    return null;
  }

  return MatchModel.findOneAndUpdate(
    {
      _id:
        match._id,

      status:
        "waiting",
    },
    {
      $set: {
        status:
          "in-progress",

        startedAt:
          new Date(),
      },
    },
    {
      new:
        true,
    },
  );
}

/*
 * ========================================
 * GET /api/matchmaking/status
 * ========================================
 *
 * GET /api/matchmaking/status
 *
 * hoặc:
 *
 * GET /api/matchmaking/status?matchId=...
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
      !isValidObjectId(
        userId,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Bạn cần đăng nhập để xem trạng thái trận đấu.",
        },
        {
          status:
            401,
        },
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url,
      );

    const matchId =
      searchParams
        .get(
          "matchId",
        )
        ?.trim() ??
      "";

    /*
     * ========================================
     * MATCH ID VALIDATION
     * ========================================
     */
    if (
      matchId &&
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

    await connectMongoDB();

    const userObjectId =
      new Types.ObjectId(
        userId,
      );

    /*
     * ========================================
     * FIND MATCH
     * ========================================
     *
     * Tách thành hai query thay vì tạo
     * một union filter.
     *
     * Điều này tránh Mongoose suy luận:
     *
     * status.$in => string[]
     */
    let match;

    if (
      matchId
    ) {
      match =
        await MatchModel.findOne({
          _id:
            new Types.ObjectId(
              matchId,
            ),

          "players.user":
            userObjectId,
        })
          .sort({
            createdAt:
              -1,
          })
          .lean();
    } else {
      match =
        await MatchModel.findOne({
          "players.user":
            userObjectId,

          status: {
            $in:
              ACTIVE_MATCH_STATUSES,
          },
        })
          .sort({
            createdAt:
              -1,
          })
          .lean();
    }

    /*
     * ========================================
     * NO MATCH
     * ========================================
     */
    if (
      !match
    ) {
      return NextResponse.json({
        success:
          true,

        hasActiveMatch:
          false,

        message:
          "Bạn chưa tham gia trận đấu nào.",

        data:
          null,
      });
    }

    /*
     * ========================================
     * START IF FULL
     * ========================================
     */
    if (
      match.status ===
        "waiting" &&
      match.players.length >=
        match.maxPlayers
    ) {
      await startFullMatch(
        String(
          match._id,
        ),
      );

      const reloadedMatch =
        await MatchModel.findById(
          match._id,
        ).lean();

      if (
        !reloadedMatch
      ) {
        throw new Error(
          "Không thể tải phòng sau khi bắt đầu.",
        );
      }

      match =
        reloadedMatch;
    }

    /*
     * ========================================
     * FALLBACK TIMER
     * ========================================
     */
    const fallbackTime =
      match.fallbackAt
        ? new Date(
            match.fallbackAt,
          ).getTime()
        : 0;

    /*
     * Nếu hết thời gian chờ mà
     * vẫn thiếu người -> thêm bot.
     */
    if (
      match.status ===
        "waiting" &&
      fallbackTime >
        0 &&
      fallbackTime <=
        Date.now()
    ) {
      await fillMissingPlayersWithBots(
        String(
          match._id,
        ),
      );

      const reloadedMatch =
        await MatchModel.findById(
          match._id,
        ).lean();

      if (
        !reloadedMatch
      ) {
        throw new Error(
          "Không thể tải phòng sau khi thêm bot.",
        );
      }

      match =
        reloadedMatch;
    }

    /*
     * ========================================
     * FILLING BOTS
     * ========================================
     *
     * Request khác đang xử lý bot.
     */
    if (
      match.status ===
      "filling-bots"
    ) {
      return NextResponse.json({
        success:
          true,

        hasActiveMatch:
          true,

        message:
          "Đang bổ sung người chơi máy...",

        data: {
          id:
            String(
              match._id,
            ),

          status:
            "filling-bots",

          mode:
            match.mode,

          level:
            match.level,

          playerCount:
            match.players.length,

          maxPlayers:
            match.maxPlayers,

          waitingForPlayers:
            Math.max(
              0,
              match.maxPlayers -
                match.players.length,
            ),

          fallbackSeconds:
            0,

          players:
            [],

          questions:
            [],
        },
      });
    }

    /*
     * ========================================
     * POPULATE
     * ========================================
     */
    const populatedMatch =
      await populateMatch(
        match._id,
      );

    const serializedMatch =
      serializeMatch(
        populatedMatch,
        userId,
      );

    if (
      !serializedMatch
    ) {
      throw new Error(
        "Không thể chuẩn hóa dữ liệu trận đấu.",
      );
    }

    /*
     * ========================================
     * MESSAGE
     * ========================================
     */
    let message =
      "Đã tải trạng thái trận đấu.";

    if (
      serializedMatch.status ===
      "waiting"
    ) {
      message =
        serializedMatch.fallbackSeconds >
        0
          ? `Đang chờ người chơi. Máy sẽ tham gia sau ${serializedMatch.fallbackSeconds} giây.`
          : "Đang chuẩn bị bổ sung người chơi máy.";
    }

    if (
      serializedMatch.status ===
      "in-progress"
    ) {
      message =
        serializedMatch.botPlayerCount >
        0
          ? `Trận đấu bắt đầu với ${serializedMatch.humanPlayerCount} người thật và ${serializedMatch.botPlayerCount} người máy.`
          : "Đã đủ người thật. Trận đấu bắt đầu!";
    }

    if (
      serializedMatch.status ===
      "completed"
    ) {
      message =
        "Trận đấu đã kết thúc.";
    }

    /*
     * ========================================
     * ACTIVE STATUS
     * ========================================
     */
    const hasActiveMatch =
      ACTIVE_MATCH_STATUSES.includes(
        serializedMatch.status as MatchStatus,
      );

    return NextResponse.json({
      success:
        true,

      hasActiveMatch,

      message,

      data:
        serializedMatch,
    });
  } catch (
    error
  ) {
    console.error(
      "GET /api/matchmaking/status:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Không thể tải trạng thái ghép trận.",
      },
      {
        status:
          500,
      },
    );
  }
}