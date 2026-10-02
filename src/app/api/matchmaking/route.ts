import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import MatchModel from "@/models/Match";
import PlayerStatsModel from "@/models/PlayerStats";
import QuestionModel from "@/models/Question";
import RegionModel from "@/models/Region";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_SECONDS = 10;
const QUESTIONS_PER_MATCH = 10;

const VALID_LEVELS = [
  3,
  4,
  5,
  6,
] as const;

type HSKLevel =
  (typeof VALID_LEVELS)[number];

type MatchMode =
  | "1v1"
  | "3v3"
  | "5v5"
  | "bot";

type Team =
  | "red"
  | "blue";

type Winner =
  | "red"
  | "blue"
  | "draw"
  | null;

type MatchStatus =
  | "waiting"
  | "filling-bots"
  | "in-progress"
  | "completed"
  | "cancelled";

type BotDifficulty =
  | "easy"
  | "normal"
  | "hard";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface StoredPlayer {
  user: StoredUser;

  team: Team;

  isBot: boolean;

  botKey?: string;

  botDifficulty?: BotDifficulty;

  score: number;

  correctAnswers: number;

  wrongAnswers: number;

  totalTime: number;

  joinedAt: string;

  isReady: boolean;

  disconnected: boolean;

  submitted: boolean;
}

interface StoredQuestion {
  id: string;

  level?: number;

  topic?: string;

  question?: string;

  pinyin?: string;

  options?: string[];

  correctIndex?: number;

  hint?: string;

  explanation?: string;
}

interface StoredRoom {
  id: string;

  region: {
    id: string;
    name: string;
    chineseName?: string;
    pinyin?: string;
  };

  level: HSKLevel;

  mode: MatchMode;

  teamSize: number;

  maxPlayers: number;

  status: MatchStatus;

  players: StoredPlayer[];

  questions: StoredQuestion[];

  redScore: number;

  blueScore: number;

  redTime: number;

  blueTime: number;

  winner: Winner;

  createdAt: string;

  updatedAt: string;

  fallbackAt: string;

  startedAt:
    | string
    | null;

  completedAt:
    | string
    | null;

  /**
   * ID document Match đã lưu MongoDB.
   *
   * Dùng để chống lưu lịch sử
   * và PlayerStats hai lần.
   */
  persistedMatchId:
    | string
    | null;

  persisting: boolean;
}

interface MatchmakingBody {
  action?: unknown;

  regionId?: unknown;

  level?: unknown;

  mode?: unknown;

  matchId?: unknown;

  correctAnswers?: unknown;

  wrongAnswers?: unknown;

  totalTime?: unknown;
}

/*
 * Cache phòng trong globalThis để hạn chế
 * mất dữ liệu giữa các lần hot reload
 * trong môi trường development.
 */
declare global {
  var __hskMatchmakingRooms:
    | Map<string, StoredRoom>
    | undefined;
}

const rooms =
  globalThis.__hskMatchmakingRooms ??
  new Map<string, StoredRoom>();

globalThis.__hskMatchmakingRooms =
  rooms;

/* =====================================================
 * HELPERS
 * ===================================================== */

function getText(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidLevel(
  value: number,
): value is HSKLevel {
  return VALID_LEVELS.includes(
    value as HSKLevel,
  );
}

function isValidMode(
  value: string,
): value is MatchMode {
  return [
    "1v1",
    "3v3",
    "5v5",
    "bot",
  ].includes(value);
}

function getModeInformation(
  mode: MatchMode,
) {
  switch (mode) {
    case "3v3":
      return {
        teamSize: 3,
        maxPlayers: 6,
      };

    case "5v5":
      return {
        teamSize: 5,
        maxPlayers: 10,
      };

    case "1v1":
    case "bot":
    default:
      return {
        teamSize: 1,
        maxPlayers: 2,
      };
  }
}

function createFallbackAt() {
  return new Date(
    Date.now() +
      FALLBACK_SECONDS *
        1000,
  ).toISOString();
}

function resetFallbackTimer(
  room: StoredRoom,
) {
  room.fallbackAt =
    createFallbackAt();

  room.updatedAt =
    new Date().toISOString();
}

function calculateFallbackSeconds(
  room: StoredRoom,
) {
  if (
    room.mode === "bot" ||
    room.status !== "waiting"
  ) {
    return 0;
  }

  const remaining =
    new Date(
      room.fallbackAt,
    ).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      remaining / 1000,
    ),
  );
}

