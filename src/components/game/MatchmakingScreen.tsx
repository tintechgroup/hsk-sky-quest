"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import GameBackButton from "@/components/game/GameBackButton";
import { useLanguage } from "@/contexts/LanguageContext";

import type {
  HSKLevel,
} from "@/types/game";

import type {
  Region,
} from "@/types/region";

/*
 * ==========================================
 * TYPES
 * ==========================================
 */

export type ClientMatchMode =
  | "1v1"
  | "3v3"
  | "5v5"
  | "bot";

export interface MatchmakingUser {
  id: string;

  name: string;

  email?: string;

  avatar?: string;
}

export interface MatchmakingPlayer {
  user: MatchmakingUser;

  team:
    | "red"
    | "blue";

  isBot?: boolean;

  botDifficulty?: string;

  score: number;

  correctAnswers: number;

  wrongAnswers: number;

  totalTime: number;

  joinedAt?:
    | string
    | null;

  isReady: boolean;

  disconnected: boolean;

  submitted?: boolean;
}

export interface MatchmakingQuestion {
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

export interface MatchmakingMatch {
  id: string;

  region?: {
    id: string;

    name: string;

    chineseName?: string;

    pinyin?: string;
  };

  level: number;

  mode: ClientMatchMode;

  teamSize: number;

  status:
    | "waiting"
    | "filling-bots"
    | "in-progress"
    | "completed"
    | "cancelled";

  maxPlayers: number;

  playerCount: number;

  humanPlayerCount?: number;

  botPlayerCount?: number;

  waitingForPlayers: number;

  fallbackSeconds?: number;

  /*
   * Backend có thể trả field này
   * khi hết thời gian chờ.
   */
  canOfferBots?: boolean;

  /*
   * Hỗ trợ các tên field khác nếu
   * backend dùng cách đặt tên khác.
   */
  canFillBots?: boolean;

  fallbackExpired?: boolean;

  isFull?: boolean;

  hasStarted?: boolean;

  isCompleted?: boolean;

  currentUserTeam:
    | "red"
    | "blue"
    | null;

  players:
    MatchmakingPlayer[];

  questions:
    MatchmakingQuestion[];

  redScore: number;

  blueScore: number;

  redTime: number;

  blueTime: number;

  winner:
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

  persistedMatchId?:
    | string
    | null;
}

interface MatchmakingResponse {
  success: boolean;

  alreadyJoined?: boolean;

  matchStarted?: boolean;

  hasActiveMatch?: boolean;

  message?: string;

  data?:
    | MatchmakingMatch
    | null;
}

interface SimpleResponse {
  success: boolean;

  message?: string;

  data?:
    | MatchmakingMatch
    | null;
}

interface MatchmakingScreenProps {
  region: Region;

  level: HSKLevel;

  mode: ClientMatchMode;

  onMatchReady: (
    match:
      MatchmakingMatch,
  ) => void;

  onCancel:
    () => void;
}

interface ModeInformation {
  name: string;

  description: string;

  icon: string;

  teamSize: number;

