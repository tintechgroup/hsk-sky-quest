import {
  model,
  models,
  Schema,
} from "mongoose";

import type {
  HydratedDocument,
  Model,
  Types,
} from "mongoose";

/**
 * =====================================================
 * TYPES
 * =====================================================
 */

export type MatchMode =
  | "1v1"
  | "3v3"
  | "5v5"
  | "bot";

export type MatchStatus =
  | "waiting"
  | "filling-bots"
  | "in-progress"
  | "completed"
  | "cancelled";

export type MatchTeam =
  | "red"
  | "blue";

export type MatchWinner =
  | "red"
  | "blue"
  | "draw"
  | null;

/**
 * Giữ đúng 3 mức.
 *
 * Route matchmaking nên dùng:
 *
 * HSK3 -> easy
 * HSK4 -> normal
 * HSK5/6 -> hard
 */
export type BotDifficulty =
  | "easy"
  | "normal"
  | "hard";

/**
 * =====================================================
 * PLAYER
 * =====================================================
 */

export interface MatchPlayerData {
  /**
   * Bot không có tài khoản MongoDB.
   */
  user?: Types.ObjectId;

  team: MatchTeam;

  displayName: string;

  avatar: string;

  isBot: boolean;

  /**
   * Bot bắt buộc có botKey.
   */
  botKey?: string;

  botDifficulty?:
    BotDifficulty;

  score: number;

  correctAnswers: number;

  wrongAnswers: number;

  totalTime: number;

  joinedAt: Date;

  isReady: boolean;

  disconnected: boolean;

  submitted: boolean;
}

/**
 * =====================================================
 * MATCH
 * =====================================================
 */

export interface MatchData {
  region: Types.ObjectId;

  level:
    | 3
    | 4
    | 5
    | 6;

  mode: MatchMode;

  teamSize: number;

  maxPlayers: number;

  status: MatchStatus;

  players:
    MatchPlayerData[];

  questions:
    Types.ObjectId[];

  redScore: number;

  blueScore: number;

  redTime: number;

  blueTime: number;

  winner: MatchWinner;

  /**
   * PvP chờ đến thời điểm này.
   *
   * Khi hết thời gian:
   * frontend được phép HIỆN GỢI Ý
   * đấu với bot.
   *
   * Hệ thống KHÔNG tự thêm bot.
   */
  fallbackAt?: Date;

  startedAt?: Date;

  completedAt?: Date;

  cancelledAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export type MatchDocument =
  HydratedDocument<MatchData>;

/**
 * =====================================================
 * PLAYER SCHEMA
 * =====================================================
 */

const matchPlayerSchema =
  new Schema<MatchPlayerData>(
    {
      /**
       * Người thật có user.
       *
       * Bot không có user.
       */
      user: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        required: false,
      },

      team: {
        type: String,

        enum: [
          "red",
          "blue",
        ],

        required: true,
      },

      displayName: {
        type: String,

        required: true,

        trim: true,

        default:
          "Người chơi",
      },

      avatar: {
        type: String,

        default: "",

        trim: true,
      },

      isBot: {
        type: Boolean,

        default: false,
      },

      botKey: {
        type: String,

        trim: true,
      },

      botDifficulty: {
        type: String,

        enum: [
          "easy",
          "normal",
          "hard",
        ],
      },

      /**
       * ======================
       * KẾT QUẢ
       * ======================
       */

      score: {
        type: Number,

        default: 0,

        min: 0,
      },

      correctAnswers: {
        type: Number,

        default: 0,

        min: 0,
      },

      wrongAnswers: {
        type: Number,

        default: 0,

        min: 0,
      },

      totalTime: {
        type: Number,

        default: 0,

        min: 0,
      },

      /**
       * ======================
       * TRẠNG THÁI
       * ======================
       */

      joinedAt: {
        type: Date,

        default:
          Date.now,
      },

      isReady: {
        type: Boolean,

        default: true,
      },

      disconnected: {
        type: Boolean,

        default: false,
      },

      submitted: {
        type: Boolean,

        default: false,
      },
    },
    {
      _id: false,
    },
  );