/* =====================================================
 * USER
 * ===================================================== */

async function getCurrentUser() {
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return null;
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
        "_id name username email avatar",
      )
      .lean();

  if (!user) {
    return null;
  }

  const raw =
    user as unknown as Record<
      string,
      unknown
    >;

  return {
    id:
      String(user._id),

    name:
      getText(raw.name) ||
      getText(
        raw.username,
      ) ||
      "Người chơi",

    email:
      getText(
        raw.email,
      ),

    avatar:
      getText(
        raw.avatar,
      ),
  } satisfies StoredUser;
}

/* =====================================================
 * PLAYER / TEAM
 * ===================================================== */

function chooseTeam(
  room: StoredRoom,
): Team {
  const red =
    room.players.filter(
      (player) =>
        player.team === "red",
    ).length;

  const blue =
    room.players.filter(
      (player) =>
        player.team === "blue",
    ).length;

  return red <= blue
    ? "red"
    : "blue";
}

function createHumanPlayer(
  user: StoredUser,
  team: Team,
): StoredPlayer {
  return {
    user,

    team,

    isBot: false,

    score: 0,

    correctAnswers: 0,

    wrongAnswers: 0,

    totalTime: 0,

    joinedAt:
      new Date().toISOString(),

    isReady: true,

    disconnected: false,

    submitted: false,
  };
}

function getBotDifficulty(
  level: HSKLevel,
): BotDifficulty {
  if (level === 3) {
    return "easy";
  }

  if (level === 4) {
    return "normal";
  }

  return "hard";
}

function createBot(
  room: StoredRoom,
  team: Team,
  number: number,
): StoredPlayer {
  const botKey =
    `bot-${room.id}-${team}-${number}`;

  return {
    user: {
      id: botKey,

      name:
        `Máy ${
          team === "red"
            ? "Đỏ"
            : "Xanh"
        } ${number}`,

      email: "",

      avatar: "🤖",
    },

    team,

    isBot: true,

    botKey,

    botDifficulty:
      getBotDifficulty(
        room.level,
      ),

    score: 0,

    correctAnswers: 0,

    wrongAnswers: 0,

    totalTime: 0,

    joinedAt:
      new Date().toISOString(),

    isReady: true,

    disconnected: false,

    submitted: false,
  };
}

/* =====================================================
 * QUESTIONS
 * ===================================================== */

async function loadQuestions(
  room: StoredRoom,
) {
  await connectMongoDB();

  const questions =
    await QuestionModel.aggregate([
      {
        $match: {
          region:
            new mongoose.Types.ObjectId(
              room.region.id,
            ),

          level:
            room.level,

          isActive: true,
        },
      },

      {
        $sample: {
          size:
            QUESTIONS_PER_MATCH,
        },
      },
    ]);

  return questions.map(
    (
      question: Record<
        string,
        unknown
      >,
    ): StoredQuestion => ({
      id:
        String(
          question._id ??
            "",
        ),

      level:
        Number(
          question.level ??
            room.level,
        ),

      topic:
        getText(
          question.topic,
        ),

      question:
        getText(
          question.question,
        ),

      pinyin:
        getText(
          question.pinyin,
        ),

      options:
        Array.isArray(
          question.options,
        )
          ? question.options.map(
              (option) =>
                getText(option),
            )
          : [],

      correctIndex:
        Number(
          question.correctIndex ??
            0,
        ),

      hint:
        getText(
          question.hint,
        ),

      explanation:
        getText(
          question.explanation,
        ),
    }),
  );
}