  maxPlayers: number;
}

/*
 * ==========================================
 * CONSTANTS
 * ==========================================
 */

const POLLING_INTERVAL =
  1000;

const DEFAULT_FALLBACK_SECONDS =
  10;

const MODE_INFORMATION: Record<
  ClientMatchMode,
  ModeInformation
> = {
  "1v1": {
    name:
      "Đấu 1 đối 1",

    description:
      "Một người mỗi đội",

    icon:
      "⚔️",

    teamSize:
      1,

    maxPlayers:
      2,
  },

  "3v3": {
    name:
      "Đấu đội 3 đối 3",

    description:
      "Ba người mỗi đội",

    icon:
      "🛡️",

    teamSize:
      3,

    maxPlayers:
      6,
  },

  "5v5": {
    name:
      "Đại chiến 5 đối 5",

    description:
      "Năm người mỗi đội",

    icon:
      "🏆",

    teamSize:
      5,

    maxPlayers:
      10,
  },

  bot: {
    name:
      "Đấu với máy",

    description:
      "Một người đấu với một bot",

    icon:
      "🤖",

    teamSize:
      1,

    maxPlayers:
      2,
  },
};

const MATCHMAKING_TEXT = {
  vi: {
    modeNames: {
      "1v1": "Đấu 1 đối 1",
      "3v3": "Đấu đội 3 đối 3",
      "5v5": "Đại chiến 5 đối 5",
      bot: "Đấu với máy",
    },

    modeDescriptions: {
      "1v1": "Một người mỗi đội",
      "3v3": "Ba người mỗi đội",
      "5v5": "Năm người mỗi đội",
      bot: "Một người đấu với một bot",
    },

    findingBots: "Đang chuẩn bị đối thủ máy...",
    findingPlayers: "Đang tìm những người chơi phù hợp...",
    starting: "Trận đấu đang bắt đầu...",
    cancelledRoom: "Phòng đấu đã bị hủy. Bạn có thể tìm trận mới.",
    fillingBots: "Đang thêm người chơi máy...",
    botOffer: "Chưa đủ người chơi. Bạn có thể tiếp tục chờ hoặc thêm máy.",
    creatingBot: "Đang tạo đối thủ máy...",
    findingRoom: "Đang tìm phòng phù hợp...",
    invalidSession: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.",
    joinFailed: "Không thể tham gia phòng.",
    missingRoom: "Máy chủ không trả về thông tin phòng đấu.",
    joinedQueue: "Đã tham gia hàng chờ.",
    queueJoinFailed: "Không thể tham gia hàng chờ.",
    cannotJoin: "Chưa thể tham gia phòng đấu.",
    expiredSession: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
    updateFailed: "Không thể cập nhật phòng.",
    roomGone: "Phòng đấu không còn tồn tại. Bạn có thể tìm lại trận mới.",
    disconnected: "Mất kết nối với phòng.",
    addBotFailed: "Không thể thêm người chơi máy.",
    preparingMatch: "Đang chuẩn bị trận đấu...",
    continueFailed: "Không thể tiếp tục chờ.",
    continuing: "Tiếp tục tìm người chơi thật...",
    leaveFailed: "Không thể rời phòng.",
    retrying: "Đang thử lại...",
    retry: "Thử lại",
    backToMode: "Quay lại chọn chế độ",
    preparingOpponent: "Đang chuẩn bị đối thủ",
    findingOpponent: "Đang tìm người chơi",
    roomStatus: "Trạng thái phòng",
    errorTitle: "Không thể ghép trận",
    offerBotsIn: "Đề nghị thêm máy sau",
    canAddBots: "Có thể thêm người chơi máy",
    ready: "Sẵn sàng",
    connectionFilling: "Đang thêm người chơi máy",
    connectionStarting: "Đang chuyển vào trận đấu",
    connectionPolling: "Đang cập nhật phòng",
    connectionLoading: "Đang kết nối máy chủ",
    connectionConnected: "Tự động cập nhật mỗi 1 giây",
    connectionNotJoined: "Chưa tham gia phòng",
    redTeam: "Đội Đỏ",
    blueTeam: "Đội Xanh",
    teamPlayers: "người chơi",
    findingPlayer: "Đang tìm người chơi",
    emptySlot: "Vị trí còn trống",
    cannotMatch: "Không thể ghép trận",
    leaving: "Đang rời phòng...",
    leaveQueue: "Rời hàng chờ",
    botOfferLabel: "Chưa đủ người chơi",
    botOfferTitle: "Thêm máy vào trận?",
    botOfferDescription:
      "Hiện chưa tìm đủ người chơi thật. Bạn có thể thêm người chơi máy để bắt đầu ngay hoặc tiếp tục chờ.",
    processing: "Đang xử lý...",
    playBots: "🤖 Đấu với máy",
    continueWaiting: "👥 Tiếp tục chờ người thật",
    botPlayer: "Người chơi máy",
    humanPlayer: "Người chơi thật",
    disconnectedPlayer: "Mất kết nối",
    waiting: "Đang chờ",
    teamVs: "đấu",
    fallbackSeconds: "giây",
  },

  zh: {
    modeNames: {
      "1v1": "一对一对战",
      "3v3": "三对三团队赛",
      "5v5": "五对五大战",
      bot: "人机对战",
    },

    modeDescriptions: {
      "1v1": "每队一名玩家",
      "3v3": "每队三名玩家",
      "5v5": "每队五名玩家",
      bot: "一名玩家对战一台电脑",
    },

    findingBots: "正在准备电脑对手...",
    findingPlayers: "正在寻找合适的玩家...",
    starting: "比赛即将开始...",
    cancelledRoom: "比赛房间已取消，你可以重新匹配。",
    fillingBots: "正在添加电脑玩家...",
    botOffer: "玩家人数不足。你可以继续等待或添加电脑玩家。",
    creatingBot: "正在创建电脑对手...",
    findingRoom: "正在寻找合适的房间...",
    invalidSession: "登录状态无效，请重新登录。",
    joinFailed: "无法加入房间。",
    missingRoom: "服务器未返回比赛房间信息。",
    joinedQueue: "已加入等待队列。",
    queueJoinFailed: "无法加入等待队列。",
    cannotJoin: "暂时无法加入比赛房间。",
    expiredSession: "登录已过期，请重新登录。",
    updateFailed: "无法更新房间信息。",
    roomGone: "比赛房间已不存在，你可以重新匹配。",
    disconnected: "与房间的连接已断开。",
    addBotFailed: "无法添加电脑玩家。",
    preparingMatch: "正在准备比赛...",
    continueFailed: "无法继续等待。",
    continuing: "继续等待真实玩家...",
    leaveFailed: "无法离开房间。",
    retrying: "正在重试...",
    retry: "重试",
    backToMode: "返回选择模式",
    preparingOpponent: "正在准备对手",
    findingOpponent: "正在寻找玩家",
    roomStatus: "房间状态",
    errorTitle: "无法匹配比赛",
    offerBotsIn: "后可添加电脑玩家",
    canAddBots: "现在可以添加电脑玩家",
    ready: "已准备",
    connectionFilling: "正在添加电脑玩家",
    connectionStarting: "正在进入比赛",
    connectionPolling: "正在更新房间",
    connectionLoading: "正在连接服务器",
    connectionConnected: "每秒自动更新",
    connectionNotJoined: "尚未加入房间",
    redTeam: "红队",
    blueTeam: "蓝队",
    teamPlayers: "名玩家",
    findingPlayer: "正在寻找玩家",
    emptySlot: "空缺位置",
    cannotMatch: "无法匹配比赛",
    leaving: "正在离开房间...",
    leaveQueue: "退出等待队列",
    botOfferLabel: "玩家人数不足",
    botOfferTitle: "添加电脑玩家？",
    botOfferDescription:
      "暂时没有足够的真实玩家。你可以添加电脑玩家立即开始，也可以继续等待。",
    processing: "正在处理...",
    playBots: "🤖 与电脑对战",
    continueWaiting: "👥 继续等待真实玩家",
    botPlayer: "电脑玩家",
    humanPlayer: "真实玩家",
    disconnectedPlayer: "已断开连接",
    waiting: "等待中",
    teamVs: "对战",
    fallbackSeconds: "秒",
  },
} as const;

type MatchmakingLanguage =
  keyof typeof MATCHMAKING_TEXT;

const KNOWN_MATCH_MESSAGES: Record<string, string> = {
  "Đang chuẩn bị đối thủ máy...":
    MATCHMAKING_TEXT.zh.findingBots,

  "Đang tìm những người chơi phù hợp...":
    MATCHMAKING_TEXT.zh.findingPlayers,

  "Trận đấu đang bắt đầu...":
    MATCHMAKING_TEXT.zh.starting,

  "Phòng đấu đã bị hủy. Bạn có thể tìm trận mới.":
    MATCHMAKING_TEXT.zh.cancelledRoom,

  "Đang thêm người chơi máy...":
    MATCHMAKING_TEXT.zh.fillingBots,

  "Chưa đủ người chơi. Bạn có thể tiếp tục chờ hoặc thêm máy.":
    MATCHMAKING_TEXT.zh.botOffer,

  "Đang tạo đối thủ máy...":
    MATCHMAKING_TEXT.zh.creatingBot,

  "Đang tìm phòng phù hợp...":
    MATCHMAKING_TEXT.zh.findingRoom,

  "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.":
    MATCHMAKING_TEXT.zh.invalidSession,

  "Không thể tham gia phòng.":
    MATCHMAKING_TEXT.zh.joinFailed,

  "Máy chủ không trả về thông tin phòng đấu.":
    MATCHMAKING_TEXT.zh.missingRoom,

  "Đã tham gia hàng chờ.":
    MATCHMAKING_TEXT.zh.joinedQueue,

  "Không thể tham gia hàng chờ.":
    MATCHMAKING_TEXT.zh.queueJoinFailed,

  "Chưa thể tham gia phòng đấu.":
    MATCHMAKING_TEXT.zh.cannotJoin,

  "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.":
    MATCHMAKING_TEXT.zh.expiredSession,

  "Không thể cập nhật phòng.":
    MATCHMAKING_TEXT.zh.updateFailed,

  "Phòng đấu không còn tồn tại. Bạn có thể tìm lại trận mới.":
    MATCHMAKING_TEXT.zh.roomGone,

  "Mất kết nối với phòng.":
    MATCHMAKING_TEXT.zh.disconnected,

  "Không thể thêm người chơi máy.":
    MATCHMAKING_TEXT.zh.addBotFailed,

  "Đang chuẩn bị trận đấu...":
    MATCHMAKING_TEXT.zh.preparingMatch,

  "Không thể tiếp tục chờ.":
    MATCHMAKING_TEXT.zh.continueFailed,

  "Tiếp tục tìm người chơi thật...":
    MATCHMAKING_TEXT.zh.continuing,

  "Không thể rời phòng.":
    MATCHMAKING_TEXT.zh.leaveFailed,
};

function localizeMatchMessage(
  message: string,
  language: MatchmakingLanguage,
) {
  return language === "zh"
    ? KNOWN_MATCH_MESSAGES[message] ?? message
    : message;
}

/*
 * ==========================================
 * COMPONENT
 * ==========================================
 */

export default function MatchmakingScreen({
  region,
  level,
  mode,
  onMatchReady,
  onCancel,
}: MatchmakingScreenProps) {
  const { language } = useLanguage();

  const currentLanguage: MatchmakingLanguage =
    language === "zh" ? "zh" : "vi";

  const ui =
    MATCHMAKING_TEXT[currentLanguage];

  const localizedRegionName =
    currentLanguage === "zh"
      ? region.chineseName || region.name
      : region.name;

  const uiRef = useRef(ui);

  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  const modeInformation = {
    ...MODE_INFORMATION[mode],
    name: ui.modeNames[mode],
    description: ui.modeDescriptions[mode],
  };

  const [
    match,
    setMatch,
  ] =
    useState<
      MatchmakingMatch | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    polling,
    setPolling,
  ] =
    useState(false);

