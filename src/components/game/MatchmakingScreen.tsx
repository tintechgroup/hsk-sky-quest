"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import GameBackButton from "@/components/game/GameBackButton";

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
  const modeInformation =
    MODE_INFORMATION[
      mode
    ];

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
      mode ===
        "bot"
        ? "Đang chuẩn bị đối thủ máy..."
        : "Đang tìm những người chơi phù hợp...",
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
            "Trận đấu đang bắt đầu...",
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
            "Phòng đấu đã bị hủy. Bạn có thể tìm trận mới.",
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
            "Đang thêm người chơi máy...",
          );

          return;
        }

        /*
         * Chỉ mở popup đề nghị bot cho
         * các mode PvP.
         */
        if (
          mode !==
            "bot" &&
          matchData.status ===
            "waiting"
        ) {
          const fallbackSeconds =
            matchData.fallbackSeconds ??
            DEFAULT_FALLBACK_SECONDS;

          const serverAllowsBots =
            matchData.canOfferBots ===
              true ||
            matchData.canFillBots ===
              true ||
            matchData.fallbackExpired ===
              true ||
            fallbackSeconds <=
              0;

          if (
            serverAllowsBots
          ) {
            setBotOfferVisible(
              true,
            );

            setStatusMessage(
              "Chưa đủ người chơi. Bạn có thể tiếp tục chờ hoặc thêm máy.",
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
          mode ===
            "bot"
            ? "Đang tạo đối thủ máy..."
            : "Đang tìm phòng phù hợp...",
        );

        try {
          /*
           * Unified matchmaking API.
           */
          const response =
            await fetch(
              "/api/matchmaking",
              {
                method:
                  "POST",

                credentials:
                  "include",

                cache:
                  "no-store",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action:
                      "join",

                    regionId:
                      region.id,

                    level,

                    mode,
                  }),
              },
            );

          const result =
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | MatchmakingResponse
              | null;

          if (
            response.status ===
            401
          ) {
            throw new Error(
              "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.",
            );
          }

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                "Không thể tham gia phòng.",
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
              "Máy chủ không trả về thông tin phòng đấu.",
            );
          }

          setStatusMessage(
            result.message ||
              "Đã tham gia hàng chờ.",
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
            joinError instanceof
            Error
              ? joinError.message
              : "Không thể tham gia hàng chờ.",
          );

          setStatusMessage(
            "Chưa thể tham gia phòng đấu.",
          );
        } finally {
          joiningRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setLoading(
              false,
            );
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

        setPolling(
          true,
        );

        try {
          const response =
            await fetch(
              `/api/matchmaking?matchId=${encodeURIComponent(
                currentMatchId,
              )}`,
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",

                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const result =
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | MatchmakingResponse
              | null;

          if (
            response.status ===
            401
          ) {
            throw new Error(
              "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
            );
          }

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                "Không thể cập nhật phòng.",
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
              "Phòng đấu không còn tồn tại. Bạn có thể tìm lại trận mới.",
            );

            setMatch(
              null,
            );

            matchIdRef.current =
              null;

            setBotOfferVisible(
              false,
            );

            return;
          }

          setError(
            "",
          );

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
            statusError instanceof
            Error
              ? statusError.message
              : "Mất kết nối với phòng.",
          );
        } finally {
          pollingRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setPolling(
              false,
            );
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
   * Quan trọng:
   * Không gọi joinMatch() đồng bộ trực tiếp
   * trong effect vì React ESLint mới có thể
   * báo react-hooks/set-state-in-effect.
   *
   * Schedule nó qua setTimeout.
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
        transitionTimerRef.current !==
        null
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

    /*
     * Kiểm tra ngay một lần nhưng vẫn qua
     * setTimeout để tránh set-state-in-effect.
     */
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
      setBotActionLoading(
        true,
      );

      setError(
        "",
      );

      setStatusMessage(
        "Đang thêm người chơi máy...",
      );

      const response =
        await fetch(
          "/api/matchmaking",
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "fill-bots",

                matchId:
                  activeMatchId,
              }),
          },
        );

      const result =
        (await response
          .json()
          .catch(
            () =>
              null,
          )) as
          | SimpleResponse
          | null;

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Không thể thêm người chơi máy.",
        );
      }

      if (
        !mountedRef.current
      ) {
        return;
      }

      setBotOfferVisible(
        false,
      );

      setStatusMessage(
        result.message ||
          "Đang chuẩn bị trận đấu...",
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
        fillError instanceof
        Error
          ? fillError.message
          : "Không thể thêm người chơi máy.",
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setBotActionLoading(
          false,
        );
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
      setBotActionLoading(
        true,
      );

      setError(
        "",
      );

      const response =
        await fetch(
          "/api/matchmaking",
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "continue-waiting",

                matchId:
                  activeMatchId,
              }),
          },
        );

      const result =
        (await response
          .json()
          .catch(
            () =>
              null,
          )) as
          | SimpleResponse
          | null;

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Không thể tiếp tục chờ.",
        );
      }

      if (
        !mountedRef.current
      ) {
        return;
      }

      setBotOfferVisible(
        false,
      );

      setStatusMessage(
        result.message ||
          "Tiếp tục tìm người chơi thật...",
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
        waitError instanceof
        Error
          ? waitError.message
          : "Không thể tiếp tục chờ.",
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setBotActionLoading(
          false,
        );
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

    setLeaving(
      true,
    );

    setError(
      "",
    );

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
              method:
                "POST",

              credentials:
                "include",

              cache:
                "no-store",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  action:
                    "leave",

                  matchId:
                    activeMatchId,
                }),
            },
          );

        const result =
          (await response
            .json()
            .catch(
              () =>
                null,
            )) as
            | SimpleResponse
            | null;

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              "Không thể rời phòng.",
          );
        }
      }

      setBotOfferVisible(
        false,
      );

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
        leaveError instanceof
        Error
          ? leaveError.message
          : "Không thể rời phòng.",
      );
    } finally {
      if (
        mountedRef.current
      ) {
        setLeaving(
          false,
        );
      }
    }
  }

  /*
   * ========================================
   * RETRY CONNECTION
   * ========================================
   */
  function retryConnection() {
    setError(
      "",
    );

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
    maxPlayers >
    0
      ? Math.min(
          100,

          (
            playerCount /
            maxPlayers
          ) *
            100,
        )
      : 0;

  const fallbackSeconds =
    Math.max(
      0,

      match?.fallbackSeconds ??
        DEFAULT_FALLBACK_SECONDS,
    );

  const matchStarting =
    match?.status ===
      "in-progress" ||
    match?.hasStarted ===
      true;

  const fillingBots =
    match?.status ===
    "filling-bots";

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
    <section className="relative min-h-[620px] overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-[#102f46] via-[#0a2235] to-[#061522] px-3 pb-6 pt-20 shadow-[0_30px_80px_rgba(0,8,20,0.5)] sm:min-h-[700px] sm:rounded-[30px] sm:px-7 sm:pb-8 sm:pt-24 lg:px-10 lg:pb-10">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-blue-400/10 blur-3xl" />

      {/* BACK */}

      <GameBackButton
        label="Quay lại chọn chế độ"
        position="absolute"
        disabled={
          !canLeave
        }
        onClick={() => {
          void leaveMatch();
        }}
      />

      <div className="relative z-10">

        {/* HEADER */}

        <header className="text-center">

          <span className="inline-flex max-w-full items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300 sm:px-4 sm:text-xs sm:tracking-[0.18em]">

            {
              modeInformation.icon
            }{" "}

            {
              modeInformation.name
            }

          </span>

          <h1 className="mt-4 text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">

            {mode ===
            "bot"
              ? "Đang chuẩn bị đối thủ"
              : "Đang tìm người chơi"}

          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">

            HSK{" "}
            {level} ·{" "}
            {
              region.name
            }

            {region.chineseName
              ? ` · ${region.chineseName}`
              : ""}

          </p>

        </header>

        {/* ROOM STATUS */}

        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-black/10 p-4 sm:mt-8 sm:p-5">

          <div className="mb-3 flex items-center justify-between gap-3 sm:gap-4">

            <div className="min-w-0">

              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-500 sm:text-[10px]">
                Trạng thái phòng
              </span>

              <strong className="mt-1 block text-xs leading-relaxed text-white sm:text-base">
                {
                  statusMessage
                }
              </strong>

            </div>

            <strong className="shrink-0 text-xl font-black text-amber-300 sm:text-3xl">

              {
                playerCount
              }
              /
              {
                maxPlayers
              }

            </strong>

          </div>

          {/* PROGRESS */}

          <div className="h-2.5 overflow-hidden rounded-full bg-white/10 sm:h-3">

            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300 transition-all duration-500"
              style={{
                width:
                  `${progress}%`,
              }}
            />

          </div>

          {/* FALLBACK */}

          {mode !==
            "bot" &&
            !matchStarting &&
            !fillingBots && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">

              <span className="text-xs text-slate-400">

                {fallbackSeconds >
                0
                  ? "Đề nghị thêm máy sau"
                  : "Có thể thêm người chơi máy"}

              </span>

              <strong className="text-sm text-amber-300">

                {fallbackSeconds >
                0
                  ? `${fallbackSeconds} giây`
                  : "Sẵn sàng"}

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
                ? "Đang thêm người chơi máy"
                : matchStarting
                  ? "Đang chuyển vào trận đấu"
                  : polling
                    ? "Đang cập nhật phòng"
                    : loading
                      ? "Đang kết nối máy chủ"
                      : match
                        ? "Tự động cập nhật mỗi 1 giây"
                        : "Chưa tham gia phòng"}

            </span>

          </div>

        </div>

        {/* TEAMS */}

        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 items-stretch gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">

          <TeamWaitingCard
            name="Đội Đỏ"
            icon="🦅"
            color="red"
            players={
              redPlayers
            }
            slotCount={
              teamSize
            }
          />

          <div className="flex flex-row items-center justify-center gap-3 py-1 lg:flex-col lg:py-0">

            <div className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-amber-300/30 bg-amber-300/10 text-xl font-black text-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.14)] sm:size-20 sm:text-3xl">
              VS
            </div>

            <span className="text-xs font-bold uppercase text-slate-500">

              {
                teamSize
              }{" "}
              đấu{" "}
              {
                teamSize
              }

            </span>

          </div>

          <TeamWaitingCard
            name="Đội Xanh"
            icon="🐉"
            color="blue"
            players={
              bluePlayers
            }
            slotCount={
              teamSize
            }
          />

        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mx-auto mt-5 max-w-2xl rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-100"
          >

            <strong className="block">
              Không thể ghép trận
            </strong>

            <p className="mt-1 break-words leading-relaxed text-red-100/80">
              {error}
            </p>

            <button
              type="button"
              onClick={
                retryConnection
              }
              disabled={
                loading ||
                polling
              }
              className="mt-3 min-h-11 w-full rounded-xl bg-red-200 px-4 font-black text-red-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >

              {loading ||
              polling
                ? "Đang thử lại..."
                : "Thử lại"}

            </button>

          </div>
        )}

        {/* LEAVE */}

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">

          <button
            type="button"
            disabled={
              !canLeave
            }
            onClick={() => {
              void leaveMatch();
            }}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-bold text-slate-300 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >

            {leaving
              ? "Đang rời phòng..."
              : match
                ? "Rời hàng chờ"
                : "Quay lại chọn chế độ"}

          </button>

        </div>

      </div>

      {/* =====================================
          BOT OFFER MODAL
          ===================================== */}

      {botOfferVisible &&
        mode !==
          "bot" &&
        !matchStarting && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-[28px] border border-amber-300/20 bg-[#0b2235] p-5 text-center shadow-2xl sm:p-7">

            <div className="mx-auto grid size-20 place-items-center rounded-full border border-amber-300/20 bg-amber-300/10 text-4xl">
              🤖
            </div>

            <span className="mt-5 block text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
              Chưa đủ người chơi
            </span>

            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Thêm máy vào trận?
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">

              Hiện chưa tìm đủ người chơi thật. Bạn có thể thêm người chơi máy để bắt đầu ngay hoặc tiếp tục chờ.

            </p>

            <div className="mt-6 grid gap-3">

              <button
                type="button"
                disabled={
                  botActionLoading
                }
                onClick={() => {
                  void fillWithBots();
                }}
                className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-[#312108] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {botActionLoading
                  ? "Đang xử lý..."
                  : "🤖 Đấu với máy"}

              </button>

              <button
                type="button"
                disabled={
                  botActionLoading
                }
                onClick={() => {
                  void continueWaiting();
                }}
                className="min-h-12 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-5 font-black text-emerald-200 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                👥 Tiếp tục chờ người thật
              </button>

              <button
                type="button"
                disabled={
                  botActionLoading ||
                  leaving
                }
                onClick={() => {
                  void leaveMatch();
                }}
                className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Quay lại chọn chế độ
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
}: {
  name: string;

  icon: string;

  color:
    | "red"
    | "blue";

  players:
    MatchmakingPlayer[];

  slotCount: number;
}) {
  const emptySlots =
    Math.max(
      0,

      slotCount -
        players.length,
    );

  const colorClass =
    color ===
    "red"
      ? "border-red-300/20 bg-red-400/5"
      : "border-blue-300/20 bg-blue-400/5";

  const titleColor =
    color ===
    "red"
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
              {
                players.length
              }
              /
              {
                slotCount
              }{" "}
              người chơi
            </strong>

          </div>

        </div>

      </div>

      <div className="space-y-2">

        {players.map(
          (
            player,
            index,
          ) => (
            <PlayerSlot
              key={`${player.user.id}-${player.team}-${index}`}
              player={
                player
              }
              color={
                color
              }
            />
          ),
        )}

        {Array.from({
          length:
            emptySlots,
        }).map(
          (
            _,
            index,
          ) => (
            <div
              key={`empty-${color}-${index}`}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-3"
            >

              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/5 text-sm text-slate-600">
                ?
              </div>

              <div className="min-w-0">

                <strong className="block truncate text-xs text-slate-500">
                  Đang tìm người chơi
                </strong>

                <span className="block truncate text-[10px] text-slate-600">
                  Vị trí còn trống
                </span>

              </div>

            </div>
          ),
        )}

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
}: {
  player:
    MatchmakingPlayer;

  color:
    | "red"
    | "blue";
}) {
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
          color ===
          "red"
            ? "bg-red-300/15"
            : "bg-blue-300/15"
        }`}
      >

        {avatar.startsWith(
          "http",
        ) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              avatar
            }
            alt={
              player.user.name
            }
            className="size-full object-cover"
          />
        ) : (
          <span>
            {avatar ||
              fallbackAvatar}
          </span>
        )}

      </div>

      <div className="min-w-0 flex-1">

        <strong className="block truncate text-sm text-white">
          {
            player.user.name
          }
        </strong>

        <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">

          {player.isBot
            ? "Người chơi máy"
            : "Người chơi thật"}

        </span>

      </div>

      <span className="hidden shrink-0 rounded-full bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-300 sm:inline-flex">

        {player.disconnected
          ? "Mất kết nối"
          : player.isReady
            ? "Sẵn sàng"
            : "Đang chờ"}

      </span>

    </div>
  );
}