/* =====================================================
 * ROOM
 * ===================================================== */

async function startRoom(
  room: StoredRoom,
) {
  if (
    room.status ===
    "in-progress"
  ) {
    return;
  }

  const questions =
    await loadQuestions(
      room,
    );

  if (
    questions.length === 0
  ) {
    throw new Error(
      `Tỉnh này chưa có câu hỏi HSK ${room.level} đang hoạt động.`,
    );
  }

  room.questions =
    questions;

  room.status =
    "in-progress";

  room.startedAt =
    new Date().toISOString();

  room.updatedAt =
    room.startedAt;

  rooms.set(
    room.id,
    room,
  );
}

async function fillMissingSlotsWithBots(
  room: StoredRoom,
) {
  if (
    room.status ===
      "in-progress" ||
    room.status ===
      "completed"
  ) {
    return;
  }

  room.status =
    "filling-bots";

  let botNumber = 1;

  while (
    room.players.filter(
      (player) =>
        player.team === "red",
    ).length <
    room.teamSize
  ) {
    room.players.push(
      createBot(
        room,
        "red",
        botNumber++,
      ),
    );
  }

  while (
    room.players.filter(
      (player) =>
        player.team === "blue",
    ).length <
    room.teamSize
  ) {
    room.players.push(
      createBot(
        room,
        "blue",
        botNumber++,
      ),
    );
  }

  await startRoom(
    room,
  );
}

function findExistingRoomForUser(
  userId: string,
  regionId: string,
  level: HSKLevel,
  mode: MatchMode,
) {
  for (
    const room of
    rooms.values()
  ) {
    if (
      room.region.id !==
        regionId ||
      room.level !== level ||
      room.mode !== mode ||
      room.status !==
        "waiting"
    ) {
      continue;
    }

    if (
      mode !== "bot" &&
      room.players.some(
        (player) =>
          player.isBot,
      )
    ) {
      continue;
    }

    if (
      room.players.some(
        (player) =>
          player.user.id ===
          userId,
      )
    ) {
      return room;
    }
  }

  return null;
}

function findWaitingRoom(
  regionId: string,
  level: HSKLevel,
  mode: MatchMode,
) {
  for (
    const room of
    rooms.values()
  ) {
    if (
      room.region.id !==
        regionId ||
      room.level !== level ||
      room.mode !== mode ||
      room.status !==
        "waiting"
    ) {
      continue;
    }

    if (
      room.players.some(
        (player) =>
          player.isBot,
      )
    ) {
      continue;
    }

    const humans =
      room.players.filter(
        (player) =>
          !player.isBot,
      ).length;

    if (
      humans <
      room.maxPlayers
    ) {
      return room;
    }
  }

  return null;
}

async function createRoom(
  regionId: string,
  level: HSKLevel,
  mode: MatchMode,
) {
  await connectMongoDB();

  const region =
    await RegionModel.findOne({
      _id: regionId,

      isActive: {
        $ne: false,
      },
    })
      .select(
        "_id name chineseName pinyin",
      )
      .lean();

  if (!region) {
    throw new Error(
      "Không tìm thấy tỉnh/thành.",
    );
  }

  const modeInfo =
    getModeInformation(
      mode,
    );

  const now =
    new Date().toISOString();

  const room: StoredRoom = {
    id:
      randomUUID(),

    region: {
      id:
        String(
          region._id,
        ),

      name:
        getText(
          region.name,
        ),

      chineseName:
        getText(
          region.chineseName,
        ),

      pinyin:
        getText(
          region.pinyin,
        ),
    },

    level,

    mode,

    teamSize:
      modeInfo.teamSize,

    maxPlayers:
      modeInfo.maxPlayers,

    status:
      "waiting",

    players: [],

    questions: [],

    redScore: 0,

    blueScore: 0,

    redTime: 0,

    blueTime: 0,

    winner: null,

    createdAt:
      now,

    updatedAt:
      now,

    fallbackAt:
      createFallbackAt(),

    startedAt: null,

    completedAt: null,

    persistedMatchId:
      null,

    persisting:
      false,
  };

  rooms.set(
    room.id,
    room,
  );

  return room;
}

