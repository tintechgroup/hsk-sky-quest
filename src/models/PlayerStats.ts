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

export interface ModeStatsData {
  matches: number;

  wins: number;

  losses: number;

  draws: number;

  correctAnswers: number;

  wrongAnswers: number;

  totalScore: number;

  totalTime: number;
}

export interface PlayerStatsData {
  user: Types.ObjectId;

  totalMatches: number;

  wins: number;

  losses: number;

  draws: number;

  correctAnswers: number;

  wrongAnswers: number;

  totalScore: number;

  totalTime: number;

  bestScore: number;

  currentWinStreak: number;

  bestWinStreak: number;

  modeStats: {
    "1v1": ModeStatsData;

    "3v3": ModeStatsData;

    "5v5": ModeStatsData;

    bot: ModeStatsData;
  };

  lastPlayedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export type PlayerStatsDocument =
  HydratedDocument<PlayerStatsData>;

/**
 * =====================================================
 * MODE STATS
 * =====================================================
 */

const modeStatsSchema =
  new Schema<ModeStatsData>(
    {
      matches: {
        type: Number,

        default: 0,

        min: 0,
      },

      wins: {
        type: Number,

        default: 0,

        min: 0,
      },

      losses: {
        type: Number,

        default: 0,

        min: 0,
      },

      draws: {
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

      totalScore: {
        type: Number,

        default: 0,

        min: 0,
      },

      totalTime: {
        type: Number,

        default: 0,

        min: 0,
      },
    },
    {
      _id: false,
    },
  );

/**
 * =====================================================
 * PLAYER STATS
 * =====================================================
 */

const playerStatsSchema =
  new Schema<PlayerStatsData>(
    {
      /**
       * Mỗi tài khoản chỉ có
       * một bản ghi thống kê.
       */
      user: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        unique: true,

        index: true,
      },

      /**
       * ======================
       * TỔNG QUAN
       * ======================
       */

      totalMatches: {
        type: Number,

        default: 0,

        min: 0,
      },

      wins: {
        type: Number,

        default: 0,

        min: 0,
      },

      losses: {
        type: Number,

        default: 0,

        min: 0,
      },

      draws: {
        type: Number,

        default: 0,

        min: 0,
      },

      /**
       * ======================
       * CÂU HỎI
       * ======================
       */

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

      /**
       * ======================
       * ĐIỂM / THỜI GIAN
       * ======================
       */

      totalScore: {
        type: Number,

        default: 0,

        min: 0,
      },

      totalTime: {
        type: Number,

        default: 0,

        min: 0,
      },

      bestScore: {
        type: Number,

        default: 0,

        min: 0,
      },

      /**
       * ======================
       * CHUỖI THẮNG
       * ======================
       */

      currentWinStreak: {
        type: Number,

        default: 0,

        min: 0,
      },

      bestWinStreak: {
        type: Number,

        default: 0,

        min: 0,
      },

      /**
       * ======================
       * THỐNG KÊ TỪNG MODE
       * ======================
       */

      modeStats: {
        "1v1": {
          type:
            modeStatsSchema,

          default:
            () => ({}),
        },

        "3v3": {
          type:
            modeStatsSchema,

          default:
            () => ({}),
        },

        "5v5": {
          type:
            modeStatsSchema,

          default:
            () => ({}),
        },

        bot: {
          type:
            modeStatsSchema,

          default:
            () => ({}),
        },
      },

      /**
       * Lần chơi gần nhất.
       */
      lastPlayedAt: {
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
 * INDEXES
 * =====================================================
 */

/**
 * Một user chỉ có một
 * PlayerStats.
 */
playerStatsSchema.index(
  {
    user: 1,
  },
  {
    unique: true,
  },
);

/**
 * BXH theo số trận thắng.
 */
playerStatsSchema.index({
  wins: -1,

  totalScore: -1,
});

/**
 * BXH theo tổng điểm.
 */
playerStatsSchema.index({
  totalScore: -1,

  wins: -1,
});

/**
 * BXH theo chuỗi thắng.
 */
playerStatsSchema.index({
  bestWinStreak: -1,
});

/**
 * Có thể dùng sau này cho
 * trang hoạt động gần đây.
 */
playerStatsSchema.index({
  lastPlayedAt: -1,
});

/**
 * =====================================================
 * MODEL
 * =====================================================
 */

const PlayerStatsModel:
  Model<PlayerStatsData> =
  models.PlayerStats ||
  model<PlayerStatsData>(
    "PlayerStats",

    playerStatsSchema,
  );

export default PlayerStatsModel;