  const [
    leaving,
    setLeaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    statusMessage,
    setStatusMessage,
  ] =
    useState(
      mode === "bot"
        ? ui.findingBots
        : ui.findingPlayers,
    );

  const [
    botOfferVisible,
    setBotOfferVisible,
  ] =
    useState(false);

  const [
    botActionLoading,
    setBotActionLoading,
  ] =
    useState(false);

  /*
   * ========================================
   * REFS
   * ========================================
   */

  const mountedRef =
    useRef(true);

  const pollingRef =
    useRef(false);

  const joiningRef =
    useRef(false);

  const matchReadyCalledRef =
    useRef(false);

  const matchIdRef =
    useRef<
      string | null
    >(null);

  const transitionTimerRef =
    useRef<
      number | null
    >(null);

  const onMatchReadyRef =
    useRef(
      onMatchReady,
    );

  /*
   * Lưu callback mới nhất mà không cần
   * khởi tạo lại matchmaking.
   */
  useEffect(() => {
    onMatchReadyRef.current =
      onMatchReady;
  }, [
    onMatchReady,
  ]);

  /*
   * ========================================
   * HANDLE MATCH DATA
   * ========================================
   */

  const handleMatchData =
    useCallback(
      (
        matchData:
          | MatchmakingMatch
          | null
          | undefined,
      ) => {
        if (
          !matchData ||
          !mountedRef.current
        ) {
          return;
        }

        matchIdRef.current =
          matchData.id;

        setMatch(
          matchData,
        );

        /*
         * Trận đã bắt đầu.
         */
        if (
          matchData.status ===
            "in-progress" ||
          matchData.hasStarted ===
            true
        ) {
          setBotOfferVisible(
            false,
          );

          setStatusMessage(
            uiRef.current.starting,
          );

          if (
            matchReadyCalledRef.current
          ) {
            return;
          }

          matchReadyCalledRef.current =
            true;

          if (
            transitionTimerRef.current !==
            null
          ) {
            window.clearTimeout(
              transitionTimerRef.current,
            );
          }

          transitionTimerRef.current =
            window.setTimeout(
              () => {
                if (
                  mountedRef.current
                ) {
                  onMatchReadyRef.current(
                    matchData,
                  );
                }
              },
              500,
            );

          return;
        }

        /*
         * Phòng bị hủy.
         */
        if (
          matchData.status ===
          "cancelled"
        ) {
          setBotOfferVisible(
            false,
          );

          setError(
            uiRef.current.cancelledRoom,
          );

          return;
        }

        /*
         * Backend đang thêm bot.
         */
        if (
          matchData.status ===
          "filling-bots"
        ) {
          setBotOfferVisible(
            false,
          );

          setStatusMessage(
            uiRef.current.fillingBots,
          );

          return;
        }

        /*
         * Chỉ mở popup đề nghị bot cho
         * các mode PvP.
         */
        if (
          mode !== "bot" &&
          matchData.status ===
            "waiting"
        ) {
          const fallbackSeconds =
            matchData.fallbackSeconds ??
            DEFAULT_FALLBACK_SECONDS;

          const serverAllowsBots =
            matchData.canOfferBots === true ||
            matchData.canFillBots === true ||
            matchData.fallbackExpired === true ||
            fallbackSeconds <= 0;

          if (
            serverAllowsBots
          ) {
            setBotOfferVisible(
              true,
            );

            setStatusMessage(
              uiRef.current.botOffer,
            );
          } else {
            setBotOfferVisible(
              false,
            );
          }
        } else {
          setBotOfferVisible(
            false,
          );
        }
      },
      [
        mode,
      ],
    );