/* =====================================================
 * RESULT
 * ===================================================== */

function calculateBotResult(
  room: StoredRoom,
  bot: StoredPlayer,
) {
  const totalQuestions =
    Math.max(
      1,
      room.questions.length,
    );

  let accuracy =
    0.55;

  if (
    room.level === 4
  ) {
    accuracy =
      0.65;
  }

  if (
    room.level === 5
  ) {
    accuracy =
      0.75;
  }

  if (
    room.level === 6
  ) {
    accuracy =
      0.82;
  }

  const randomOffset =
    Math.floor(
      Math.random() * 3,
    ) - 1;

  const correct =
    Math.max(
      0,

      Math.min(
        totalQuestions,

        Math.round(
          totalQuestions *
            accuracy,
        ) +
          randomOffset,
      ),
    );

  bot.correctAnswers =
    correct;

  bot.wrongAnswers =
    totalQuestions -
    correct;

  bot.score =
    correct;

  bot.totalTime =
    Math.max(
      1,

      Math.round(
        totalQuestions *
          (
            4 +
            Math.random() *
              5
          ),
      ),
    );

  bot.submitted =
    true;
}

function calculateRoomResult(
  room: StoredRoom,
) {
  room.redScore =
    room.players
      .filter(
        (player) =>
          player.team ===
          "red",
      )
      .reduce(
        (
          total,
          player,
        ) =>
          total +
          player.score,
        0,
      );

  room.blueScore =
    room.players
      .filter(
        (player) =>
          player.team ===
          "blue",
      )
      .reduce(
        (
          total,
          player,
        ) =>
          total +
          player.score,
        0,
      );

  room.redTime =
    room.players
      .filter(
        (player) =>
          player.team ===
          "red",
      )
      .reduce(
        (
          total,
          player,
        ) =>
          total +
          player.totalTime,
        0,
      );

  room.blueTime =
    room.players
      .filter(
        (player) =>
          player.team ===
          "blue",
      )
      .reduce(
        (
          total,
          player,
        ) =>
          total +
          player.totalTime,
        0,
      );

  if (
    room.redScore >
    room.blueScore
  ) {
    room.winner =
      "red";

    return;
  }

  if (
    room.blueScore >
    room.redScore
  ) {
    room.winner =
      "blue";

    return;
  }

  if (
    room.redTime <
    room.blueTime
  ) {
    room.winner =
      "red";

    return;
  }

  if (
    room.blueTime <
    room.redTime
  ) {
    room.winner =
      "blue";

    return;
  }

  room.winner =
    "draw";
}

/* =====================================================
 * MONGODB PERSISTENCE
 * ===================================================== */

/**
 * Cập nhật PlayerStats cho một user thật.
 */
