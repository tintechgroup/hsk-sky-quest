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
import QuestionModel from "@/models/Question";
import RegionModel from "@/models/Region";
import UserModel from "@/models/User";

import type {
  MatchMode,
  MatchTeam,
} from "@/models/Match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ========================================
 * TYPES
 * ========================================
 */

const VALID_LEVELS = [
  3,
  4,
  5,
  6,
] as const;

type HSKLevel =
  (typeof VALID_LEVELS)[number];

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

interface JoinMatchBody {
  regionId?: unknown;
  level?: unknown;
  mode?: unknown;
}

interface ModeSettings {
  teamSize: number;
  maxPlayers: number;
}

interface RawUser {
  _id?: string;
  id?: string;

  name?: string;
  email?: string;

  avatar?: string;
}

interface RawRegion {
  _id?: string;
  id?: string;

  name?: string;
  chineseName?: string;
  pinyin?: string;
}

interface RawQuestion {
  _id?: string;
  id?: string;

  level?: number;

  topic?: string;
  question?: string;

  pinyin?: string;

  options?: string[];

  correctIndex?: number;

  hint?: string;
  explanation?: string;
}

interface RawPlayer {
  user?:
    | RawUser
    | string
    | null;

  team?:
    | "red"
    | "blue";

  displayName?: string;
  avatar?: string;

  isBot?: boolean;

  botKey?: string;
  botDifficulty?: string;

  score?: number;

  correctAnswers?: number;
  wrongAnswers?: number;

  totalTime?: number;

  joinedAt?:
    | string
    | null;

  isReady?: boolean;

  disconnected?: boolean;

  submitted?: boolean;
}

interface RawMatch {
  _id?: string;
  id?: string;

  region?:
    | RawRegion
    | string;

  level?: number;

  mode?: MatchMode;

  teamSize?: number;

  status?: MatchStatus;

  maxPlayers?: number;

  players?: RawPlayer[];

  questions?: RawQuestion[];

  redScore?: number;
  blueScore?: number;

  redTime?: number;
  blueTime?: number;

  winner?:
    | "red"
    | "blue"
    | "draw"
    | null;

  fallbackAt?:
    | string
    | null;

  startedAt?:
    | string
    | null;

  completedAt?:
    | string
    | null;

  createdAt?:
    | string
    | null;

  updatedAt?:
    | string
    | null;
}

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
 * VALIDATORS
 * ========================================
 */

function isHSKLevel(
  value: number,
): value is HSKLevel {
  return VALID_LEVELS.includes(
    value as HSKLevel,
  );
}

function isMatchMode(
  value: unknown,
): value is MatchMode {
  return (
    value === "1v1" ||
    value === "3v3" ||
    value === "5v5" ||
    value === "bot"
  );
}

/*
 * ========================================
 * MODE SETTINGS
 * ========================================
 */

function getModeSettings(
  mode: MatchMode,
): ModeSettings {
  if (
    mode === "1v1" ||
    mode === "bot"
  ) {
    return {
      teamSize: 1,
      maxPlayers: 2,
    };
  }

  if (
    mode === "3v3"
  ) {
    return {
      teamSize: 3,
      maxPlayers: 6,
    };
  }

  return {
    teamSize: 5,
    maxPlayers: 10,
  };
}

/*
 * ========================================
 * BOT PLAYER
 * ========================================
 */

function createBotPlayer(
  team: MatchTeam,
  index: number,
) {
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

    isBot: true,

    botKey: [
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
      "normal" as const,

    score: 0,

    correctAnswers: 0,

    wrongAnswers: 0,

    totalTime: 0,

    joinedAt:
      new Date(),

    isReady: true,

    disconnected:
      false,

    submitted:
      false,
  };
}

/*
 * ========================================
 * NORMALIZERS
 * ========================================
 */