  /*
   * ========================================
   * JOIN MATCH
   * ========================================
   */

  const joinMatch =
    useCallback(
      async () => {
        if (
          joiningRef.current
        ) {
          return;
        }

        joiningRef.current =
          true;

        setLoading(
          true,
        );

        setError(
          "",
        );

        setStatusMessage(
          mode === "bot"
            ? uiRef.current.creatingBot
            : uiRef.current.findingRoom,
        );

        try {
          const response =
            await fetch(
              "/api/matchmaking",
              {
                method: "POST",
                credentials: "include",
                cache: "no-store",

                headers: {
                  "Content-Type":
                    "application/json",
                  Accept:
                    "application/json",
                },

                body: JSON.stringify({
                  action: "join",
                  regionId: region.id,
                  level,
                  mode,
                }),
              },
            );

          const result =
            (await response
              .json()
              .catch(() => null)) as
              | MatchmakingResponse
              | null;

          if (
            response.status === 401
          ) {
            throw new Error(
              uiRef.current.invalidSession,
            );
          }

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                uiRef.current.joinFailed,
            );
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          if (
            !result.data
          ) {
            throw new Error(
              uiRef.current.missingRoom,
            );
          }

          setStatusMessage(
            result.message ||
              uiRef.current.joinedQueue,
          );

          handleMatchData(
            result.data,
          );
        } catch (
          joinError
        ) {
          console.warn(
            "Không thể tìm trận:",
            joinError,
          );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setError(
            joinError instanceof Error
              ? joinError.message
              : uiRef.current.queueJoinFailed,
          );

          setStatusMessage(
            uiRef.current.cannotJoin,
          );
        } finally {
          joiningRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        handleMatchData,
        level,
        mode,
        region.id,
      ],
    );

