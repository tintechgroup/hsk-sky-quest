"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import ChinaFlightMap from "@/components/game/ChinaFlightMap";
import LootScreen from "@/components/game/LootScreen";
import WelcomeScreen from "@/components/game/WelcomeScreen";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  regions as fallbackRegions,
} from "@/data/regions";

import type {
  GamePhase,
  HSKLevel,
} from "@/types/game";

import type {
  Region,
} from "@/types/region";

const FLIGHT_INTERVAL = 160;
const FLIGHT_STEP = 0.35;
const PARACHUTE_DURATION = 2500;

interface CurrentUser {
  id: string;

  name: string;

  username?: string;

  email?: string;

  phone?: string;

  role?:
    | "user"
    | "admin";

  gamesPlayed?: number;

  totalMatches?: number;

  wins?: number;

  losses?: number;

  draws?: number;

  totalScore?: number;

  bestScore?: number;

  currentWinStreak?: number;

  bestWinStreak?: number;
}

interface AuthMeResponse {
  success: boolean;

  authenticated?: boolean;

  user?:
    | CurrentUser
    | null;

  message?: string;
}

interface RegionsResponse {
  success: boolean;

  data?: unknown[];

  regions?: unknown[];

  message?: string;
}

interface LogoutResponse {
  success: boolean;

  message?: string;
}

interface RawRegion {
  _id?: unknown;

  id?: unknown;

  name?: unknown;

  chineseName?: unknown;

  pinyin?: unknown;

  slug?: unknown;

  geography?: unknown;

  culture?: unknown;

  landmark?: unknown;

  description?: unknown;

  mapX?: unknown;

  mapY?: unknown;

  flightOrder?: unknown;

  color?: unknown;

  isActive?: unknown;
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
  return (
    typeof value === "string" &&
    value.trim()
  )
    ? value.trim()
    : fallback;
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
    Number(value);

  return Number.isFinite(
    converted,
  )
    ? converted
    : fallback;
}

/*
 * ========================================
 * SLUG
 * ========================================
 */