async function updatePlayerStats(
  room: StoredRoom,
  player: StoredPlayer,
) {
  if (
    player.isBot ||
    !mongoose.Types.ObjectId.isValid(
      player.user.id,
    )
  ) {
    return;
  }

  const userObjectId =
    new mongoose.Types.ObjectId(
      player.user.id,
    );

  let outcome:
    | "win"
    | "loss"
    | "draw";

  if (
    room.winner ===
    "draw"
  ) {
    outcome =
      "draw";
  } else if (
    room.winner ===
    player.team
  ) {
    outcome =
      "win";
  } else {
    outcome =
      "loss";
  }

  let stats =
    await PlayerStatsModel.findOne({
      user:
        userObjectId,
    });

  if (!stats) {
    stats =
      new PlayerStatsModel({
        user:
          userObjectId,
      });
  }

  stats.totalMatches +=
    1;

  stats.correctAnswers +=
    player.correctAnswers;

  stats.wrongAnswers +=
    player.wrongAnswers;

  stats.totalScore +=
    player.score;

  stats.totalTime +=
    player.totalTime;

  stats.bestScore =
    Math.max(
      stats.bestScore,
      player.score,
    );

  stats.lastPlayedAt =
    new Date();

  const modeStats =
    stats.modeStats[
      room.mode
    ];

  modeStats.matches +=
    1;

  modeStats.correctAnswers +=
    player.correctAnswers;

  modeStats.wrongAnswers +=
    player.wrongAnswers;

  modeStats.totalScore +=
    player.score;

  modeStats.totalTime +=
    player.totalTime;

  if (
    outcome === "win"
  ) {
    stats.wins +=
      1;

    modeStats.wins +=
      1;

    stats.currentWinStreak +=
      1;

    stats.bestWinStreak =
      Math.max(
        stats.bestWinStreak,
        stats.currentWinStreak,
      );
  } else if (
    outcome === "loss"
  ) {
    stats.losses +=
      1;

    modeStats.losses +=
      1;

    stats.currentWinStreak =
      0;
  } else {
    stats.draws +=
      1;

    modeStats.draws +=
      1;

    /**
     * Hòa không tăng streak.
     * Ở đây giữ nguyên streak.
     */
  }

  await stats.save();
}

/**
 * Lưu trận vào MongoDB đúng một lần,
 * sau đó cập nhật PlayerStats.
 */
async function persistCompletedRoom(
  room: StoredRoom,
) {
  if (
    room.persistedMatchId ||
    room.persisting
  ) {
    return;
  }

  if (
    room.status !==
      "completed"
  ) {
    return;
  }

  room.persisting =
    true;

  try {
    await connectMongoDB();

    const mongoPlayers =
      room.players.map(
        (player) => {
          if (
            player.isBot
          ) {
            return {
              team:
                player.team,

              displayName:
                player.user.name,

              avatar:
                player.user.avatar ??
                "🤖",

              isBot:
                true,

              botKey:
                player.botKey ||
                player.user.id,

              botDifficulty:
                player.botDifficulty ||
                getBotDifficulty(
                  room.level,
                ),

              score:
                player.score,

              correctAnswers:
                player.correctAnswers,

              wrongAnswers:
                player.wrongAnswers,

              totalTime:
                player.totalTime,

              joinedAt:
                new Date(
                  player.joinedAt,
                ),

              isReady:
                player.isReady,

              disconnected:
                player.disconnected,

              submitted:
                player.submitted,
            };
          }

          return {
            user:
              new mongoose.Types.ObjectId(
                player.user.id,
              ),

            team:
              player.team,

            displayName:
              player.user.name,

            avatar:
              player.user.avatar ??
              "",

            isBot:
              false,

            score:
              player.score,

            correctAnswers:
              player.correctAnswers,

            wrongAnswers:
              player.wrongAnswers,

            totalTime:
              player.totalTime,

            joinedAt:
              new Date(
                player.joinedAt,
              ),

            isReady:
              player.isReady,

            disconnected:
              player.disconnected,

            submitted:
              player.submitted,
          };
        },
      );

    const questionIds =
      room.questions
        .filter(
          (question) =>
            mongoose.Types.ObjectId.isValid(
              question.id,
            ),
        )
        .map(
          (question) =>
            new mongoose.Types.ObjectId(
              question.id,
            ),
        );

    const matchDocument =
      await MatchModel.create({
        region:
          new mongoose.Types.ObjectId(
            room.region.id,
          ),

        level:
          room.level,

        mode:
          room.mode,

        teamSize:
          room.teamSize,

        maxPlayers:
          room.maxPlayers,

        status:
          "completed",

        players:
          mongoPlayers,

        questions:
          questionIds,

        redScore:
          room.redScore,

        blueScore:
          room.blueScore,

        redTime:
          room.redTime,

        blueTime:
          room.blueTime,

        winner:
          room.winner,

        startedAt:
          room.startedAt
            ? new Date(
                room.startedAt,
              )
            : new Date(),

        completedAt:
          room.completedAt
            ? new Date(
                room.completedAt,
              )
            : new Date(),
      });

    /**
     * Chỉ sau khi Match tạo thành công
     * mới cập nhật PlayerStats.
     */
    for (
      const player of
      room.players
    ) {
      if (
        !player.isBot
      ) {
        await updatePlayerStats(
          room,
          player,
        );
      }
    }

    room.persistedMatchId =
      String(
        matchDocument._id,
      );

    room.updatedAt =
      new Date().toISOString();

    rooms.set(
      room.id,
      room,
    );
  } finally {
    room.persisting =
      false;
  }
}