  /*
   * ========================================
   * GET MATCH STATUS
   * ========================================
   */

  const checkMatchStatus =
    useCallback(
      async () => {
        const currentMatchId =
          matchIdRef.current;

        if (
          !currentMatchId ||
          pollingRef.current ||
          matchReadyCalledRef.current
        ) {
          return;
        }

        pollingRef.current =
          true;

        setPolling(true);

        try {
          const response =
            await fetch(
              `/api/matchmaking?matchId=${encodeURIComponent(
                currentMatchId,
              )}`,
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",

                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const result =
            (await response
              .json()
              .catch(() => null)) as
              | MatchmakingResponse
              | null;

          if (
            response.status === 401
          ) {
            throw new Error(
              uiRef.current.expiredSession,
            );
          }

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                uiRef.current.updateFailed,
            );
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          if (
            result.hasActiveMatch ===
              false &&
            !result.data
          ) {
            setError(
              uiRef.current.roomGone,
            );

            setMatch(null);

            matchIdRef.current =
              null;

            setBotOfferVisible(false);

            return;
          }

          setError("");

          if (
            result.message
          ) {
            setStatusMessage(
              result.message,
            );
          }

          handleMatchData(
            result.data,
          );
        } catch (
          statusError
        ) {
          console.warn(
            "Không thể cập nhật trạng thái:",
            statusError,
          );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setError(
            statusError instanceof Error
              ? statusError.message
              : uiRef.current.disconnected,
          );
        } finally {
          pollingRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setPolling(false);
          }
        }
      },
      [
        handleMatchData,
      ],
    );

  /*
   * ========================================
   * INITIAL JOIN
   * ========================================
   *
   * Schedule gọi joinMatch qua setTimeout
   * để tránh set-state-in-effect.
   */

  useEffect(() => {
    mountedRef.current =
      true;

    matchReadyCalledRef.current =
      false;

    matchIdRef.current =
      null;

    const initialJoin =
      window.setTimeout(
        () => {
          void joinMatch();
        },
        0,
      );

    return () => {
      mountedRef.current =
        false;

      pollingRef.current =
        false;

      window.clearTimeout(
        initialJoin,
      );

      if (
        transitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );

        transitionTimerRef.current =
          null;
      }
    };
  }, [
    joinMatch,
  ]);

  /*
   * ========================================
   * POLLING
   * ========================================
   */

  const currentMatchId =
    match?.id ??
    null;

  useEffect(() => {
    if (
      loading ||
      !currentMatchId ||
      matchReadyCalledRef.current
    ) {
      return;
    }

    const firstCheck =
      window.setTimeout(
        () => {
          void checkMatchStatus();
        },
        0,
      );

    const timer =
      window.setInterval(
        () => {
          void checkMatchStatus();
        },
        POLLING_INTERVAL,
      );

    return () => {
      window.clearTimeout(
        firstCheck,
      );

      window.clearInterval(
        timer,
      );
    };
  }, [
    checkMatchStatus,
    currentMatchId,
    loading,
  ]);

  /*
   * ========================================
   * FILL WITH BOTS
   * ========================================
   */

  async function fillWithBots() {
    const activeMatchId =
      matchIdRef.current;

    if (
      !activeMatchId ||
      botActionLoading
    ) {
      return;
    }

    try {
      setBotActionLoading(true);
      setError("");

      setStatusMessage(
        uiRef.current.fillingBots,
      );

      const response =
        await fetch(
          "/api/matchmaking",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              action: "fill-bots",
              matchId: activeMatchId,
            }),
          },
        );

      const result =
        (await response
          .json()
          .catch(() => null)) as
          | SimpleResponse
          | null;

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            uiRef.current.addBotFailed,
        );
      }

      if (
        !mountedRef.current
      ) {
        return;
      }

      setBotOfferVisible(false);

      setStatusMessage(
        result.message ||
          uiRef.current.preparingMatch,
      );

      handleMatchData(
        result.data,
      );
    } catch (
      fillError
    ) {
      console.warn(
        "Không thể thêm bot:",
        fillError,
      );

      if (
        !mountedRef.current
      ) {
        return;
      }

      setError(
        fillError instanceof Error
          ? fillError.message
          : uiRef.current.addBotFailed,
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setBotActionLoading(false);
      }
    }
  }

  /*
   * ========================================
   * CONTINUE WAITING
   * ========================================
   */

  async function continueWaiting() {
    const activeMatchId =
      matchIdRef.current;

    if (
      !activeMatchId ||
      botActionLoading
    ) {
      return;
    }

    try {
      setBotActionLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/matchmaking",
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body: JSON.stringify({
              action: "continue-waiting",
              matchId: activeMatchId,
            }),
          },
        );

      const result =
        (await response
          .json()
          .catch(() => null)) as
          | SimpleResponse
          | null;

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            uiRef.current.continueFailed,
        );
      }

      if (
        !mountedRef.current
      ) {
        return;
      }

      setBotOfferVisible(false);

      setStatusMessage(
        result.message ||
          uiRef.current.continuing,
      );

      handleMatchData(
        result.data,
      );
    } catch (
      waitError
    ) {
      console.warn(
        "Không thể tiếp tục chờ:",
        waitError,
      );

      if (
        !mountedRef.current
      ) {
        return;
      }

      setError(
        waitError instanceof Error
          ? waitError.message
          : uiRef.current.continueFailed,
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setBotActionLoading(false);
      }
    }
  }

  /*
   * ========================================
   * LEAVE MATCH
   * ========================================
   */

  async function leaveMatch() {
    if (
      leaving ||
      matchReadyCalledRef.current
    ) {
      return;
    }

    setLeaving(true);
    setError("");

    try {
      const activeMatchId =
        matchIdRef.current;

      if (
        activeMatchId
      ) {
        const response =
          await fetch(
            "/api/matchmaking",
            {
              method: "POST",
              credentials: "include",
              cache: "no-store",

              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },

              body: JSON.stringify({
                action: "leave",
                matchId: activeMatchId,
              }),
            },
          );

        const result =
          (await response
            .json()
            .catch(() => null)) as
            | SimpleResponse
            | null;

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              uiRef.current.leaveFailed,
          );
        }
      }

      setBotOfferVisible(false);

      matchIdRef.current =
        null;

      onCancel();
    } catch (
      leaveError
    ) {
      console.warn(
        "Không thể rời phòng:",
        leaveError,
      );

      if (
        !mountedRef.current
      ) {
        return;
      }

      setError(
        leaveError instanceof Error
          ? leaveError.message
          : uiRef.current.leaveFailed,
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setLeaving(false);
      }
    }
  }

  /*
   * ========================================
   * RETRY CONNECTION
   * ========================================
   */

  function retryConnection() {
    setError("");

    if (
      matchIdRef.current
    ) {
      void checkMatchStatus();
      return;
    }

    void joinMatch();
  }

  /*
   * ========================================
   * VIEW DATA
   * ========================================
   */

  const players =
    match?.players ??
    [];

  const redPlayers =
    players.filter(
      (player) =>
        player.team === "red",
    );

  const bluePlayers =
    players.filter(
      (player) =>
        player.team === "blue",
    );

  const playerCount =
    match?.playerCount ??
    players.length;

  const maxPlayers =
    match?.maxPlayers ??
    modeInformation.maxPlayers;

  const teamSize =
    match?.teamSize ??
    modeInformation.teamSize;

  const progress =
    maxPlayers > 0
      ? Math.min(
          100,
          (playerCount / maxPlayers) * 100,
        )
      : 0;

  const fallbackSeconds =
    Math.max(
      0,
      match?.fallbackSeconds ??
        DEFAULT_FALLBACK_SECONDS,
    );

  const matchStarting =
    match?.status === "in-progress" ||
    match?.hasStarted === true;

  const fillingBots =
    match?.status === "filling-bots";

  const canLeave =
    !leaving &&
    !matchStarting &&
    !fillingBots &&
    !botActionLoading;

  /*
   * ========================================
   * RENDER
   * ========================================
   */

  return (
    <section
      lang={currentLanguage === "zh" ? "zh-CN" : "vi"}
      className="relative min-h-[620px] overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-[#102f46] via-[#0a2235] to-[#061522] px-3 pb-6 pt-20 shadow-[0_30px_80px_rgba(0,8,20,0.5)] sm:min-h-[700px] sm:rounded-[30px] sm:px-7 sm:pb-8 sm:pt-24 lg:px-10 lg:pb-10"
    >
      {/* BACKGROUND */}

      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-blue-400/10 blur-3xl" />

      {/* BACK */}

      <GameBackButton
        label={ui.backToMode}
        position="absolute"
        disabled={!canLeave}
        onClick={() => {
          void leaveMatch();
        }}
      />

      <div className="relative z-10">
        {/* HEADER */}

        <header className="text-center">
          <span className="inline-flex max-w-full items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300 sm:px-4 sm:text-xs sm:tracking-[0.18em]">
            {modeInformation.icon} {modeInformation.name}
          </span>

          <h1 className="mt-4 text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            {mode === "bot"
              ? ui.preparingOpponent
              : ui.findingOpponent}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            HSK {level} · {localizedRegionName}
            {currentLanguage === "vi" && region.chineseName
              ? ` · ${region.chineseName}`
              : ""}
          </p>
        </header>

        {/* ROOM STATUS */}

        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-black/10 p-4 sm:mt-8 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500 sm:text-[10px]">
                {ui.roomStatus}
              </span>

              <strong className="mt-1 block text-xs leading-relaxed text-white sm:text-base">
                {localizeMatchMessage(statusMessage, currentLanguage)}
              </strong>
            </div>

            <strong className="shrink-0 text-xl font-black text-amber-300 sm:text-3xl">
              {playerCount}/{maxPlayers}
            </strong>
          </div>

          {/* PROGRESS */}

          <div className="h-2.5 overflow-hidden rounded-full bg-white/10 sm:h-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          {/* FALLBACK */}

          {mode !== "bot" &&
            !matchStarting &&
            !fillingBots && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-xs text-slate-400">
                  {fallbackSeconds > 0
                    ? ui.offerBotsIn
                    : ui.canAddBots}
                </span>

                <strong className="text-sm text-amber-300">
                  {fallbackSeconds > 0
                    ? `${fallbackSeconds} ${ui.fallbackSeconds}`
                    : ui.ready}
                </strong>
              </div>
            )}

          {/* CONNECTION STATE */}

          <div className="mt-3 flex items-center justify-center gap-2">
            <span
              className={`size-2.5 shrink-0 rounded-full ${
                matchStarting
                  ? "bg-amber-300"
                  : error
                    ? "bg-red-300"
                    : "animate-pulse bg-emerald-300"
              }`}
            />

            <span className="text-center text-[11px] font-bold text-slate-400 sm:text-xs">
              {fillingBots
                ? ui.connectionFilling
                : matchStarting
                  ? ui.connectionStarting
                  : polling
                    ? ui.connectionPolling
                    : loading
                      ? ui.connectionLoading
                      : match
                        ? ui.connectionConnected
                        : ui.connectionNotJoined}
            </span>
          </div>
        </div>

        {/* TEAMS */}

        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 items-stretch gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <TeamWaitingCard
            name={ui.redTeam}
            icon="🦅"
            color="red"
            players={redPlayers}
            slotCount={teamSize}
            language={currentLanguage}
          />

          <div className="flex flex-row items-center justify-center gap-3 py-1 lg:flex-col lg:py-0">
            <div className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-amber-300/30 bg-amber-300/10 text-xl font-black text-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.14)] sm:size-20 sm:text-3xl">
              VS
            </div>

            <span className="text-xs font-bold uppercase text-slate-500">
              {teamSize} {ui.teamVs} {teamSize}
            </span>
          </div>

          <TeamWaitingCard
            name={ui.blueTeam}
            icon="🐉"
            color="blue"
            players={bluePlayers}
            slotCount={teamSize}
            language={currentLanguage}
          />
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mx-auto mt-5 max-w-2xl rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-100"
          >
            <strong className="block">
              {ui.errorTitle}
            </strong>

            <p className="mt-1 break-words leading-relaxed text-red-100/80">
              {localizeMatchMessage(error, currentLanguage)}
            </p>

            <button
              type="button"
              onClick={retryConnection}
              disabled={loading || polling}
              className="mt-3 min-h-11 w-full rounded-xl bg-red-200 px-4 font-black text-red-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading || polling
                ? ui.retrying
                : ui.retry}
            </button>
          </div>
        )}

        {/* LEAVE */}

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!canLeave}
            onClick={() => {
              void leaveMatch();
            }}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-bold text-slate-300 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {leaving
              ? ui.leaving
              : match
                ? ui.leaveQueue
                : ui.backToMode}
          </button>
        </div>
      </div>

      {/* BOT OFFER MODAL */}

      {botOfferVisible &&
        mode !== "bot" &&
        !matchStarting && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[28px] border border-amber-300/20 bg-[#0b2235] p-5 text-center shadow-2xl sm:p-7">
              <div className="mx-auto grid size-20 place-items-center rounded-full border border-amber-300/20 bg-amber-300/10 text-4xl">
                🤖
              </div>

              <span className="mt-5 block text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                {ui.botOfferLabel}
              </span>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                {ui.botOfferTitle}
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                {ui.botOfferDescription}
              </p>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  disabled={botActionLoading}
                  onClick={() => {
                    void fillWithBots();
                  }}
                  className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-[#312108] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {botActionLoading
                    ? ui.processing
                    : ui.playBots}
                </button>

                <button
                  type="button"
                  disabled={botActionLoading}
                  onClick={() => {
                    void continueWaiting();
                  }}
                  className="min-h-12 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-5 font-black text-emerald-200 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ui.continueWaiting}
                </button>

                <button
                  type="button"
                  disabled={botActionLoading || leaving}
                  onClick={() => {
                    void leaveMatch();
                  }}
                  className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← {ui.backToMode}
                </button>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}

/*
 * ==========================================
 * TEAM WAITING CARD
 * ==========================================
 */

function TeamWaitingCard({
  name,
  icon,
  color,
  players,
  slotCount,
  language,
}: {
  name: string;
  icon: string;
  color: "red" | "blue";
  players: MatchmakingPlayer[];
  slotCount: number;
  language: MatchmakingLanguage;
}) {
  const ui = MATCHMAKING_TEXT[language];

  const emptySlots = Math.max(
    0,
    slotCount - players.length,
  );

  const colorClass =
    color === "red"
      ? "border-red-300/20 bg-red-400/5"
      : "border-blue-300/20 bg-blue-400/5";

  const titleColor =
    color === "red"
      ? "text-red-300"
      : "text-blue-300";

  return (
    <article
      className={`min-w-0 rounded-2xl border p-4 sm:rounded-3xl sm:p-5 ${colorClass}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl">
            {icon}
          </div>

          <div className="min-w-0">
            <span
              className={`block text-[10px] font-black uppercase tracking-widest ${titleColor}`}
            >
              {name}
            </span>

            <strong className="block text-sm text-white">
              {players.length}/{slotCount} {ui.teamPlayers}
            </strong>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {players.map((player, index) => (
          <PlayerSlot
            key={`${player.user.id}-${player.team}-${index}`}
            player={player}
            color={color}
            language={language}
          />
        ))}

        {Array.from({
          length: emptySlots,
        }).map((_, index) => (
          <div
            key={`empty-${color}-${index}`}
            className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-3"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/5 text-sm text-slate-600">
              ?
            </div>

            <div className="min-w-0">
              <strong className="block truncate text-xs text-slate-500">
                {ui.findingPlayer}
              </strong>

              <span className="block truncate text-[10px] text-slate-600">
                {ui.emptySlot}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

/*
 * ==========================================
 * PLAYER SLOT
 * ==========================================
 */

function PlayerSlot({
  player,
  color,
  language,
}: {
  player: MatchmakingPlayer;
  color: "red" | "blue";
  language: MatchmakingLanguage;
}) {
  const ui = MATCHMAKING_TEXT[language];

  const avatar =
    player.user.avatar?.trim() ||
    "";

  const fallbackAvatar =
    player.isBot
      ? "🤖"
      : "👤";

  return (
    <div className="flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3">
      <div
        className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-full ${
          color === "red"
            ? "bg-red-300/15"
            : "bg-blue-300/15"
        }`}
      >
        {avatar.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={player.user.name}
            className="size-full object-cover"
          />
        ) : (
          <span>{avatar || fallbackAvatar}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-white">
          {player.user.name}
        </strong>

        <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {player.isBot
            ? ui.botPlayer
            : ui.humanPlayer}
        </span>
      </div>

      <span className="hidden shrink-0 rounded-full bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-300 sm:inline-flex">
        {player.disconnected
          ? ui.disconnectedPlayer
          : player.isReady
            ? ui.ready
            : ui.waiting}
      </span>
    </div>
  );
}