function stringValue(
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

function numberValue(
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

function getUserId(
  user:
    RawPlayer["user"],
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

  return stringValue(
    user._id ??
      user.id,
  );
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
  if (
    !value
  ) {
    return null;
  }

  /*
   * ObjectId + Date ->
   * plain JSON.
   */
  const match =
    JSON.parse(
      JSON.stringify(
        value,
      ),
    ) as RawMatch;

  const rawPlayers =
    Array.isArray(
      match.players,
    )
      ? match.players
      : [];

  const players =
    rawPlayers.map(
      (
        player,
      ) => {
        const isBot =
          player.isBot ===
          true;

        const populatedUser =
          player.user &&
          typeof player.user ===
            "object"
            ? player.user
            : null;

        const user =
          isBot
            ? {
                id:
                  stringValue(
                    player.botKey,
                  ),

                name:
                  stringValue(
                    player.displayName,
                    "Máy",
                  ),

                email:
                  "",

                avatar:
                  stringValue(
                    player.avatar,
                    "🤖",
                  ),
              }
            : {
                id:
                  getUserId(
                    player.user,
                  ),

                name:
                  stringValue(
                    populatedUser
                      ?.name ??
                      player.displayName,
                    "Người chơi",
                  ),

                email:
                  stringValue(
                    populatedUser
                      ?.email,
                  ),

                /*
                 * User model hiện không có avatar.
                 *
                 * Avatar nếu có sẽ lấy từ
                 * Match player.
                 */
                avatar:
                  stringValue(
                    player.avatar,
                  ),
              };

        return {
          user,

          team:
            player.team ===
            "blue"
              ? ("blue" as const)
              : ("red" as const),

          isBot,

          botDifficulty:
            stringValue(
              player.botDifficulty,
            ),

          score:
            numberValue(
              player.score,
            ),

          correctAnswers:
            numberValue(
              player.correctAnswers,
            ),

          wrongAnswers:
            numberValue(
              player.wrongAnswers,
            ),

          totalTime:
            numberValue(
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

  const rawRegion =
    match.region &&
    typeof match.region ===
      "object"
      ? match.region
      : null;

  const region = {
    id:
      rawRegion
        ? stringValue(
            rawRegion._id ??
              rawRegion.id,
          )
        : stringValue(
            match.region,
          ),

    name:
      stringValue(
        rawRegion?.name,
        "Chưa xác định",
      ),

    chineseName:
      stringValue(
        rawRegion
          ?.chineseName,
      ),

    pinyin:
      stringValue(
        rawRegion
          ?.pinyin,
      ),
  };

  const questions =
    Array.isArray(
      match.questions,
    )
      ? match.questions.map(
          (
            question,
          ) => ({
            id:
              stringValue(
                question._id ??
                  question.id,
              ),

            level:
              numberValue(
                question.level,
              ),

            topic:
              stringValue(
                question.topic,
              ),

            question:
              stringValue(
                question.question,
              ),

            pinyin:
              stringValue(
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
                      stringValue(
                        option,
                      ),
                  )
                : [],

            correctIndex:
              numberValue(
                question.correctIndex,
              ),

            hint:
              stringValue(
                question.hint,
              ),

            explanation:
              stringValue(
                question.explanation,
              ),
          }),
        )
      : [];

  const currentPlayer =
    players.find(
      (
        player,
      ) =>
        !player.isBot &&
        player.user.id ===
          currentUserId,
    );

  const maxPlayers =
    numberValue(
      match.maxPlayers,
      2,
    );

  let fallbackSeconds =
    0;

  if (
    match.fallbackAt
  ) {
    const fallbackTime =
      new Date(
        match.fallbackAt,
      ).getTime();

    if (
      Number.isFinite(
        fallbackTime,
      )
    ) {
      fallbackSeconds =
        Math.max(
          0,
          Math.ceil(
            (
              fallbackTime -
              Date.now()
            ) /
              1000,
          ),
        );
    }
  }

  return {
    id:
      stringValue(
        match._id ??
          match.id,
      ),

    region,

    level:
      numberValue(
        match.level,
        3,
      ),

    mode:
      match.mode ??
      "1v1",

    teamSize:
      numberValue(
        match.teamSize,
        1,
      ),

    status:
      match.status ??
      "waiting",

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
      currentPlayer
        ?.team ??
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

    questions,

    redScore:
      numberValue(
        match.redScore,
      ),

    blueScore:
      numberValue(
        match.blueScore,
      ),

    redTime:
      numberValue(
        match.redTime,
      ),

    blueTime:
      numberValue(
        match.blueTime,
      ),

    winner:
      match.winner ??
      null,

    fallbackAt:
      match.fallbackAt ??
      null,

    startedAt:
      match.startedAt ??
      null,

    completedAt:
      match.completedAt ??
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
     * User model hiện tại không có avatar.
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
 * QUESTIONS
 * ========================================
 *
 * Lấy 3 câu hỏi.
 *
 * Ưu tiên cùng tỉnh + cùng level.
 * Nếu thiếu thì lấy cùng level
 * ở tỉnh khác.
 */
async function getQuestionIds(
  regionId: string,
  level: HSKLevel,
): Promise<
  Types.ObjectId[]
> {
  const regionObjectId =
    new Types.ObjectId(
      regionId,
    );

  const regionalQuestions =
    await QuestionModel.aggregate<{
      _id:
        Types.ObjectId;
    }>([
      {
        $match: {
          region:
            regionObjectId,

          level,

          isActive:
            true,
        },
      },

      {
        $sample: {
          size:
            3,
        },
      },

      {
        $project: {
          _id:
            1,
        },
      },
    ]);

  const questionIds =
    regionalQuestions.map(
      (
        question,
      ) =>
        question._id,
    );

  const missingCount =
    3 -
    questionIds.length;

  if (
    missingCount >
    0
  ) {
    const fallbackQuestions =
      await QuestionModel.aggregate<{
        _id:
          Types.ObjectId;
      }>([
        {
          $match: {
            _id: {
              $nin:
                questionIds,
            },

            level,

            isActive:
              true,
          },
        },

        {
          $sample: {
            size:
              missingCount,
          },
        },

        {
          $project: {
            _id:
              1,
          },
        },
      ]);

    questionIds.push(
      ...fallbackQuestions.map(
        (
          question,
        ) =>
          question._id,
      ),
    );
  }

  return questionIds;
}

/*
 * ========================================
 * POST /api/matchmaking/join
 * ========================================
 */

export async function POST(
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
            "Phiên đăng nhập không hợp lệ. Hãy đăng xuất và đăng nhập lại.",
        },
        {
          status:
            401,
        },
      );
    }

    /*
     * ========================================
     * BODY
     * ========================================
     */
    let body:
      JoinMatchBody;

    try {
      body =
        (await request.json()) as
          JoinMatchBody;
    } catch {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Dữ liệu gửi lên không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    const regionId =
      typeof body.regionId ===
        "string"
        ? body.regionId.trim()
        : "";

    const parsedLevel =
      Number(
        body.level,
      );

    const requestedMode =
      typeof body.mode ===
        "string"
        ? body.mode.trim()
        : "";

    /*
     * ========================================
     * REGION VALIDATION
     * ========================================
     */
    if (
      !regionId ||
      !isValidObjectId(
        regionId,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Mã tỉnh/thành không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * ========================================
     * LEVEL VALIDATION
     * ========================================
     */
    if (
      !Number.isInteger(
        parsedLevel,
      ) ||
      !isHSKLevel(
        parsedLevel,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Trình độ HSK không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * Sau type guard này level có kiểu:
     *
     * 3 | 4 | 5 | 6
     *
     * không còn là number.
     */
    const level:
      HSKLevel =
        parsedLevel;

    /*
     * ========================================
     * MODE VALIDATION
     * ========================================
     */
    if (
      !isMatchMode(
        requestedMode,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Chế độ thi đấu không hợp lệ.",
        },
        {
          status:
            400,
        },
      );
    }

    const mode:
      MatchMode =
        requestedMode;

    const {
      teamSize,
      maxPlayers,
    } =
      getModeSettings(
        mode,
      );

    await connectMongoDB();

    const userObjectId =
      new Types.ObjectId(
        userId,
      );

    const regionObjectId =
      new Types.ObjectId(
        regionId,
      );

    /*
     * ========================================
     * USER
     * ========================================
     */
    const currentUser =
      await UserModel.findOne({
        _id:
          userObjectId,

        isActive: {
          $ne:
            false,
        },
      })
        /*
         * User schema hiện không có avatar.
         */
        .select(
          "_id name email",
        )
        .lean();

    if (
      !currentUser
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Không tìm thấy tài khoản hoặc tài khoản đã bị khóa.",
        },
        {
          status:
            404,
        },
      );
    }

    /*
     * ========================================
     * REGION
     * ========================================
     */
    const region =
      await RegionModel.findOne({
        _id:
          regionObjectId,

        isActive:
          true,
      })
        .select(
          "_id name chineseName pinyin",
        )
        .lean();

    if (
      !region
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Tỉnh/thành không tồn tại hoặc đã ngừng hoạt động.",
        },
        {
          status:
            404,
        },
      );
    }

    /*
     * ========================================
     * EXISTING MATCH
     * ========================================
     *
     * Nếu user đã ở trong một trận
     * đang hoạt động thì trả lại trận đó.
     */
    const existingMatch =
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

    if (
      existingMatch
    ) {
      const populatedExistingMatch =
        await populateMatch(
          existingMatch._id,
        );

      return NextResponse.json({
        success:
          true,

        alreadyJoined:
          true,

        matchStarted:
          existingMatch.status ===
          "in-progress",

        message:
          existingMatch.status ===
          "in-progress"
            ? "Bạn đang ở trong một trận đấu."
            : "Bạn đang ở trong hàng chờ.",

        data:
          serializeMatch(
            populatedExistingMatch,
            userId,
          ),
      });
    }

    /*
     * ========================================
     * QUESTIONS
     * ========================================
     */
    const questionIds =
      await getQuestionIds(
        regionId,
        level,
      );

    if (
      questionIds.length <
      3
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `Chưa có đủ 3 câu hỏi HSK ${level}. ` +
            "Hãy thêm câu hỏi trong trang quản trị.",
        },
        {
          status:
            400,
        },
      );
    }

    /*
     * ========================================
     * REAL PLAYER
     * ========================================
     */
    const realPlayer = {
      user:
        userObjectId,

      displayName:
        currentUser.name,

      /*
       * User schema không có avatar.
       * Match vẫn giữ field này
       * để tương thích frontend.
       */
      avatar:
        "",

      isBot:
        false,

      team:
        "red" as const,

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

    /*
     * ========================================
     * BOT MODE
     * ========================================
     */
    if (
      mode ===
      "bot"
    ) {
      const botMatch =
        await MatchModel.create({
          region:
            regionObjectId,

          level,

          mode,

          teamSize,

          maxPlayers,

          status:
            "in-progress",

          players: [
            realPlayer,

            createBotPlayer(
              "blue",
              0,
            ),
          ],

          questions:
            questionIds,

          redScore:
            0,

          blueScore:
            0,

          redTime:
            0,

          blueTime:
            0,

          winner:
            null,

          startedAt:
            new Date(),
        });

      const populatedBotMatch =
        await populateMatch(
          botMatch._id,
        );

      return NextResponse.json({
        success:
          true,

        alreadyJoined:
          false,

        matchStarted:
          true,

        message:
          "Đã tìm thấy đối thủ máy. Trận đấu bắt đầu!",

        data:
          serializeMatch(
            populatedBotMatch,
            userId,
          ),
      });
    }

    /*
     * ========================================
     * FIND WAITING MATCH
     * ========================================
     */
    const waitingMatch =
      await MatchModel.findOne({
        region:
          regionObjectId,

        level,

        mode,

        status:
          "waiting",

        "players.user": {
          $ne:
            userObjectId,
        },

        $expr: {
          $lt: [
            {
              $size:
                "$players",
            },

            maxPlayers,
          ],
        },
      })
        .sort({
          createdAt:
            1,
        });

    /*
     * Không khai báo `let joinedMatch = null`
     * rồi để TS tự suy luận.
     *
     * Tách từng nhánh để không xuất hiện
     * lỗi `_id does not exist on never`.
     */

    let joinedMatch =
      waitingMatch
        ? await joinExistingWaitingMatch({
            waitingMatchId:
              waitingMatch._id,

            waitingPlayers:
              waitingMatch.players,

            userObjectId,

            realPlayer,

            teamSize,

            maxPlayers,
          })
        : null;

    /*
     * ========================================
     * CREATE WAITING MATCH
     * ========================================
     */
    if (
      !joinedMatch
    ) {
      joinedMatch =
        await MatchModel.create({
          region:
            regionObjectId,

          level,

          mode,

          teamSize,

          maxPlayers,

          status:
            "waiting",

          players: [
            realPlayer,
          ],

          questions:
            questionIds,

          redScore:
            0,

          blueScore:
            0,

          redTime:
            0,

          blueTime:
            0,

          winner:
            null,

          fallbackAt:
            new Date(
              Date.now() +
                15_000,
            ),
        });
    }

    /*
     * ========================================
     * START MATCH IF FULL
     * ========================================
     */
    let matchStarted =
      false;

    if (
      joinedMatch.players.length >=
      maxPlayers
    ) {
      const startedMatch =
        await MatchModel.findOneAndUpdate(
          {
            _id:
              joinedMatch._id,

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

            runValidators:
              true,
          },
        );

      if (
        startedMatch
      ) {
        joinedMatch =
          startedMatch;

        matchStarted =
          true;
      }
    }

    /*
     * ========================================
     * RESPONSE
     * ========================================
     */
    const populatedMatch =
      await populateMatch(
        joinedMatch._id,
      );

    return NextResponse.json({
      success:
        true,

      alreadyJoined:
        false,

      matchStarted,

      message:
        matchStarted
          ? "Đã đủ người. Trận đấu bắt đầu!"
          : `Đã tham gia phòng ${mode}. Hiện có ${joinedMatch.players.length}/${maxPlayers} người chơi.`,

      data:
        serializeMatch(
          populatedMatch,
          userId,
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "POST /api/matchmaking/join:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : "Không thể tham gia hàng chờ ghép trận.",
      },
      {
        status:
          500,
      },
    );
  }
}

/*
 * ========================================
 * JOIN EXISTING WAITING MATCH
 * ========================================
 *
 * Tách thành function riêng để TypeScript
 * không phải suy luận biến joinedMatch
 * qua quá nhiều loại Mongoose result.
 */
async function joinExistingWaitingMatch({
  waitingMatchId,
  waitingPlayers,
  userObjectId,
  realPlayer,
  teamSize,
  maxPlayers,
}: {
  waitingMatchId:
    Types.ObjectId;

  waitingPlayers:
    Array<{
      team?:
        | "red"
        | "blue";
    }>;

  userObjectId:
    Types.ObjectId;

  realPlayer: {
    user:
      Types.ObjectId;

    displayName:
      string;

    avatar:
      string;

    isBot:
      boolean;

    team:
      "red";

    score:
      number;

    correctAnswers:
      number;

    wrongAnswers:
      number;

    totalTime:
      number;

    joinedAt:
      Date;

    isReady:
      boolean;

    disconnected:
      boolean;

    submitted:
      boolean;
  };

  teamSize:
    number;

  maxPlayers:
    number;
}) {
  const redCount =
    waitingPlayers.filter(
      (
        player,
      ) =>
        player.team ===
        "red",
    ).length;

  const blueCount =
    waitingPlayers.filter(
      (
        player,
      ) =>
        player.team ===
        "blue",
    ).length;

  /*
   * Cân bằng số người hai đội.
   */
  const selectedTeam:
    MatchTeam =
      redCount <
      blueCount
        ? "red"
        : blueCount <
            redCount
          ? "blue"
          : Math.random() <
              0.5
            ? "red"
            : "blue";

  return MatchModel.findOneAndUpdate(
    {
      _id:
        waitingMatchId,

      status:
        "waiting",

      "players.user": {
        $ne:
          userObjectId,
      },

      $and: [
        {
          $expr: {
            $lt: [
              {
                $size:
                  "$players",
              },

              maxPlayers,
            ],
          },
        },

        {
          $expr: {
            $lt: [
              {
                $size: {
                  $filter: {
                    input:
                      "$players",

                    as:
                      "player",

                    cond: {
                      $eq: [
                        "$$player.team",
                        selectedTeam,
                      ],
                    },
                  },
                },
              },

              teamSize,
            ],
          },
        },
      ],
    },
    {
      $push: {
        players: {
          ...realPlayer,

          team:
            selectedTeam,
        },
      },
    },
    {
      new:
        true,

      runValidators:
        true,
    },
  );
}