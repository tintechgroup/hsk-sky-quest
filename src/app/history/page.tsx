"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

interface HistoryPlayer {
  id: string;
  name: string;
  team: "red" | "blue";
  isBot: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalTime: number;
}

interface HistoryMatch {
  id: string;

  mode:
    | "1v1"
    | "3v3"
    | "5v5"
    | "bot";

  level: number;

  region: {
    id: string;
    name: string;
    chineseName: string;
    pinyin: string;
  };

  result:
    | "win"
    | "loss"
    | "draw";

  winner:
    | "red"
    | "blue"
    | "draw";

  currentUserTeam:
    | "red"
    | "blue"
    | null;

  redScore: number;
  blueScore: number;
  redTime: number;
  blueTime: number;

  playerResult: {
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    totalTime: number;
  };

  players: HistoryPlayer[];

  startedAt: string | null;
  completedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface HistoryResponse {
  success: boolean;
  message?: string;
  data?: HistoryMatch[];
  pagination?: Pagination;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Chưa xác định";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function formatTime(seconds: number) {
  const safeSeconds =
    Math.max(0, seconds);

  const minutes =
    Math.floor(
      safeSeconds / 60,
    );

  const remainingSeconds =
    Math.round(
      safeSeconds % 60,
    );

  if (minutes <= 0) {
    return `${remainingSeconds} giây`;
  }

  return `${minutes} phút ${remainingSeconds} giây`;
}

function getModeLabel(
  mode: HistoryMatch["mode"],
) {
  switch (mode) {
    case "bot":
      return "Đấu với máy";

    case "3v3":
      return "Đấu 3 vs 3";

    case "5v5":
      return "Đấu 5 vs 5";

    default:
      return "Đấu 1 vs 1";
  }
}

function getResultInformation(
  result: HistoryMatch["result"],
) {
  switch (result) {
    case "win":
      return {
        label: "Chiến thắng",
        icon: "🏆",
        className:
          "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
      };

    case "loss":
      return {
        label: "Thất bại",
        icon: "⚔",
        className:
          "border-red-300/25 bg-red-300/10 text-red-200",
      };

    default:
      return {
        label: "Hòa",
        icon: "🤝",
        className:
          "border-amber-300/25 bg-amber-300/10 text-amber-200",
      };
  }
}

export default function HistoryPage() {
  const router = useRouter();

  const [matches, setMatches] =
    useState<HistoryMatch[]>([]);

  const [
    pagination,
    setPagination,
  ] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [page, setPage] =
    useState(1);

  const [
    expandedMatchId,
    setExpandedMatchId,
  ] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadHistory() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `/api/player/history?page=${page}&limit=10`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal:
              controller.signal,
          },
        );

        const result =
          (await response.json()) as HistoryResponse;

        if (response.status === 401) {
          router.replace(
            "/login?returnTo=/history",
          );
          return;
        }

        if (
          !response.ok ||
          !result.success
        ) {
          setError(
            result.message ||
              "Không thể tải lịch sử thi đấu.",
          );
          return;
        }

        setMatches(
          result.data ?? [],
        );

        if (result.pagination) {
          setPagination(
            result.pagination,
          );
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          "Không thể kết nối đến máy chủ.",
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [page, router]);

  const currentPageStatistics =
    useMemo(() => {
      return matches.reduce(
        (statistics, match) => {
          statistics.total += 1;

          if (
            match.result === "win"
          ) {
            statistics.wins += 1;
          }

          if (
            match.result === "loss"
          ) {
            statistics.losses += 1;
          }

          if (
            match.result === "draw"
          ) {
            statistics.draws += 1;
          }

          return statistics;
        },
        {
          total: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        },
      );
    }, [matches]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#031521] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 size-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute -right-20 bottom-20 size-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="rounded-[28px] border border-emerald-300/15 bg-[#082333]/95 p-5 shadow-xl shadow-black/10 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-black tracking-[0.18em] text-emerald-300">
                HSK SKY QUEST
              </span>

              <h1 className="mt-2 text-2xl font-black sm:text-4xl">
                Lịch sử thi đấu
              </h1>

              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                Theo dõi kết quả và thành tích của
                từng trận đấu.
              </p>
            </div>

            <div className="flex flex-col gap-2 min-[420px]:flex-row">
              <Link
                href="/profile"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 text-sm font-black text-emerald-200 transition hover:bg-emerald-300/15"
              >
                👤 Hồ sơ
              </Link>

              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200 transition hover:text-white"
              >
                ← Về trò chơi
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label:
                  "Trận trên trang",
                value:
                  currentPageStatistics.total,
                color:
                  "text-sky-200",
              },
              {
                label: "Chiến thắng",
                value:
                  currentPageStatistics.wins,
                color:
                  "text-emerald-200",
              },
              {
                label: "Thất bại",
                value:
                  currentPageStatistics.losses,
                color:
                  "text-red-200",
              },
              {
                label: "Trận hòa",
                value:
                  currentPageStatistics.draws,
                color:
                  "text-amber-200",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-white/5 bg-white/5 p-4"
              >
                <strong
                  className={`text-2xl font-black ${item.color}`}
                >
                  {item.value}
                </strong>

                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {item.label}
                </p>
              </article>
            ))}
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200"
          >
            ⚠ {error}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 grid gap-4">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-[28px] border border-white/5 bg-white/5"
              />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-dashed border-emerald-300/20 bg-[#082333]/80 p-10 text-center sm:p-16">
            <div className="text-6xl">
              📭
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Chưa có lịch sử thi đấu
            </h2>

            <p className="mx-auto mt-3 max-w-md leading-7 text-slate-400">
              Hãy tham gia và hoàn thành trận đấu
              đầu tiên. Kết quả sẽ được lưu tự động
              tại đây.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-300 px-6 font-black text-[#05252c]"
            >
              Bắt đầu chơi
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-5">
            {matches.map((match) => {
              const resultInformation =
                getResultInformation(
                  match.result,
                );

              const redPlayers =
                match.players.filter(
                  (player) =>
                    player.team ===
                    "red",
                );

              const bluePlayers =
                match.players.filter(
                  (player) =>
                    player.team ===
                    "blue",
                );

              const isExpanded =
                expandedMatchId ===
                match.id;

              return (
                <article
                  key={match.id}
                  className="overflow-hidden rounded-[28px] border border-white/8 bg-[#082333]/95 shadow-xl shadow-black/10"
                >
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-black ${resultInformation.className}`}
                          >
                            {
                              resultInformation.icon
                            }{" "}
                            {
                              resultInformation.label
                            }
                          </span>

                          <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-200">
                            {getModeLabel(
                              match.mode,
                            )}
                          </span>

                          <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-200">
                            HSK {match.level}
                          </span>
                        </div>

                        <h2 className="mt-4 text-xl font-black sm:text-2xl">
                          {match.region.name}

                          {match.region
                            .chineseName && (
                            <>
                              {" "}
                              ·{" "}
                              <span lang="zh-CN">
                                {
                                  match
                                    .region
                                    .chineseName
                                }
                              </span>
                            </>
                          )}
                        </h2>

                        {match.region.pinyin && (
                          <p className="mt-1 text-sm italic text-slate-400">
                            {
                              match.region
                                .pinyin
                            }
                          </p>
                        )}
                      </div>

                      <time className="text-sm text-slate-500">
                        {formatDate(
                          match.completedAt,
                        )}
                      </time>
                    </div>

                    {/* Tỷ số */}
                    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-white/5 bg-[#061b29] p-4 sm:gap-6 sm:p-6">
                      <div className="text-center">
                        <span className="text-xs font-black uppercase tracking-wider text-red-300">
                          Đội đỏ
                        </span>

                        <strong className="mt-2 block text-3xl font-black text-red-200 sm:text-5xl">
                          {match.redScore}
                        </strong>

                        <small className="mt-2 block text-slate-500">
                          {formatTime(
                            match.redTime,
                          )}
                        </small>
                      </div>

                      <div className="text-center">
                        <span className="block text-xs font-black text-slate-600">
                          VS
                        </span>

                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                            match.currentUserTeam ===
                            "red"
                              ? "bg-red-300/10 text-red-200"
                              : match.currentUserTeam ===
                                  "blue"
                                ? "bg-blue-300/10 text-blue-200"
                                : "bg-white/5 text-slate-400"
                          }`}
                        >
                          {match.currentUserTeam ===
                          "red"
                            ? "Bạn: Đội đỏ"
                            : match.currentUserTeam ===
                                "blue"
                              ? "Bạn: Đội xanh"
                              : "Không xác định"}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                          Đội xanh
                        </span>

                        <strong className="mt-2 block text-3xl font-black text-blue-200 sm:text-5xl">
                          {match.blueScore}
                        </strong>

                        <small className="mt-2 block text-slate-500">
                          {formatTime(
                            match.blueTime,
                          )}
                        </small>
                      </div>
                    </div>

                    {/* Kết quả cá nhân */}
                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {[
                        {
                          label:
                            "Điểm cá nhân",
                          value:
                            match.playerResult
                              .score,
                        },
                        {
                          label:
                            "Câu đúng",
                          value:
                            match.playerResult
                              .correctAnswers,
                        },
                        {
                          label:
                            "Câu sai",
                          value:
                            match.playerResult
                              .wrongAnswers,
                        },
                        {
                          label:
                            "Thời gian",
                          value:
                            formatTime(
                              match
                                .playerResult
                                .totalTime,
                            ),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center"
                        >
                          <strong className="block text-lg font-black text-white">
                            {item.value}
                          </strong>

                          <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMatchId(
                          isExpanded
                            ? null
                            : match.id,
                        )
                      }
                      className="mt-5 flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/8 bg-white/5 px-4 text-sm font-black text-slate-300 transition hover:border-emerald-300/20 hover:text-emerald-200"
                    >
                      {isExpanded
                        ? "Thu gọn đội hình ▲"
                        : "Xem đội hình chi tiết ▼"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="grid gap-4 border-t border-white/5 bg-[#061b29]/80 p-5 md:grid-cols-2 sm:p-7">
                      <TeamPlayers
                        title="Đội đỏ"
                        team="red"
                        players={
                          redPlayers
                        }
                      />

                      <TeamPlayers
                        title="Đội xanh"
                        team="blue"
                        players={
                          bluePlayers
                        }
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!isLoading &&
          pagination.total > 0 && (
          <nav
            className="mt-7 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/5 bg-[#082333]/95 p-4 sm:flex-row"
            aria-label="Phân trang lịch sử"
          >
            <p className="text-sm text-slate-400">
              Trang{" "}
              <strong className="text-white">
                {pagination.page}
              </strong>{" "}
              /{" "}
              <strong className="text-white">
                {pagination.totalPages}
              </strong>{" "}
              · Tổng{" "}
              <strong className="text-emerald-300">
                {pagination.total}
              </strong>{" "}
              trận
            </p>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.max(
                        1,
                        previous - 1,
                      ),
                  )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-slate-200 transition hover:border-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Trang trước
              </button>

              <button
                type="button"
                disabled={
                  !pagination.hasNextPage
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous + 1,
                  )
                }
                className="min-h-11 rounded-xl bg-emerald-300 px-5 text-sm font-black text-[#05252c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Trang sau →
              </button>
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}

function TeamPlayers({
  title,
  team,
  players,
}: {
  title: string;
  team: "red" | "blue";
  players: HistoryPlayer[];
}) {
  const isRed =
    team === "red";

  return (
    <section
      className={`rounded-3xl border p-4 ${
        isRed
          ? "border-red-300/15 bg-red-300/5"
          : "border-blue-300/15 bg-blue-300/5"
      }`}
    >
      <h3
        className={`font-black ${
          isRed
            ? "text-red-200"
            : "text-blue-200"
        }`}
      >
        {isRed ? "🔴" : "🔵"}{" "}
        {title}
      </h3>

      <div className="mt-4 space-y-2">
        {players.length === 0 ? (
          <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-500">
            Không có dữ liệu người chơi.
          </p>
        ) : (
          players.map((player) => (
            <article
              key={
                player.id ||
                `${player.name}-${player.team}`
              }
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#082333]/90 p-3"
            >
              <div className="min-w-0">
                <strong className="block truncate text-sm text-white">
                  {player.isBot
                    ? "🤖 "
                    : "👤 "}
                  {player.name}
                </strong>

                <small className="text-slate-500">
                  {player.correctAnswers} đúng ·{" "}
                  {player.wrongAnswers} sai
                </small>
              </div>

              <strong
                className={
                  isRed
                    ? "text-red-200"
                    : "text-blue-200"
                }
              >
                {player.score} điểm
              </strong>
            </article>
          ))
        )}
      </div>
    </section>
  );
}