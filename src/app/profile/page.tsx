"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type ModeName = "1v1" | "3v3" | "5v5" | "bot";

interface ModeStats {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalScore: number;
  totalTime: number;
}

interface ProfileUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: "user" | "admin";
  gamesPlayed: number;
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
  modeStats: Record<ModeName, ModeStats>;
  lastPlayedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

interface AuthResponse {
  success: boolean;
  authenticated?: boolean;
  user?: ProfileUser | null;
  message?: string;
}

interface MatchHistory {
  id: string;
  mode: ModeName;
  level: number;
  result: "win" | "loss" | "draw";
  playerTeam: "red" | "blue" | null;
  player: {
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    totalTime: number;
  } | null;
  region: {
    id: string;
    name: string;
    chineseName?: string;
    pinyin?: string;
  };
  redScore: number;
  blueScore: number;
  redTime: number;
  blueTime: number;
  winner: "red" | "blue" | "draw" | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

interface HistoryResponse {
  success: boolean;
  data?: MatchHistory[];
  message?: string;
}

const EMPTY_MODE: ModeStats = {
  matches: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  totalScore: 0,
  totalTime: 0,
};

const translations = {
  vi: {
    loading: "Đang tải hồ sơ...",
    loadErrorTitle: "Không thể tải hồ sơ",
    game: "Về trò chơi",
    profile: "Hồ sơ phi công",
    admin: "🛠️ Admin",
    playNow: "🎮 Chơi ngay",
    totalMatches: "Tổng trận",
    wins: "Chiến thắng",
    winRate: "Tỷ lệ thắng",
    accuracy: "Độ chính xác",
    correctAnswers: "câu đúng",
    totalScore: "Tổng điểm",
    highest: "Cao nhất",
    currentStreak: "Chuỗi thắng hiện tại",
    bestStreak: "Chuỗi thắng tốt nhất",
    totalTime: "Tổng thời gian",
    gameModes: "Chế độ thi đấu",
    modeStats: "Thống kê theo chế độ",
    oneVsOne: "Đấu 1 đối 1",
    threeVsThree: "Đấu 3 đối 3",
    fiveVsFive: "Đấu 5 đối 5",
    againstBot: "Đấu với máy",
    playedMatches: "trận đã chơi",
    losses: "Thua",
    draws: "Hòa",
    time: "Thời gian",
    history: "Lịch sử thi đấu",
    recentMatches: "Các trận gần đây",
    refresh: "↻ Làm mới",
    noHistory: "Chưa có lịch sử trận đấu.",
    winResult: "CHIẾN THẮNG",
    lossResult: "THẤT BẠI",
    drawResult: "HÒA",
    points: "Điểm:",
    correct: "Đúng:",
    wrong: "Sai:",
    red: "Đỏ",
    blue: "Xanh",
  },
  zh: {
    loading: "正在加载玩家资料...",
    loadErrorTitle: "无法加载资料",
    game: "返回游戏",
    profile: "飞行员资料",
    admin: "🛠️ 管理员",
    playNow: "🎮 立即开始",
    totalMatches: "比赛总数",
    wins: "胜利",
    winRate: "胜率",
    accuracy: "答题准确率",
    correctAnswers: "道题答对",
    totalScore: "总分",
    highest: "最高",
    currentStreak: "当前连胜",
    bestStreak: "最佳连胜",
    totalTime: "总用时",
    gameModes: "比赛模式",
    modeStats: "各模式统计",
    oneVsOne: "一对一",
    threeVsThree: "三对三",
    fiveVsFive: "五对五",
    againstBot: "人机对战",
    playedMatches: "场比赛",
    losses: "失败",
    draws: "平局",
    time: "用时",
    history: "比赛记录",
    recentMatches: "最近比赛",
    refresh: "↻ 刷新",
    noHistory: "暂无比赛记录。",
    winResult: "胜利",
    lossResult: "失败",
    drawResult: "平局",
    points: "得分：",
    correct: "答对：",
    wrong: "答错：",
    red: "红队",
    blue: "蓝队",
  },
} as const;

export default function ProfilePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = language === "zh" ? translations.zh : translations.vi;

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [authResponse, historyResponse] = await Promise.all([
        fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/matches/history?limit=20", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const auth = (await authResponse.json()) as AuthResponse;

      if (
        !authResponse.ok ||
        !auth.success ||
        !auth.authenticated ||
        !auth.user
      ) {
        router.replace(
          `/login?returnTo=${encodeURIComponent("/profile")}`,
        );
        return;
      }

      setUser(auth.user);

      if (historyResponse.ok) {
        const historyResult =
          (await historyResponse.json()) as HistoryResponse;

        if (historyResult.success) {
          setHistory(historyResult.data ?? []);
        }
      }
    } catch (loadError) {
      console.error("Không thể tải profile:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải hồ sơ người chơi.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProfile]);

  const winRate = useMemo(() => {
    if (!user || user.totalMatches === 0) {
      return 0;
    }

    return Math.round((user.wins / user.totalMatches) * 100);
  }, [user]);

  const accuracy = useMemo(() => {
    if (!user) {
      return 0;
    }

    const totalAnswers = user.correctAnswers + user.wrongAnswers;

    if (totalAnswers === 0) {
      return 0;
    }

    return Math.round((user.correctAnswers / totalAnswers) * 100);
  }, [user]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020b13] text-white">
        <div className="text-center">
          <div className="text-5xl">✈️</div>
          <p className="mt-4 font-bold text-slate-400">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020b13] p-5">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-black text-white">
            {t.loadErrorTitle}
          </h1>

          {error && <p className="mt-3 text-red-300">{error}</p>}

          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl bg-emerald-300 px-6 py-3 font-black text-[#062d32]"
          >
            {t.game}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020b13] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-[#113047] via-[#092337] to-[#061725] p-6 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-20 shrink-0 place-items-center rounded-3xl border border-emerald-300/20 bg-emerald-300/10 text-4xl">
                👤
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  {t.profile}
                </span>

                <h1 className="mt-1 text-3xl font-black sm:text-4xl">
                  {user.name}
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  @{user.username}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-200"
                >
                  {t.admin}
                </Link>
              )}

              <Link
                href="/"
                className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-[#062d32]"
              >
                {t.playNow}
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-red-100">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon="⚔️" label={t.totalMatches} value={user.totalMatches} />

          <StatCard
            icon="🏆"
            label={t.wins}
            value={user.wins}
            secondary={`${winRate}% ${t.winRate}`}
          />

          <StatCard
            icon="🎯"
            label={t.accuracy}
            value={`${accuracy}%`}
            secondary={`${user.correctAnswers} ${t.correctAnswers}`}
          />

          <StatCard
            icon="⭐"
            label={t.totalScore}
            value={user.totalScore}
            secondary={`${t.highest} ${user.bestScore}`}
          />
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon="🔥"
            label={t.currentStreak}
            value={user.currentWinStreak}
          />

          <StatCard
            icon="👑"
            label={t.bestStreak}
            value={user.bestWinStreak}
          />

          <StatCard
            icon="⏱️"
            label={t.totalTime}
            value={formatTime(user.totalTime)}
          />
        </section>

        <section className="mt-6 rounded-[26px] border border-white/10 bg-[#0a2133] p-5 sm:p-6">
          <div className="mb-5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              {t.gameModes}
            </span>

            <h2 className="mt-1 text-2xl font-black">{t.modeStats}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ModeCard
              mode="1v1"
              title={t.oneVsOne}
              stats={user.modeStats?.["1v1"] ?? EMPTY_MODE}
            />

            <ModeCard
              mode="3v3"
              title={t.threeVsThree}
              stats={user.modeStats?.["3v3"] ?? EMPTY_MODE}
            />

            <ModeCard
              mode="5v5"
              title={t.fiveVsFive}
              stats={user.modeStats?.["5v5"] ?? EMPTY_MODE}
            />

            <ModeCard
              mode="bot"
              title={t.againstBot}
              stats={user.modeStats?.bot ?? EMPTY_MODE}
            />
          </div>
        </section>

        <section className="mt-6 rounded-[26px] border border-white/10 bg-[#0a2133] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                {t.history}
              </span>

              <h2 className="mt-1 text-2xl font-black">{t.recentMatches}</h2>
            </div>

            <button
              type="button"
              onClick={() => void loadProfile()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300"
            >
              {t.refresh}
            </button>
          </div>

          {history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
              {t.noHistory}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {history.map((item) => (
                <HistoryCard key={item.id} match={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  secondary,
}: {
  icon: string;
  label: string;
  value: string | number;
  secondary?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0a2133] p-5">
      <span className="text-2xl">{icon}</span>
      <span className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <strong className="mt-1 block text-3xl font-black">{value}</strong>

      {secondary && (
        <span className="mt-1 block text-xs text-slate-400">
          {secondary}
        </span>
      )}
    </article>
  );
}

function ModeCard({
  mode,
  title,
  stats,
}: {
  mode: ModeName;
  title: string;
  stats: ModeStats;
}) {
  const { language } = useLanguage();
  const t = language === "zh" ? translations.zh : translations.vi;

  const winRate =
    stats.matches > 0
      ? Math.round((stats.wins / stats.matches) * 100)
      : 0;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
        {mode}
      </span>

      <h3 className="mt-1 font-black">{title}</h3>

      <strong className="mt-4 block text-3xl font-black">
        {stats.matches}
      </strong>

      <span className="text-xs text-slate-500">{t.playedMatches}</span>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label={translations[language].wins} value={stats.wins} />
        <MiniStat label={t.losses} value={stats.losses} />
        <MiniStat label={t.draws} value={stats.draws} />
      </div>

      <div className="mt-4 border-t border-white/5 pt-4 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>{t.winRate}</span>
          <strong className="text-white">{winRate}%</strong>
        </div>

        <div className="mt-2 flex justify-between">
          <span>{t.totalScore}</span>
          <strong className="text-white">{stats.totalScore}</strong>
        </div>

        <div className="mt-2 flex justify-between">
          <span>{t.time}</span>
          <strong className="text-white">{formatTime(stats.totalTime)}</strong>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <strong className="block text-lg">{value}</strong>
      <span className="text-[9px] uppercase text-slate-500">{label}</span>
    </div>
  );
}

function HistoryCard({ match }: { match: MatchHistory }) {
  const { language } = useLanguage();
  const t = language === "zh" ? translations.zh : translations.vi;

  const resultText =
    match.result === "win"
      ? t.winResult
      : match.result === "loss"
        ? t.lossResult
        : t.drawResult;

  const resultClass =
    match.result === "win"
      ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-300"
      : match.result === "loss"
        ? "border-red-300/20 bg-red-300/5 text-red-300"
        : "border-amber-300/20 bg-amber-300/5 text-amber-300";

  return (
    <article className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${resultClass}`}
          >
            {resultText}
          </span>

          <span className="text-xs font-black text-white">
            {match.mode} · HSK {match.level}
          </span>
        </div>

        <h3 className="mt-2 truncate font-black">
          {match.region.name}
          {match.region.chineseName
            ? ` · ${match.region.chineseName}`
            : ""}
        </h3>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            {t.points}{" "}
            <b className="text-slate-300">{match.player?.score ?? 0}</b>
          </span>

          <span>
            {t.correct}{" "}
            <b className="text-slate-300">
              {match.player?.correctAnswers ?? 0}
            </b>
          </span>

          <span>
            {t.wrong}{" "}
            <b className="text-slate-300">
              {match.player?.wrongAnswers ?? 0}
            </b>
          </span>

          <span>
            {t.time}{" "}
            <b className="text-slate-300">
              {formatTime(match.player?.totalTime ?? 0)}
            </b>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:text-right">
        <div>
          <span className="block text-[9px] font-black uppercase text-red-300">
            {t.red}
          </span>
          <strong className="text-2xl">{match.redScore}</strong>
        </div>

        <span className="font-black text-amber-300">-</span>

        <div>
          <span className="block text-[9px] font-black uppercase text-blue-300">
            {t.blue}
          </span>
          <strong className="text-2xl">{match.blueScore}</strong>
        </div>
      </div>
    </article>
  );
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));

  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${minutes}m ${remaining}s`;
}