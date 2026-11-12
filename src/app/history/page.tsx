"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Language = "vi" | "zh";
type MatchMode = "1v1" | "3v3" | "5v5" | "bot";
type MatchResult = "win" | "loss" | "draw";

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
  mode: MatchMode;
  level: number;
  region: {
    id: string;
    name: string;
    chineseName: string;
    pinyin: string;
  };
  result: MatchResult;
  winner: "red" | "blue" | "draw";
  currentUserTeam: "red" | "blue" | null;
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

const translations = {
  vi: {
    unknownDate: "Chưa xác định",
    seconds: "giây",
    minutes: "phút",
    title: "Lịch sử thi đấu",
    description: "Theo dõi kết quả và thành tích của từng trận đấu.",
    profile: "👤 Hồ sơ",
    backToGame: "← Về trò chơi",
    pageMatches: "Trận trên trang",
    wins: "Chiến thắng",
    losses: "Thất bại",
    draws: "Trận hòa",
    loadError: "Không thể tải lịch sử thi đấu.",
    connectionError: "Không thể kết nối đến máy chủ.",
    emptyTitle: "Chưa có lịch sử thi đấu",
    emptyDescription:
      "Hãy tham gia và hoàn thành trận đấu đầu tiên. Kết quả sẽ được lưu tự động tại đây.",
    startPlaying: "Bắt đầu chơi",
    win: "Chiến thắng",
    loss: "Thất bại",
    draw: "Hòa",
    redTeam: "Đội đỏ",
    blueTeam: "Đội xanh",
    yourRedTeam: "Bạn: Đội đỏ",
    yourBlueTeam: "Bạn: Đội xanh",
    unknownTeam: "Không xác định",
    personalScore: "Điểm cá nhân",
    correctCount: "Câu đúng",
    wrongCount: "Câu sai",
    time: "Thời gian",
    collapseTeams: "Thu gọn đội hình ▲",
    showTeams: "Xem đội hình chi tiết ▼",
    noPlayerData: "Không có dữ liệu người chơi.",
    correct: "đúng",
    wrong: "sai",
    points: "điểm",
    pageLabel: "Phân trang lịch sử",
    page: "Trang",
    total: "Tổng",
    matches: "trận",
    previous: "← Trang trước",
    next: "Trang sau →",
    modeBot: "Đấu với máy",
    mode3v3: "Đấu 3 vs 3",
    mode5v5: "Đấu 5 vs 5",
    mode1v1: "Đấu 1 vs 1",
    vs: "VS",
  },
  zh: {
    unknownDate: "日期未知",
    seconds: "秒",
    minutes: "分钟",
    title: "比赛记录",
    description: "查看每场比赛的结果和成绩。",
    profile: "👤 个人资料",
    backToGame: "← 返回游戏",
    pageMatches: "本页比赛",
    wins: "胜利",
    losses: "失败",
    draws: "平局",
    loadError: "无法加载比赛记录。",
    connectionError: "无法连接服务器。",
    emptyTitle: "暂无比赛记录",
    emptyDescription: "参加并完成你的第一场比赛，结果会自动保存在这里。",
    startPlaying: "开始游戏",
    win: "胜利",
    loss: "失败",
    draw: "平局",
    redTeam: "红队",
    blueTeam: "蓝队",
    yourRedTeam: "你：红队",
    yourBlueTeam: "你：蓝队",
    unknownTeam: "队伍未知",
    personalScore: "个人得分",
    correctCount: "答对题数",
    wrongCount: "答错题数",
    time: "用时",
    collapseTeams: "收起队伍 ▲",
    showTeams: "查看队伍详情 ▼",
    noPlayerData: "没有玩家数据。",
    correct: "答对",
    wrong: "答错",
    points: "分",
    pageLabel: "比赛记录分页",
    page: "第",
    total: "共",
    matches: "场比赛",
    previous: "← 上一页",
    next: "下一页 →",
    modeBot: "人机对战",
    mode3v3: "三对三",
    mode5v5: "五对五",
    mode1v1: "一对一",
    vs: "对战",
  },
} as const;