/* =====================================================
 * SERIALIZE
 * ===================================================== */

function serializeRoom(
  room: StoredRoom,
  userId: string,
) {
  const humanPlayerCount =
    room.players.filter(
      (player) =>
        !player.isBot,
    ).length;

  const botPlayerCount =
    room.players.filter(
      (player) =>
        player.isBot,
    ).length;

  const playerCount =
    room.players.length;

  const currentPlayer =
    room.players.find(
      (player) =>
        player.user.id ===
        userId,
    );

  const fallbackSeconds =
    calculateFallbackSeconds(
      room,
    );

  return {
    id:
      room.id,

    persistedMatchId:
      room.persistedMatchId,

    region:
      room.region,

    level:
      room.level,

    mode:
      room.mode,

    teamSize:
      room.teamSize,

    status:
      room.status,

    maxPlayers:
      room.maxPlayers,

    playerCount,

    humanPlayerCount,

    botPlayerCount,

    waitingForPlayers:
      Math.max(
        0,

        room.maxPlayers -
          playerCount,
      ),

    fallbackSeconds,

    canOfferBots:
      room.mode !== "bot" &&
      room.status ===
        "waiting" &&
      playerCount <
        room.maxPlayers &&
      fallbackSeconds === 0,

    isFull:
      playerCount >=
      room.maxPlayers,

    hasStarted:
      room.status ===
      "in-progress",

    isCompleted:
      room.status ===
      "completed",

    currentUserTeam:
      currentPlayer?.team ??
      null,

    players:
      room.players,

    questions:
      room.questions,

    redScore:
      room.redScore,

    blueScore:
      room.blueScore,

    redTime:
      room.redTime,

    blueTime:
      room.blueTime,

    winner:
      room.winner,

    fallbackAt:
      room.fallbackAt,

    startedAt:
      room.startedAt,

    completedAt:
      room.completedAt,

    createdAt:
      room.createdAt,

    updatedAt:
      room.updatedAt,
  };
}

/* =====================================================
 * GET STATUS
 * ===================================================== */