function createSlug(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

/*
 * ========================================
 * NORMALIZE REGION
 * ========================================
 *
 * Quan trọng:
 *
 * Region dùng chung với:
 *
 * - LootScreen
 * - MatchmakingScreen
 * - TeamBattleScreen
 * - API regions
 *
 * nên phải dùng @/types/region.
 */
function normalizeRegion(
  rawValue: unknown,
): Region | null {
  if (
    !rawValue ||
    typeof rawValue !== "object"
  ) {
    return null;
  }

  const rawRegion =
    rawValue as RawRegion;

  const id =
    getStringValue(
      rawRegion.id,
      getStringValue(
        rawRegion._id,
      ),
    );

  const name =
    getStringValue(
      rawRegion.name,
    );

  if (
    !id ||
    !name
  ) {
    return null;
  }

  const slug =
    getStringValue(
      rawRegion.slug,
      createSlug(name),
    );

  const mapX =
    Math.min(
      100,
      Math.max(
        0,
        getNumberValue(
          rawRegion.mapX,
          50,
        ),
      ),
    );

  const mapY =
    Math.min(
      100,
      Math.max(
        0,
        getNumberValue(
          rawRegion.mapY,
          50,
        ),
      ),
    );

  const flightOrder =
    Math.max(
      0,
      Math.floor(
        getNumberValue(
          rawRegion.flightOrder,
          0,
        ),
      ),
    );

  return {
    id,

    name,

    chineseName:
      getStringValue(
        rawRegion.chineseName,
        name,
      ),

    pinyin:
      getStringValue(
        rawRegion.pinyin,
      ),

    slug,

    geography:
      getStringValue(
        rawRegion.geography,

        getStringValue(
          rawRegion.description,

          `Khám phá địa lý và cảnh quan của ${name}.`,
        ),
      ),

    culture:
      getStringValue(
        rawRegion.culture,

        `Tìm hiểu nét văn hóa đặc trưng của ${name}.`,
      ),

    landmark:
      getStringValue(
        rawRegion.landmark,

        `Những địa danh nổi bật tại ${name}.`,
      ),

    mapX,

    mapY,

    flightOrder,

    color:
      getStringValue(
        rawRegion.color,
        "#34d399",
      ),

    isActive:
      rawRegion.isActive !== false,
  };
}

/*
 * ========================================
 * FALLBACK REGIONS
 * ========================================
 *
 * Không gán thẳng fallbackRegions
 * vào Region[].
 *
 * Chuẩn hóa chúng qua cùng một
 * hàm để bảo đảm có đủ:
 *
 * slug
 * mapX
 * mapY
 * flightOrder
 * color
 * isActive
 */
const NORMALIZED_FALLBACK_REGIONS =
  fallbackRegions
    .map(
      normalizeRegion,
    )
    .filter(
      (
        region,
      ): region is Region =>
        region !== null,
    );

/*
 * ========================================
 * GAME
 * ========================================
 */

export default function Game() {
  const router =
    useRouter();

  const { language } =
    useLanguage();

  // Giữ ngôn ngữ mới nhất cho các effect chạy một lần,
  // không làm gọi lại API khi đổi ngôn ngữ.
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const localize = (
    vietnamese: string,
    chinese: string,
  ) =>
    language === "zh"
      ? chinese
      : vietnamese;

  const [
    phase,
    setPhase,
  ] =
    useState<GamePhase>(
      "start",
    );

  const [
    level,
    setLevel,
  ] =
    useState<HSKLevel>(
      3,
    );

  const [
    flightProgress,
    setFlightProgress,
  ] =
    useState(0);

  const [
    landingRegion,
    setLandingRegion,
  ] =
    useState<
      Region | null
    >(null);

  const [
    availableRegions,
    setAvailableRegions,
  ] =
    useState<Region[]>(
      () =>
        NORMALIZED_FALLBACK_REGIONS,
    );

  const [
    regionsLoading,
    setRegionsLoading,
  ] =
    useState(true);

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<
      CurrentUser | null
    >(null);

  const [
    authLoading,
    setAuthLoading,
  ] =
    useState(true);

  const [
    startingJourney,
    setStartingJourney,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    authMessage,
    setAuthMessage,
  ] =
    useState("");

  const autoStartHandled =
    useRef(false);

  /*
   * ========================================
   * CURRENT REGION
   * ========================================
   */

  const regionIndex =
    useMemo(
      () => {
        if (
          availableRegions.length ===
          0
        ) {
          return 0;
        }

        return Math.min(
          availableRegions.length -
            1,

          Math.floor(
            (
              flightProgress /
              100
            ) *
              availableRegions.length,
          ),
        );
      },
      [
        availableRegions.length,
        flightProgress,
      ],
    );

  const currentRegion =
    availableRegions[
      regionIndex
    ] ??
    NORMALIZED_FALLBACK_REGIONS[
      0
    ] ??
    null;

  /*
   * ========================================
   * LOAD REGIONS
   * ========================================
   */

  useEffect(() => {
    let cancelled =
      false;

    async function loadRegions() {
      try {
        const response =
          await fetch(
            "/api/regions",
            {
              method:
                "GET",

              cache:
                "no-store",

              headers: {
                Accept:
                  "application/json",
              },
            },
          );

        const result =
          (await response.json()) as
            RegionsResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            languageRef.current === "zh"
              ? "无法加载省份列表。"
              : "Không thể tải danh sách tỉnh.",
          );
        }

        const rawRegions =
          Array.isArray(
            result.data,
          )
            ? result.data
            : Array.isArray(
                  result.regions,
                )
              ? result.regions
              : [];

        const normalizedRegions =
          rawRegions
            .map(
              normalizeRegion,
            )
            .filter(
              (
                region,
              ): region is Region =>
                region !==
                null,
            )
            .filter(
              (
                region,
              ) =>
                region.isActive !==
                false,
            )
            .sort(
              (
                first,
                second,
              ) =>
                first.flightOrder -
                second.flightOrder,
            );

        if (
          !cancelled &&
          normalizedRegions.length >
            0
        ) {
          setAvailableRegions(
            normalizedRegions,
          );
        }
      } catch (
        error
      ) {
        console.warn(
          "Không thể tải danh sách tỉnh:",
          error,
        );

        if (
          !cancelled &&
          NORMALIZED_FALLBACK_REGIONS.length >
            0
        ) {
          setAvailableRegions(
            NORMALIZED_FALLBACK_REGIONS,
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setRegionsLoading(
            false,
          );
        }
      }
    }

    void loadRegions();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /*
   * ========================================
   * AUTH
   * ========================================
   */

  useEffect(() => {
    let cancelled =
      false;

    async function checkAuthentication() {
      try {
        const response =
          await fetch(
            "/api/auth/me",
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
          (await response.json()) as
            AuthMeResponse;

        if (
          !response.ok ||
          !result.success ||
          result.authenticated ===
            false ||
          !result.user
        ) {
          if (
            !cancelled
          ) {
            setCurrentUser(
              null,
            );
          }

          return;
        }

        if (
          !cancelled
        ) {
          setCurrentUser(
            result.user,
          );

          setAuthMessage(
            "",
          );
        }

        /*
         * Sau login với:
         *
         * /?start=1
         *
         * tự bắt đầu game.
         */
        const searchParams =
          new URLSearchParams(
            window.location
              .search,
          );

        const shouldAutoStart =
          searchParams.get(
            "start",
          ) ===
          "1";

        if (
          shouldAutoStart &&
          !autoStartHandled
            .current &&
          !cancelled
        ) {
          autoStartHandled.current =
            true;

          setFlightProgress(
            0,
          );

          setLandingRegion(
            null,
          );

          setPhase(
            "flight",
          );

          window.history
            .replaceState(
              {},
              "",
              window.location
                .pathname,
            );
        }
      } catch (
        error
      ) {
        console.warn(
          "Không thể kiểm tra đăng nhập:",
          error,
        );

        if (
          !cancelled
        ) {
          setCurrentUser(
            null,
          );

          setAuthMessage(
            languageRef.current === "zh"
              ? "无法检查登录状态。"
              : "Không thể kiểm tra phiên đăng nhập.",
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setAuthLoading(
            false,
          );
        }
      }
    }

    void checkAuthentication();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /*
   * ========================================
   * FLIGHT LOOP
   * ========================================
   */

  useEffect(() => {
    if (
      phase !==
      "flight"
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setFlightProgress(
            (
              previousProgress,
            ) =>
              (
                previousProgress +
                FLIGHT_STEP
              ) %
              100,
          );
        },

        FLIGHT_INTERVAL,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    phase,
  ]);

  /*
   * ========================================
   * PARACHUTE
   * ========================================
   */

  useEffect(() => {
    if (
      phase !==
      "parachuting"
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setPhase(
            "landed",
          );
        },

        PARACHUTE_DURATION,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    phase,
  ]);

  /*
   * ========================================
   * START GAME
   * ========================================
   */

  async function startGame() {
    if (
      startingJourney ||
      regionsLoading
    ) {
      return;
    }

    if (
      availableRegions.length ===
      0
    ) {
      setAuthMessage(
        localize(
          "Chưa có tỉnh/thành nào để bắt đầu hành trình.",
          "目前没有可供开始旅程的省份或城市。",
        ),
      );

      return;
    }

    try {
      setStartingJourney(
        true,
      );

      setAuthMessage(
        "",
      );

      const response =
        await fetch(
          "/api/auth/me",
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
        (await response.json()) as
          AuthMeResponse;

      if (
        !response.ok ||
        !result.success ||
        result.authenticated ===
          false ||
        !result.user
      ) {
        const returnTo =
          encodeURIComponent(
            "/?start=1",
          );

        router.push(
          `/login?returnTo=${returnTo}`,
        );

        return;
      }

      setCurrentUser(
        result.user,
      );

      setFlightProgress(
        0,
      );

      setLandingRegion(
        null,
      );

      setPhase(
        "flight",
      );
    } catch (
      error
    ) {
      console.warn(
        "Không thể bắt đầu hành trình:",
        error,
      );

      setAuthMessage(
        localize(
          "Không thể kiểm tra tài khoản. Vui lòng thử lại.",
          "无法验证账户，请重试。",
        ),
      );
    } finally {
      setStartingJourney(
        false,
      );
    }
  }

  /*
   * ========================================
   * LOGOUT
   * ========================================
   */

  async function logout() {
    if (
      loggingOut
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        localize(
          "Bạn có chắc muốn đăng xuất khỏi tài khoản này?",
          "确定要退出当前账户吗？",
        ),
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setLoggingOut(
        true,
      );

      setAuthMessage(
        "",
      );

      const response =
        await fetch(
          "/api/auth/logout",
          {
            method:
              "POST",

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
          | LogoutResponse
          | null;

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          localize(
            "Không thể đăng xuất.",
            "退出登录失败。",
          ),
        );
      }

      setCurrentUser(
        null,
      );

      setPhase(
        "start",
      );

      setFlightProgress(
        0,
      );

      setLandingRegion(
        null,
      );

      setAuthMessage(
        localize(
          "Bạn đã đăng xuất.",
          "你已退出登录。",
        ),
      );

      window.history
        .replaceState(
          {},
          "",
          "/",
        );
    } catch (
      error
    ) {
      console.warn(
        "Không thể đăng xuất:",
        error,
      );

      setAuthMessage(
        error instanceof
        Error
          ? error.message
          : localize(
              "Không thể đăng xuất.",
              "退出登录失败。",
            ),
      );
    } finally {
      setLoggingOut(
        false,
      );
    }
  }

  /*
   * ========================================
   * JUMP
   * ========================================
   */

  function jump() {
    if (
      phase !==
        "flight" ||
      !currentRegion
    ) {
      return;
    }

    setLandingRegion(
      currentRegion,
    );

    setPhase(
      "parachuting",
    );
  }

  /*
   * ========================================
   * RESTART
   * ========================================
   */

  function restart() {
    setPhase(
      "start",
    );

    setFlightProgress(
      0,
    );

    setLandingRegion(
      null,
    );

    setAuthMessage(
      "",
    );
  }

  const totalMatches =
    currentUser
      ?.totalMatches ??
    currentUser
      ?.gamesPlayed ??
    0;

  const wins =
    currentUser?.wins ??
    0;

  /*
   * ========================================
   * RENDER
   * ========================================
   */

  return (
    <main className="hsk-game">
      <div className="hsk-container">

        {/* ================================
            START
            ================================ */}

        {phase ===
          "start" && (
          <>
            <div className="mx-auto mb-4 w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 text-white shadow-lg backdrop-blur-md">

              <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">
                  {authLoading ? (
                    <p className="text-sm font-semibold text-slate-300">
                      {localize(
                        "Đang kiểm tra tài khoản...",
                        "正在检查账户…",
                      )}
                    </p>
                  ) : currentUser ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">
                        {localize(
                          "Chào mừng trở lại",
                          "欢迎回来",
                        )}
                      </p>

                      <p className="truncate text-base font-black text-white sm:text-lg">
                        {
                          currentUser.name
                        }

                        {
                          currentUser.username
                            ? ` · @${currentUser.username}`
                            : ""
                        }
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">

                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-300">
                          ⚔️{" "}
                          {
                            totalMatches
                          }{" "}
                          {localize(
                            "trận",
                            "场比赛",
                          )}
                        </span>

                        <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-emerald-200">
                          🏆{" "}
                          {
                            wins
                          }{" "}
                          {localize(
                            "thắng",
                            "胜场",
                          )}
                        </span>

                        <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-amber-200">
                          ⭐{" "}
                          {
                            currentUser.totalScore ??
                            0
                          }{" "}
                          {localize(
                            "điểm",
                            "分",
                          )}
                        </span>

                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
                        {localize(
                          "Chưa đăng nhập",
                          "尚未登录",
                        )}
                      </p>

                      <p className="text-sm text-slate-300">
                        {localize(
                          "Bạn cần đăng nhập để lưu lịch sử và tham gia thi đấu.",
                          "请先登录，以保存记录并参与对战。",
                        )}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">

                  {currentUser ? (
                    <>
                      <Link
                        href="/profile"
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/15 sm:text-sm"
                      >
                        {localize(
                          "👤 Hồ sơ",
                          "👤 个人资料",
                        )}
                      </Link>

                      {currentUser.role ===
                        "admin" && (
                        <Link
                          href="/admin"
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-xs font-black text-amber-200 transition hover:bg-amber-300/15 sm:text-sm"
                        >
                          {localize(
                            "🛠️ Admin",
                            "🛠️ 管理员",
                          )}
                        </Link>
                      )}

                      <button
                        type="button"
                        disabled={
                          loggingOut
                        }
                        onClick={() => {
                          void logout();
                        }}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-300/20 bg-red-300/10 px-4 text-xs font-black text-red-200 transition hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                      >
                        {
                          loggingOut
                            ? localize(
                                "Đang thoát...",
                                "正在退出…",
                              )
                            : localize(
                                "↪ Đăng xuất",
                                "↪ 退出登录",
                              )
                        }
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#062d32]"
                      >
                        {localize(
                          "Đăng nhập",
                          "登录",
                        )}
                      </Link>

                      <Link
                        href="/register"
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white"
                      >
                        {localize(
                          "Đăng ký",
                          "注册",
                        )}
                      </Link>
                    </>
                  )}

                </div>
              </div>
            </div>

            {authMessage && (
              <div
                role="alert"
                className="mx-auto mb-4 w-full max-w-6xl rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
              >
                {
                  authMessage
                }
              </div>
            )}

            <WelcomeScreen
              level={
                level
              }
              onLevelChange={
                setLevel
              }
              onStart={
                startGame
              }
            />

            {(
              authLoading ||
              startingJourney ||
              regionsLoading
            ) && (
              <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">

                <div className="rounded-3xl border border-white/10 bg-slate-950/95 px-7 py-6 text-center text-white shadow-2xl">

                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-300/20 border-t-cyan-300" />

                  <p className="mt-4 font-black">
                    {
                      startingJourney
                        ? localize(
                            "Đang bắt đầu hành trình...",
                            "正在开始旅程…",
                          )
                        : regionsLoading
                          ? localize(
                              "Đang tải bản đồ...",
                              "正在加载地图…",
                            )
                          : localize(
                              "Đang kiểm tra đăng nhập...",
                              "正在检查登录状态…",
                            )
                    }
                  </p>

                </div>
              </div>
            )}
          </>
        )}

        {/* ================================
            FLIGHT
            ================================ */}

        {phase ===
          "flight" &&
          currentRegion && (
          <>
            <header className="game-flight-header">

              <div className="game-brand">

                <div className="game-brand-icon">
                  ✈
                </div>

                <div>
                  <strong>
                    HSK SKY QUEST
                  </strong>

                  <span>
                    {localize(
                      "Học tiếng Trung qua trải nghiệm",
                      "在体验中学习中文",
                    )}
                  </span>
                </div>

              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">

                {currentUser && (
                  <Link
                    href="/profile"
                    className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right transition hover:border-cyan-300/30 hover:bg-cyan-300/10 sm:block"
                  >
                    <span className="block text-xs text-slate-400">
                      {localize(
                        "Người chơi",
                        "玩家",
                      )}
                    </span>

                    <strong className="block max-w-40 truncate text-sm text-white">
                      {
                        currentUser.name
                      }
                    </strong>
                  </Link>
                )}

                {currentUser?.role ===
                  "admin" && (
                  <Link
                    href="/admin"
                    className="hidden min-h-11 items-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 text-xs font-black text-amber-200 md:inline-flex"
                  >
                    🛠️
                  </Link>
                )}

                <div className="game-player-information">
                  <span>
                    {localize(
                      "Trình độ hiện tại",
                      "当前等级",
                    )}
                  </span>

                  <strong>
                    HSK{" "}
                    {
                      level
                    }
                  </strong>
                </div>

              </div>
            </header>

            <ChinaFlightMap
              progress={
                flightProgress
              }
              currentRegion={
                currentRegion
              }
              regions={
                availableRegions
              }
              onJump={
                jump
              }
            />

            <section
              className="flight-region-information"
              aria-live="polite"
            >

              <div className="flight-region-heading">

                <div>
                  <span className="flight-region-label">
                    {localize(
                      "KHÁM PHÁ VÙNG ĐẤT",
                      "探索这片土地",
                    )}
                  </span>

                  <h2>
                    {language === "zh"
                      ? currentRegion.chineseName
                      : currentRegion.name}

                    {language !== "zh" &&
                      currentRegion.chineseName && (
                        <>
                          {" "}·{" "}
                          <span lang="zh-CN">
                            {
                              currentRegion.chineseName
                            }
                          </span>
                        </>
                      )}
                  </h2>

                  <p>
                    {
                      currentRegion.pinyin
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="flight-back-button"
                  onClick={
                    restart
                  }
                >
                  {localize(
                    "← Quay lại",
                    "← 返回",
                  )}
                </button>

              </div>

              <div className="flight-knowledge-grid">

                <article>
                  <div className="flight-knowledge-icon">
                    🌏
                  </div>

                  <div>
                    <span>
                      {localize(
                        "ĐỊA LÝ",
                        "地理",
                      )}
                    </span>

                    <p>
                      {
                        currentRegion.geography
                      }
                    </p>
                  </div>
                </article>

                <article>
                  <div className="flight-knowledge-icon">
                    🏮
                  </div>

                  <div>
                    <span>
                      {localize(
                        "VĂN HÓA",
                        "文化",
                      )}
                    </span>

                    <p>
                      {
                        currentRegion.culture
                      }
                    </p>
                  </div>
                </article>

                <article>
                  <div className="flight-knowledge-icon">
                    🏯
                  </div>

                  <div>
                    <span>
                      {localize(
                        "ĐỊA DANH NỔI BẬT",
                        "著名景点",
                      )}
                    </span>

                    <p>
                      {
                        currentRegion.landmark
                      }
                    </p>
                  </div>
                </article>

              </div>

              <p className="flight-research-note">
                {localize(
                  "Nội dung giới thiệu giúp người chơi tiếp nhận kiến thức địa lý và văn hóa trước khi quyết định nhảy dù.",
                  "在决定跳伞前，玩家可以先了解当地的地理与文化。",
                )}
              </p>

            </section>
          </>
        )}

        {/* ================================
            PARACHUTING
            ================================ */}

        {phase ===
          "parachuting" &&
          landingRegion && (
          <section
            className="parachute-screen"
            role="status"
            aria-live="polite"
          >

            <button
              type="button"
              className="flight-back-button"
              onClick={
                restart
              }
            >
              {localize(
                "← Quay lại",
                "← 返回",
              )}
            </button>

            <div className="parachute-cloud cloud-one">
              ☁
            </div>

            <div className="parachute-cloud cloud-two">
              ☁
            </div>

            <div className="parachute-animation">
              <div className="parachute-icon">
                🪂
              </div>
            </div>

            <span className="parachute-label">
              {localize(
                "ĐANG TIẾP CẬN ĐIỂM ĐẾN",
                "正在接近目的地",
              )}
            </span>

            <h2>
              {localize(
                "Đang nhảy xuống",
                "正在跳向",
              )}{" "}
              {language === "zh"
                ? landingRegion.chineseName
                : landingRegion.name}
            </h2>

            <p>
              <span lang="zh-CN">
                {
                  landingRegion.chineseName
                }
              </span>{" "}
              ·{" "}
              {
                landingRegion.pinyin
              }
            </p>

            <div className="parachute-loading">
              <span />
            </div>

            <small>
              {localize(
                "Chuẩn bị tiếp đất và thu thập vật phẩm",
                "准备着陆并收集道具",
              )}
            </small>

          </section>
        )}

        {/* ================================
            LANDED
            ================================ */}

        {phase ===
          "landed" &&
          landingRegion && (
          <LootScreen
            key={
              landingRegion.id
            }
            region={
              landingRegion
            }
            level={
              level
            }
            onRestart={
              restart
            }
          />
        )}

      </div>
    </main>
  );
}