/**
 * =====================================================
 * MATCH SCHEMA
 * =====================================================
 */

const matchSchema =
  new Schema<MatchData>(
    {
      region: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Region",

        required: true,

        index: true,
      },

      level: {
        type: Number,

        enum: [
          3,
          4,
          5,
          6,
        ],

        required: true,

        index: true,
      },

      mode: {
        type: String,

        enum: [
          "1v1",
          "3v3",
          "5v5",
          "bot",
        ],

        required: true,

        default:
          "3v3",

        index: true,
      },

      teamSize: {
        type: Number,

        enum: [
          1,
          3,
          5,
        ],

        required: true,

        default: 3,
      },

      maxPlayers: {
        type: Number,

        enum: [
          2,
          6,
          10,
        ],

        required: true,

        default: 6,
      },

      status: {
        type: String,

        enum: [
          "waiting",
          "filling-bots",
          "in-progress",
          "completed",
          "cancelled",
        ],

        default:
          "waiting",

        index: true,
      },

      players: {
        type: [
          matchPlayerSchema,
        ],

        default: [],
      },

      questions: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref:
              "Question",
          },
        ],

        default: [],
      },

      /**
       * ======================
       * ĐIỂM
       * ======================
       */

      redScore: {
        type: Number,

        default: 0,

        min: 0,
      },

      blueScore: {
        type: Number,

        default: 0,

        min: 0,
      },

      /**
       * ======================
       * THỜI GIAN
       * ======================
       */

      redTime: {
        type: Number,

        default: 0,

        min: 0,
      },

      blueTime: {
        type: Number,

        default: 0,

        min: 0,
      },

      /**
       * ======================
       * WINNER
       * ======================
       */

      winner: {
        type: String,

        enum: [
          "red",
          "blue",
          "draw",
          null,
        ],

        default: null,
      },

      /**
       * ======================
       * MATCHMAKING
       * ======================
       */

      fallbackAt: {
        type: Date,

        index: true,
      },

      /**
       * ======================
       * TIMESTAMPS TRẬN
       * ======================
       */

      startedAt: {
        type: Date,
      },

      completedAt: {
        type: Date,
      },

      cancelledAt: {
        type: Date,
      },
    },
    {
      timestamps: true,

      versionKey: false,
    },
  );

/**
 * =====================================================
 * VALIDATORS
 * =====================================================
 */

/**
 * Một tài khoản thật không được
 * xuất hiện 2 lần trong cùng trận.
 *
 * Bot không có user nên bỏ qua.
 */
matchSchema.path(
  "players",
).validate(
  function (
    players:
      MatchPlayerData[],
  ) {
    const realUserIds =
      players
        .filter(
          (player) =>
            !player.isBot &&
            player.user,
        )
        .map(
          (player) =>
            String(
              player.user,
            ),
        );

    return (
      new Set(
        realUserIds,
      ).size ===
      realUserIds.length
    );
  },

  "Một người chơi không thể xuất hiện hai lần trong cùng trận.",
);

/**
 * Bot bắt buộc có botKey.
 *
 * Người thật bắt buộc có user.
 */
matchSchema.path(
  "players",
).validate(
  function (
    players:
      MatchPlayerData[],
  ) {
    return players.every(
      (player) => {
        if (
          player.isBot
        ) {
          return Boolean(
            player.botKey,
          );
        }

        return Boolean(
          player.user,
        );
      },
    );
  },

  "Thông tin người chơi hoặc bot không hợp lệ.",
);

/**
 * Tổng số player không được
 * vượt maxPlayers.
 */
matchSchema.path(
  "players",
).validate(
  function (
    this: MatchData,

    players:
      MatchPlayerData[],
  ) {
    return (
      players.length <=
      this.maxPlayers
    );
  },

  "Trận đấu đã đủ người chơi.",
);