export async function GET(
  request: Request,
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
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

    const matchId =
      getText(
        searchParams.get(
          "matchId",
        ),
      );

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Thiếu mã phòng.",
        },
        {
          status: 400,
        },
      );
    }

    const room =
      rooms.get(
        matchId,
      );

    if (!room) {
      return NextResponse.json({
        success: true,

        hasActiveMatch:
          false,

        data: null,

        message:
          "Phòng không còn tồn tại.",
      });
    }

    const joined =
      room.players.some(
        (player) =>
          player.user.id ===
          user.id,
      );

    if (!joined) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không thuộc phòng này.",
        },
        {
          status: 403,
        },
      );
    }

    const data =
      serializeRoom(
        room,
        user.id,
      );

    let message =
      "Đang chờ người chơi...";

    if (
      room.status ===
      "completed"
    ) {
      message =
        "Trận đấu đã hoàn thành.";
    } else if (
      room.status ===
      "in-progress"
    ) {
      message =
        "Trận đấu đang diễn ra.";
    } else if (
      data.canOfferBots
    ) {
      message =
        "Chưa đủ người. Bạn có thể chọn đấu với máy.";
    } else if (
      room.status ===
      "waiting"
    ) {
      message =
        `Đang tìm người chơi. Còn ${data.fallbackSeconds} giây.`;
    }

    return NextResponse.json({
      success: true,

      hasActiveMatch:
        true,

      matchStarted:
        room.status ===
        "in-progress",

      data,

      message,
    });
  } catch (error) {
    console.error(
      "GET /api/matchmaking:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải trạng thái trận.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =====================================================
 * POST ACTIONS
 * ===================================================== */

export async function POST(
  request: Request,
) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
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

    const body =
      (await request.json()) as
        MatchmakingBody;

    const action =
      getText(
        body.action,
      );

    /* ================= JOIN ================= */

    if (
      action === "join"
    ) {
      const regionId =
        getText(
          body.regionId,
        );

      const level =
        Number(
          body.level,
        );

      const mode =
        getText(
          body.mode,
        );

      if (
        !mongoose.Types.ObjectId.isValid(
          regionId,
        ) ||
        !isValidLevel(
          level,
        ) ||
        !isValidMode(
          mode,
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Thông tin ghép trận không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      let room =
        findExistingRoomForUser(
          user.id,
          regionId,
          level,
          mode,
        );

      if (room) {
        return NextResponse.json({
          success: true,

          alreadyJoined:
            true,

          data:
            serializeRoom(
              room,
              user.id,
            ),
        });
      }

      if (
        mode !== "bot"
      ) {
        room =
          findWaitingRoom(
            regionId,
            level,
            mode,
          );
      }

      if (!room) {
        room =
          await createRoom(
            regionId,
            level,
            mode,
          );
      }

      room.players.push(
        createHumanPlayer(
          user,

          chooseTeam(
            room,
          ),
        ),
      );

      if (
        mode === "bot"
      ) {
        await fillMissingSlotsWithBots(
          room,
        );
      } else {
        resetFallbackTimer(
          room,
        );

        const humans =
          room.players.filter(
            (player) =>
              !player.isBot,
          ).length;

        if (
          humans >=
          room.maxPlayers
        ) {
          await startRoom(
            room,
          );
        }
      }

      rooms.set(
        room.id,
        room,
      );

      return NextResponse.json({
        success: true,

        data:
          serializeRoom(
            room,
            user.id,
          ),

        matchStarted:
          room.status ===
          "in-progress",

        message:
          room.status ===
          "in-progress"
            ? "Trận đấu bắt đầu."
            : "Đã vào hàng chờ.",
      });
    }

    /* ================= FILL BOTS ================= */

    if (
      action ===
      "fill-bots"
    ) {
      const matchId =
        getText(
          body.matchId,
        );

      const room =
        rooms.get(
          matchId,
        );

      if (!room) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Không tìm thấy phòng.",
          },
          {
            status: 404,
          },
        );
      }

      await fillMissingSlotsWithBots(
        room,
      );

      return NextResponse.json({
        success: true,

        matchStarted:
          true,

        data:
          serializeRoom(
            room,
            user.id,
          ),
      });
    }

    /* ================= CONTINUE WAITING ================= */

    if (
      action ===
      "continue-waiting"
    ) {
      const matchId =
        getText(
          body.matchId,
        );

      const room =
        rooms.get(
          matchId,
        );

      if (!room) {
        return NextResponse.json(
          {
            success: false,
          },
          {
            status: 404,
          },
        );
      }

      resetFallbackTimer(
        room,
      );

      return NextResponse.json({
        success: true,

        data:
          serializeRoom(
            room,
            user.id,
          ),
      });
    }

    /* ================= SUBMIT RESULT ================= */

    if (
      action ===
      "submit-result"
    ) {
      const matchId =
        getText(
          body.matchId,
        );

      const room =
        rooms.get(
          matchId,
        );

      if (!room) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Không tìm thấy trận.",
          },
          {
            status: 404,
          },
        );
      }

      const player =
        room.players.find(
          (item) =>
            item.user.id ===
            user.id,
        );

      if (!player) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Bạn không thuộc trận này.",
          },
          {
            status: 403,
          },
        );
      }

      if (
        player.submitted
      ) {
        return NextResponse.json({
          success: true,

          completed:
            room.status ===
            "completed",

          alreadySubmitted:
            true,

          data: {
            matchId:
              room.id,

            persistedMatchId:
              room.persistedMatchId,

            winner:
              room.winner,

            redScore:
              room.redScore,

            blueScore:
              room.blueScore,

            redTime:
              room.redTime,

            blueTime:
              room.blueTime,
          },
        });
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

      if (
        !Number.isInteger(
          correctAnswers,
        ) ||
        correctAnswers < 0 ||
        !Number.isInteger(
          wrongAnswers,
        ) ||
        wrongAnswers < 0 ||
        !Number.isFinite(
          totalTime,
        ) ||
        totalTime < 0
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Kết quả không hợp lệ.",
          },
          {
            status: 400,
          },
        );
      }

      player.correctAnswers =
        correctAnswers;

      player.wrongAnswers =
        wrongAnswers;

      player.score =
        correctAnswers;

      player.totalTime =
        totalTime;

      player.submitted =
        true;

      /**
       * Bot hoàn thành ngay.
       */
      for (
        const bot of
        room.players
      ) {
        if (
          bot.isBot &&
          !bot.submitted
        ) {
          calculateBotResult(
            room,
            bot,
          );
        }
      }

      calculateRoomResult(
        room,
      );

      const activePlayers =
        room.players.filter(
          (item) =>
            !item.disconnected,
        );

      const allSubmitted =
        activePlayers.every(
          (item) =>
            item.submitted,
        );

      if (
        allSubmitted
      ) {
        room.status =
          "completed";

        room.completedAt =
          new Date().toISOString();

        calculateRoomResult(
          room,
        );

        /**
         * Đây là nơi lưu MongoDB thật.
         */
        await persistCompletedRoom(
          room,
        );
      }

      room.updatedAt =
        new Date().toISOString();

      rooms.set(
        room.id,
        room,
      );

      return NextResponse.json({
        success: true,

        completed:
          room.status ===
          "completed",

        data: {
          matchId:
            room.id,

          persistedMatchId:
            room.persistedMatchId,

          winner:
            room.winner,

          redScore:
            room.redScore,

          blueScore:
            room.blueScore,

          redTime:
            room.redTime,

          blueTime:
            room.blueTime,
        },

        message:
          room.status ===
          "completed"
            ? "Trận đấu đã hoàn thành và lưu vào tài khoản."
            : "Đã lưu kết quả. Đang chờ người chơi khác.",
      });
    }

    /* ================= LEAVE ================= */

    if (
      action === "leave"
    ) {
      const matchId =
        getText(
          body.matchId,
        );

      const room =
        rooms.get(
          matchId,
        );

      if (!room) {
        return NextResponse.json({
          success: true,
        });
      }

      if (
        room.status ===
        "in-progress"
      ) {
        const player =
          room.players.find(
            (item) =>
              item.user.id ===
              user.id,
          );

        if (player) {
          player.disconnected =
            true;
        }
      } else {
        room.players =
          room.players.filter(
            (item) =>
              item.user.id !==
              user.id,
          );

        if (
          room.players.filter(
            (item) =>
              !item.isBot,
          ).length === 0
        ) {
          rooms.delete(
            room.id,
          );

          return NextResponse.json({
            success: true,
          });
        }
      }

      rooms.set(
        room.id,
        room,
      );

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Action không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "POST /api/matchmaking:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Không thể xử lý trận đấu.",
      },
      {
        status: 500,
      },
    );
  }
}