function formatDate(value: string | null, language: Language) {
  if (!value) {
    return translations[language].unknownDate;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return translations[language].unknownDate;
  }

  return new Intl.DateTimeFormat(
    language === "zh" ? "zh-CN" : "vi-VN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function formatTime(seconds: number, language: Language) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.round(safeSeconds % 60);
  const t = translations[language];

  if (minutes <= 0) {
    return `${remainingSeconds} ${t.seconds}`;
  }

  return `${minutes} ${t.minutes} ${remainingSeconds} ${t.seconds}`;
}

function getModeLabel(mode: MatchMode, language: Language) {
  const t = translations[language];

  switch (mode) {
    case "bot":
      return t.modeBot;
    case "3v3":
      return t.mode3v3;
    case "5v5":
      return t.mode5v5;
    default:
      return t.mode1v1;
  }
}

function getResultInformation(result: MatchResult, language: Language) {
  const t = translations[language];

  switch (result) {
    case "win":
      return {
        label: t.win,
        icon: "🏆",
        className:
          "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
      };

    case "loss":
      return {
        label: t.loss,
        icon: "⚔",
        className: "border-red-300/25 bg-red-300/10 text-red-200",
      };

    default:
      return {
        label: t.draw,
        icon: "🤝",
        className: "border-amber-300/25 bg-amber-300/10 text-amber-200",
      };
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const lang: Language = language === "zh" ? "zh" : "vi";
  const t = translations[lang];

  // Giữ ngôn ngữ mới nhất cho thông báo mà không tải lại dữ liệu khi đổi ngôn ngữ.
  const languageRef = useRef<Language>(lang);

  useEffect(() => {
    languageRef.current = lang;
  }, [lang]);

  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [page, setPage] = useState(1);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

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
            signal: controller.signal,
          },
        );

        const result = (await response.json()) as HistoryResponse;

        if (response.status === 401) {
          router.replace("/login?returnTo=/history");
          return;
        }

        if (!response.ok || !result.success) {
          setError(
            result.message ||
              translations[languageRef.current].loadError,
          );
          return;
        }

        setMatches(result.data ?? []);

        if (result.pagination) {
          setPagination(result.pagination);
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(translations[languageRef.current].connectionError);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [page, router]);

  const currentPageStatistics = useMemo(() => {
    return matches.reduce(
      (statistics, match) => {
        statistics.total += 1;

        if (match.result === "win") {
          statistics.wins += 1;
        }

        if (match.result === "loss") {
          statistics.losses += 1;
        }

        if (match.result === "draw") {
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
                {t.title}
              </h1>

              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                {t.description}
              </p>
            </div>

            <div className="flex flex-col gap-2 min-[420px]:flex-row">
              <Link
                href="/profile"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 text-sm font-black text-emerald-200 transition hover:bg-emerald-300/15"
              >
                {t.profile}
              </Link>

              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200 transition hover:text-white"
              >
                {t.backToGame}
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: t.pageMatches,
                value: currentPageStatistics.total,
                color: "text-sky-200",
              },
              {
                label: t.wins,
                value: currentPageStatistics.wins,
                color: "text-emerald-200",
              },
              {
                label: t.losses,
                value: currentPageStatistics.losses,
                color: "text-red-200",
              },
              {
                label: t.draws,
                value: currentPageStatistics.draws,
                color: "text-amber-200",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-white/5 bg-white/5 p-4"
              >
                <strong className={`text-2xl font-black ${item.color}`}>
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
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-[28px] border border-white/5 bg-white/5"
              />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-dashed border-emerald-300/20 bg-[#082333]/80 p-10 text-center sm:p-16">
            <div className="text-6xl">📭</div>

            <h2 className="mt-5 text-2xl font-black">{t.emptyTitle}</h2>

            <p className="mx-auto mt-3 max-w-md leading-7 text-slate-400">
              {t.emptyDescription}
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-300 px-6 font-black text-[#05252c]"
            >
              {t.startPlaying}
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-5">
            {matches.map((match) => {
              const resultInformation = getResultInformation(
                match.result,
                lang,
              );
              const redPlayers = match.players.filter(
                (player) => player.team === "red",
              );
              const bluePlayers = match.players.filter(
                (player) => player.team === "blue",
              );
              const isExpanded = expandedMatchId === match.id;

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
                            {resultInformation.icon} {resultInformation.label}
                          </span>

                          <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-200">
                            {getModeLabel(match.mode, lang)}
                          </span>

                          <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-200">
                            HSK {match.level}
                          </span>
                        </div>

                        <h2 className="mt-4 text-xl font-black sm:text-2xl">
                          {match.region.name}
                          {match.region.chineseName && (
                            <>
                              {" · "}
                              <span lang="zh-CN">
                                {match.region.chineseName}
                              </span>
                            </>
                          )}
                        </h2>

                        {match.region.pinyin && (
                          <p className="mt-1 text-sm italic text-slate-400">
                            {match.region.pinyin}
                          </p>
                        )}
                      </div>

                      <time className="text-sm text-slate-500">
                        {formatDate(match.completedAt, lang)}
                      </time>
                    </div>

                    {/* Tỷ số */}
                    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-white/5 bg-[#061b29] p-4 sm:gap-6 sm:p-6">
                      <div className="text-center">
                        <span className="text-xs font-black uppercase tracking-wider text-red-300">
                          {t.redTeam}
                        </span>

                        <strong className="mt-2 block text-3xl font-black text-red-200 sm:text-5xl">
                          {match.redScore}
                        </strong>

                        <small className="mt-2 block text-slate-500">
                          {formatTime(match.redTime, lang)}
                        </small>
                      </div>

                      <div className="text-center">
                        <span className="block text-xs font-black text-slate-600">
                          {t.vs}
                        </span>

                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                            match.currentUserTeam === "red"
                              ? "bg-red-300/10 text-red-200"
                              : match.currentUserTeam === "blue"
                                ? "bg-blue-300/10 text-blue-200"
                                : "bg-white/5 text-slate-400"
                          }`}
                        >
                          {match.currentUserTeam === "red"
                            ? t.yourRedTeam
                            : match.currentUserTeam === "blue"
                              ? t.yourBlueTeam
                              : t.unknownTeam}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                          {t.blueTeam}
                        </span>

                        <strong className="mt-2 block text-3xl font-black text-blue-200 sm:text-5xl">
                          {match.blueScore}
                        </strong>

                        <small className="mt-2 block text-slate-500">
                          {formatTime(match.blueTime, lang)}
                        </small>
                      </div>
                    </div>

                    {/* Kết quả cá nhân */}
                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {[
                        {
                          label: t.personalScore,
                          value: match.playerResult.score,
                        },
                        {
                          label: t.correctCount,
                          value: match.playerResult.correctAnswers,
                        },
                        {
                          label: t.wrongCount,
                          value: match.playerResult.wrongAnswers,
                        },
                        {
                          label: t.time,
                          value: formatTime(
                            match.playerResult.totalTime,
                            lang,
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
                        setExpandedMatchId(isExpanded ? null : match.id)
                      }
                      className="mt-5 flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/8 bg-white/5 px-4 text-sm font-black text-slate-300 transition hover:border-emerald-300/20 hover:text-emerald-200"
                    >
                      {isExpanded ? t.collapseTeams : t.showTeams}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="grid gap-4 border-t border-white/5 bg-[#061b29]/80 p-5 md:grid-cols-2 sm:p-7">
                      <TeamPlayers
                        title={t.redTeam}
                        team="red"
                        players={redPlayers}
                      />

                      <TeamPlayers
                        title={t.blueTeam}
                        team="blue"
                        players={bluePlayers}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!isLoading && pagination.total > 0 && (
          <nav
            className="mt-7 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/5 bg-[#082333]/95 p-4 sm:flex-row"
            aria-label={t.pageLabel}
          >
            <p className="text-sm text-slate-400">
              {t.page}{" "}
              <strong className="text-white">{pagination.page}</strong> /{" "}
              <strong className="text-white">{pagination.totalPages}</strong>
              {" · "}
              {t.total}{" "}
              <strong className="text-emerald-300">{pagination.total}</strong>{" "}
              {t.matches}
            </p>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() =>
                  setPage((previous) => Math.max(1, previous - 1))
                }
                className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-slate-200 transition hover:border-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t.previous}
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((previous) => previous + 1)}
                className="min-h-11 rounded-xl bg-emerald-300 px-5 text-sm font-black text-[#05252c] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t.next}
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
  const { language } = useLanguage();
  const lang: Language = language === "zh" ? "zh" : "vi";
  const t = translations[lang];
  const isRed = team === "red";

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
          isRed ? "text-red-200" : "text-blue-200"
        }`}
      >
        {isRed ? "🔴" : "🔵"} {title}
      </h3>

      <div className="mt-4 space-y-2">
        {players.length === 0 ? (
          <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-500">
            {t.noPlayerData}
          </p>
        ) : (
          players.map((player) => (
            <article
              key={player.id || `${player.name}-${player.team}`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#082333]/90 p-3"
            >
              <div className="min-w-0">
                <strong className="block truncate text-sm text-white">
                  {player.isBot ? "🤖 " : "👤 "}
                  {player.name}
                </strong>

                <small className="text-slate-500">
                  {player.correctAnswers} {t.correct} · {player.wrongAnswers}{" "}
                  {t.wrong}
                </small>
              </div>

              <strong
                className={isRed ? "text-red-200" : "text-blue-200"}
              >
                {player.score} {t.points}
              </strong>
            </article>
          ))
        )}
      </div>
    </section>
  );
}