/**
 * Mỗi đội không được
 * vượt teamSize.
 */
matchSchema.path(
  "players",
).validate(
  function (
    this: MatchData,

    players:
      MatchPlayerData[],
  ) {
    const redPlayers =
      players.filter(
        (player) =>
          player.team ===
          "red",
      ).length;

    const bluePlayers =
      players.filter(
        (player) =>
          player.team ===
          "blue",
      ).length;

    return (
      redPlayers <=
        this.teamSize &&
      bluePlayers <=
        this.teamSize
    );
  },

  "Số người trong đội vượt quá giới hạn.",
);

/**
 * =====================================================
 * PRE VALIDATE
 * =====================================================
 *
 * QUAN TRỌNG:
 *
 * KHÔNG dùng:
 *
 * function(next) {
 *   ...
 *   next();
 * }
 *
 * vì có thể gây:
 *
 * "next is not a function"
 *
 * Middleware này đồng bộ,
 * không cần callback next.
 */

matchSchema.pre(
  "validate",

  function () {
    /**
     * Đồng bộ teamSize /
     * maxPlayers theo mode.
     */
    switch (
      this.mode
    ) {
      case "1v1":
        this.teamSize = 1;

        this.maxPlayers = 2;

        break;

      case "3v3":
        this.teamSize = 3;

        this.maxPlayers = 6;

        break;

      case "5v5":
        this.teamSize = 5;

        this.maxPlayers = 10;

        break;

      case "bot":
        this.teamSize = 1;

        this.maxPlayers = 2;

        break;
    }

    /**
     * PvP chờ 10 giây.
     *
     * Sau 10 giây frontend
     * chỉ GỢI Ý đấu bot.
     *
     * Không tự thêm bot.
     */
    if (
      this.mode !==
        "bot" &&
      this.status ===
        "waiting" &&
      !this.fallbackAt
    ) {
      this.fallbackAt =
        new Date(
          Date.now() +
            10_000,
        );
    }

    /**
     * Bot mode không cần
     * fallback timer.
     */
    if (
      this.mode ===
      "bot"
    ) {
      this.fallbackAt =
        undefined;
    }

    /**
     * Completed thì bảo đảm
     * có completedAt.
     */
    if (
      this.status ===
        "completed" &&
      !this.completedAt
    ) {
      this.completedAt =
        new Date();
    }

    /**
     * Cancelled thì bảo đảm
     * có cancelledAt.
     */
    if (
      this.status ===
        "cancelled" &&
      !this.cancelledAt
    ) {
      this.cancelledAt =
        new Date();
    }

    /**
     * In-progress thì bảo đảm
     * có startedAt.
     */
    if (
      this.status ===
        "in-progress" &&
      !this.startedAt
    ) {
      this.startedAt =
        new Date();
    }
  },
);

/**
 * =====================================================
 * INDEXES
 * =====================================================
 */

/**
 * Tìm phòng đang chờ.
 */
matchSchema.index({
  status: 1,

  mode: 1,

  region: 1,

  level: 1,

  createdAt: 1,
});

/**
 * Lịch sử trận của user.
 */
matchSchema.index({
  "players.user": 1,

  createdAt: -1,
});

/**
 * Tìm phòng đã đến thời điểm
 * gợi ý bot.
 */
matchSchema.index({
  status: 1,

  fallbackAt: 1,
});

/**
 * Lịch sử trận đã hoàn thành.
 */
matchSchema.index({
  status: 1,

  completedAt: -1,
});

/**
 * BXH / phân tích theo mode.
 */
matchSchema.index({
  mode: 1,

  status: 1,

  completedAt: -1,
});

/**
 * =====================================================
 * MODEL
 * =====================================================
 */

const MatchModel:
  Model<MatchData> =
  models.Match ||
  model<MatchData>(
    "Match",

    matchSchema,
  );

export default MatchModel;