"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type HSKLevel = 3 | 4 | 5 | 6;

interface CoverageLevels {
  3: number;
  4: number;
  5: number;
  6: number;
}

interface CoverageRegion {
  regionId: string;

  regionName: string;

  chineseName: string;

  pinyin: string;

  slug: string;

  isActive: boolean;

  levels: CoverageLevels;

  total: number;

  activeTotal: number;

  inactiveTotal: number;

  missingLevels: HSKLevel[];

  insufficientLevels: HSKLevel[];

  readyLevels: HSKLevel[];

  isFullyReady: boolean;
}

interface CoverageSummary {
  minQuestionsPerLevel: number;

  totalRegions: number;

  activeRegions: number;

  inactiveRegions: number;

  fullyReadyRegions: number;

  regionsMissingQuestions: number;

  regionsInsufficient: number;

  totalQuestions: number;

  totalActiveQuestions: number;

  totalInactiveQuestions: number;

  totalsByLevel: CoverageLevels;

  totalRequiredCells: number;

  readyCells: number;

  coveragePercent: number;
}

interface CoverageResponse {
  success?: boolean;

  message?: string;

  data?: CoverageRegion[];

  summary?: CoverageSummary;
}

const HSK_LEVELS: HSKLevel[] = [
  3,
  4,
  5,
  6,
];

const MANAGEMENT_ITEMS = [
  {
    href: "/admin/regions",

    icon: "🗺️",

    title: "Quản lý tỉnh/thành",

    description:
      "Thêm tỉnh, nội dung địa lý, văn hóa, tọa độ bản đồ và thứ tự chuyến bay.",

    action:
      "Mở quản lý tỉnh",

    color:
      "border-emerald-300/20 bg-emerald-300/[0.06]",

    iconColor:
      "bg-emerald-300 text-[#062d32]",
  },

  {
    href: "/admin/questions",

    icon: "📝",

    title: "Quản lý câu hỏi",

    description:
      "Thêm câu hỏi theo tỉnh, cấp độ HSK, đáp án, gợi ý và phần giải thích.",

    action:
      "Mở ngân hàng câu hỏi",

    color:
      "border-blue-300/20 bg-blue-300/[0.06]",

    iconColor:
      "bg-blue-300 text-[#061c32]",
  },
];

function createEmptySummary(): CoverageSummary {
  return {
    minQuestionsPerLevel: 3,

    totalRegions: 0,

    activeRegions: 0,

    inactiveRegions: 0,

    fullyReadyRegions: 0,

    regionsMissingQuestions: 0,

    regionsInsufficient: 0,

    totalQuestions: 0,

    totalActiveQuestions: 0,

    totalInactiveQuestions: 0,

    totalsByLevel: {
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    },

    totalRequiredCells: 0,

    readyCells: 0,

    coveragePercent: 0,
  };
}

async function readResponse(
  response: Response,
): Promise<CoverageResponse> {
  try {
    return await response.json();
  } catch {
    return {
      success: false,

      message:
        "Máy chủ trả về dữ liệu không hợp lệ.",
    };
  }
}

export default function AdminPage() {
  const [
    coverage,
    setCoverage,
  ] =
    useState<CoverageRegion[]>(
      [],
    );

  const [
    summary,
    setSummary,
  ] =
    useState<CoverageSummary>(
      createEmptySummary(),
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      | "all"
      | "ready"
      | "missing"
      | "insufficient"
    >("all");

  const loadCoverage =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setError(
            "",
          );

          const response =
            await fetch(
              "/api/admin/question-coverage",
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
            await readResponse(
              response,
            );

          if (
            !response.ok ||
            result.success !==
              true
          ) {
            throw new Error(
              result.message ||
                "Không thể tải thống kê câu hỏi.",
            );
          }

          setCoverage(
            Array.isArray(
              result.data,
            )
              ? result.data
              : [],
          );

          setSummary(
            result.summary ||
              createEmptySummary(),
          );
        } catch (
          loadError
        ) {
          console.error(
            "GET /api/admin/question-coverage:",
            loadError,
          );

          setCoverage(
            [],
          );

          setSummary(
            createEmptySummary(),
          );

          setError(
            loadError instanceof
            Error
              ? loadError.message
              : "Không thể tải dashboard.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  /*
   * ========================================
   * AUTO LOAD
   * ========================================
   *
   * Không gọi loadCoverage() trực tiếp
   * trong body effect để tránh:
   *
   * react-hooks/set-state-in-effect
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadCoverage();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    loadCoverage,
  ]);

  const filteredCoverage =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return coverage
        .filter(
          (
            region,
          ) => {
            const matchesSearch =
              !keyword ||
              region.regionName
                .toLowerCase()
                .includes(
                  keyword,
                ) ||
              region.chineseName
                .toLowerCase()
                .includes(
                  keyword,
                ) ||
              region.pinyin
                .toLowerCase()
                .includes(
                  keyword,
                );

            const matchesStatus =
              statusFilter ===
                "all" ||
              (statusFilter ===
                "ready" &&
                region.isFullyReady) ||
              (statusFilter ===
                "missing" &&
                region
                  .missingLevels
                  .length >
                  0) ||
              (statusFilter ===
                "insufficient" &&
                region
                  .insufficientLevels
                  .length >
                  0);

            return (
              matchesSearch &&
              matchesStatus
            );
          },
        )
        .sort(
          (
            a,
            b,
          ) => {
            /*
             * Ưu tiên:
             *
             * 1. Tỉnh thiếu hoàn toàn câu hỏi
             * 2. Tỉnh thiếu số lượng
             * 3. Tỉnh đã đủ
             */

            const scoreA =
              a.missingLevels
                .length *
                100 +
              a.insufficientLevels
                .length *
                10;

            const scoreB =
              b.missingLevels
                .length *
                100 +
              b.insufficientLevels
                .length *
                10;

            return (
              scoreB -
              scoreA
            );
          },
        );
    }, [
      coverage,
      search,
      statusFilter,
    ]);

  return (
    <main className="min-h-screen bg-[#020b13] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

      <div className="mx-auto max-w-[1500px]">

        {/* ================= HERO ================= */}

        <header className="relative overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-[#12334a] via-[#0b263a] to-[#061827] p-6 shadow-2xl sm:p-8 lg:p-10">

          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative">

            <span className="inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-300 sm:text-xs">
              HSK SKY QUEST ADMIN
            </span>

            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Bảng điều khiển quản trị
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Quản lý tỉnh/thành,
              ngân hàng câu hỏi và
              theo dõi độ phủ dữ liệu
              HSK của toàn bộ trò chơi.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">

              <Link
                href="/admin/regions"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-300 px-5 text-sm font-black text-[#062d32] transition hover:-translate-y-0.5"
              >
                Thêm tỉnh/thành
              </Link>

              <Link
                href="/admin/questions"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white transition hover:bg-white/10"
              >
                Thêm câu hỏi
              </Link>

              <button
                type="button"
                onClick={() =>
                  void loadCoverage()
                }
                disabled={
                  loading
                }
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-5 text-sm font-black text-cyan-200 transition hover:bg-cyan-300/15 disabled:opacity-50"
              >
                {loading
                  ? "Đang tải..."
                  : "↻ Làm mới thống kê"}
              </button>

            </div>

          </div>

        </header>

        {/* ================= ERROR ================= */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200">
            ✕ {error}
          </div>
        )}

        {/* ================= SUMMARY ================= */}

        <section className="mt-6">

          <div className="mb-4">

            <span className="text-xs font-black tracking-[0.16em] text-cyan-300">
              TỔNG QUAN DỮ LIỆU
            </span>

            <h2 className="mt-2 text-2xl font-black text-white">
              Tình trạng hệ thống
            </h2>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
              title="Tỉnh hoạt động"
              value={
                loading
                  ? "..."
                  : String(
                      summary.activeRegions,
                    )
              }
              description={`Tổng ${summary.totalRegions} tỉnh/thành`}
              icon="🗺️"
              className="border-emerald-300/20 bg-emerald-300/[0.06]"
            />

            <SummaryCard
              title="Câu hỏi hoạt động"
              value={
                loading
                  ? "..."
                  : String(
                      summary.totalActiveQuestions,
                    )
              }
              description={`${summary.totalInactiveQuestions} câu đang ẩn`}
              icon="📝"
              className="border-blue-300/20 bg-blue-300/[0.06]"
            />

            <SummaryCard
              title="Tỉnh đủ dữ liệu"
              value={
                loading
                  ? "..."
                  : String(
                      summary.fullyReadyRegions,
                    )
              }
              description={`Yêu cầu ≥ ${summary.minQuestionsPerLevel} câu / HSK`}
              icon="✅"
              className="border-violet-300/20 bg-violet-300/[0.06]"
            />

            <SummaryCard
              title="Độ phủ"
              value={
                loading
                  ? "..."
                  : `${summary.coveragePercent}%`
              }
              description={`${summary.readyCells}/${summary.totalRequiredCells} nhóm HSK đạt chuẩn`}
              icon="📈"
              className="border-amber-300/20 bg-amber-300/[0.06]"
            />

          </div>

        </section>

        {/* ================= COVERAGE BAR ================= */}

        <section className="mt-6 rounded-[24px] border border-white/10 bg-[#0b2235] p-5 sm:p-7">

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>

              <span className="text-xs font-black tracking-[0.16em] text-emerald-300">
                ĐỘ PHỦ CÂU HỎI
              </span>

              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                Tiến độ chuẩn bị dữ
                liệu trò chơi
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Mỗi tỉnh hoạt động cần
                ít nhất{" "}
                <strong className="text-white">
                  {
                    summary.minQuestionsPerLevel
                  }
                </strong>{" "}
                câu hỏi hoạt động cho
                từng cấp HSK 3, 4, 5 và
                6.
              </p>

            </div>

            <strong className="text-3xl font-black text-emerald-300">
              {
                summary.coveragePercent
              }
              %
            </strong>

          </div>

          <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/5">

            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    summary.coveragePercent,
                  ),
                )}%`,
              }}
            />

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {HSK_LEVELS.map(
              (
                level,
              ) => (
                <div
                  key={
                    level
                  }
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
                >

                  <span className="text-xs font-bold text-slate-400">
                    HSK {level}
                  </span>

                  <strong className="mt-1 block text-2xl text-white">
                    {
                      summary
                        .totalsByLevel[
                        level
                      ]
                    }
                  </strong>

                  <small className="text-slate-500">
                    câu hoạt động
                  </small>

                </div>
              ),
            )}

          </div>

        </section>

        {/* ================= COVERAGE MATRIX ================= */}

        <section className="mt-6 rounded-[24px] border border-white/10 bg-[#0b2235] p-5 sm:p-7">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <span className="text-xs font-black tracking-[0.16em] text-blue-300">
                MA TRẬN HSK
              </span>

              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                Độ phủ câu hỏi theo
                tỉnh
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Ưu tiên bổ sung những
                ô màu đỏ và vàng trước
                khi đưa tỉnh vào luồng
                chơi chính.
              </p>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Tìm tỉnh..."
                className="h-11 rounded-xl border border-white/10 bg-[#0d2c40] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-300"
              />

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event,
                ) =>
                  setStatusFilter(
                    event
                      .target
                      .value as
                      | "all"
                      | "ready"
                      | "missing"
                      | "insufficient",
                  )
                }
                className="h-11 rounded-xl border border-white/10 bg-[#0d2c40] px-3 text-sm text-white outline-none focus:border-blue-300"
              >
                <option value="all">
                  Tất cả tình trạng
                </option>

                <option value="ready">
                  Đã đủ dữ liệu
                </option>

                <option value="missing">
                  Chưa có câu hỏi
                </option>

                <option value="insufficient">
                  Chưa đủ số lượng
                </option>

              </select>

            </div>

          </div>

          {loading ? (
            <div className="mt-6 grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10">

              <div className="text-center">

                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-300/20 border-t-blue-300" />

                <p className="mt-4 font-bold text-slate-400">
                  Đang tải thống kê...
                </p>

              </div>

            </div>
          ) : filteredCoverage.length ===
            0 ? (
            <div className="mt-6 grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10 text-center">

              <div>

                <div className="text-5xl">
                  📭
                </div>

                <h3 className="mt-4 text-lg font-black text-white">
                  Chưa có dữ liệu phù
                  hợp
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Hãy thêm tỉnh, câu
                  hỏi hoặc thay đổi bộ
                  lọc.
                </p>

              </div>

            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">

              <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left">

                <thead>

                  <tr className="text-xs uppercase tracking-wider text-slate-500">

                    <th className="px-4 py-2">
                      Tỉnh/thành
                    </th>

                    {HSK_LEVELS.map(
                      (
                        level,
                      ) => (
                        <th
                          key={
                            level
                          }
                          className="px-3 py-2 text-center"
                        >
                          HSK{" "}
                          {
                            level
                          }
                        </th>
                      ),
                    )}

                    <th className="px-3 py-2 text-center">
                      Tổng
                    </th>

                    <th className="px-3 py-2 text-center">
                      Tình trạng
                    </th>

                    <th className="px-3 py-2 text-right">
                      Thao tác
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredCoverage.map(
                    (
                      region,
                    ) => (
                      <tr
                        key={
                          region.regionId
                        }
                        className="bg-[#0d2c40]"
                      >

                        <td className="rounded-l-2xl px-4 py-4">

                          <div className="font-black text-white">
                            {
                              region.regionName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {region.chineseName ||
                              "—"}

                            {region.pinyin
                              ? ` · ${region.pinyin}`
                              : ""}
                          </div>

                          {!region.isActive && (
                            <span className="mt-2 inline-flex rounded-full bg-slate-500/10 px-2 py-1 text-[10px] font-bold text-slate-400">
                              TỈNH ĐÃ
                              ẨN
                            </span>
                          )}

                        </td>

                        {HSK_LEVELS.map(
                          (
                            level,
                          ) => (
                            <td
                              key={
                                level
                              }
                              className="px-3 py-4 text-center"
                            >
                              <CoverageCell
                                count={
                                  region
                                    .levels[
                                    level
                                  ]
                                }
                                minimum={
                                  summary.minQuestionsPerLevel
                                }
                              />
                            </td>
                          ),
                        )}

                        <td className="px-3 py-4 text-center">

                          <strong className="text-white">
                            {
                              region.activeTotal
                            }
                          </strong>

                          {region.inactiveTotal >
                            0 && (
                            <small className="mt-1 block text-slate-500">
                              +
                              {
                                region.inactiveTotal
                              }{" "}
                              ẩn
                            </small>
                          )}

                        </td>

                        <td className="px-3 py-4 text-center">

                          {region.isFullyReady ? (
                            <span className="inline-flex rounded-full bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                              ✓ ĐÃ ĐỦ
                            </span>
                          ) : region
                              .missingLevels
                              .length >
                            0 ? (
                            <span className="inline-flex rounded-full bg-red-300/10 px-3 py-1.5 text-xs font-black text-red-300">
                              ✕ THIẾU
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-300">
                              ⚠ CHƯA ĐỦ
                            </span>
                          )}

                        </td>

                        <td className="rounded-r-2xl px-3 py-4 text-right">

                          <Link
                            href="/admin/questions"
                            className="inline-flex min-h-9 items-center rounded-lg border border-blue-300/20 bg-blue-300/10 px-3 text-xs font-bold text-blue-200 transition hover:bg-blue-300/20"
                          >
                            Quản lý câu
                            hỏi →
                          </Link>

                        </td>

                      </tr>
                    ),
                  )}

                </tbody>

              </table>

            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">

            <span>
              <strong className="text-red-300">
                ●
              </strong>{" "}
              0 câu: chưa có
            </span>

            <span>
              <strong className="text-amber-300">
                ●
              </strong>{" "}
              1–
              {Math.max(
                1,
                summary.minQuestionsPerLevel -
                  1,
              )}{" "}
              câu: chưa đủ
            </span>

            <span>
              <strong className="text-emerald-300">
                ●
              </strong>{" "}
              ≥{" "}
              {
                summary.minQuestionsPerLevel
              }{" "}
              câu: đạt chuẩn
            </span>

          </div>

        </section>

        {/* ================= MANAGEMENT ================= */}

        <section className="mt-6 grid gap-5 md:grid-cols-2">

          {MANAGEMENT_ITEMS.map(
            (
              item,
            ) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={`group rounded-[24px] border p-5 transition hover:-translate-y-1 hover:shadow-2xl sm:p-6 ${item.color}`}
              >

                <div
                  className={`grid size-14 place-items-center rounded-2xl text-2xl shadow-lg ${item.iconColor}`}
                >
                  {
                    item.icon
                  }
                </div>

                <h2 className="mt-5 text-xl font-black text-white sm:text-2xl">
                  {
                    item.title
                  }
                </h2>

                <p className="mt-3 min-h-14 text-sm leading-7 text-slate-400">
                  {
                    item.description
                  }
                </p>

                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-300">
                  {
                    item.action
                  }

                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>

                </span>

              </Link>
            ),
          )}

        </section>

        {/* ================= PROCESS ================= */}

        <section className="mt-6 rounded-[24px] border border-white/10 bg-[#0b2235] p-5 sm:p-7">

          <div className="mb-6">

            <span className="text-xs font-black tracking-widest text-amber-300">
              QUY TRÌNH QUẢN LÝ
            </span>

            <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
              Thứ tự thiết lập trò
              chơi
            </h2>

          </div>

          <div className="grid gap-4 md:grid-cols-3">

            <ProcessStep
              number="1"
              title="Thêm tỉnh/thành"
              description="Khai báo nội dung và tọa độ của tỉnh trên bản đồ."
              href="/admin/regions"
            />

            <ProcessStep
              number="2"
              title="Thêm câu hỏi"
              description="Gắn câu hỏi HSK với tỉnh/thành tương ứng."
              href="/admin/questions"
            />

            <ProcessStep
              number="3"
              title="Kiểm tra trò chơi"
              description="Vào trang người chơi và thử hành trình."
              href="/"
            />

          </div>

        </section>

      </div>

    </main>
  );
}

function CoverageCell({
  count,
  minimum,
}: {
  count: number;
  minimum: number;
}) {
  if (
    count ===
    0
  ) {
    return (
      <span className="inline-flex min-w-16 justify-center rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 font-black text-red-300">
        0 ❌
      </span>
    );
  }

  if (
    count <
    minimum
  ) {
    return (
      <span className="inline-flex min-w-16 justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 font-black text-amber-300">
        {count} ⚠️
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-16 justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 font-black text-emerald-300">
      {count} ✓
    </span>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  className,
}: {
  title: string;

  value: string;

  description: string;

  icon: string;

  className: string;
}) {
  return (
    <article
      className={`rounded-[22px] border p-5 ${className}`}
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {title}
          </span>

          <strong className="mt-2 block text-3xl font-black text-white">
            {value}
          </strong>

        </div>

        <span className="text-3xl">
          {icon}
        </span>

      </div>

      <p className="mb-0 mt-3 text-xs leading-5 text-slate-400">
        {description}
      </p>

    </article>
  );
}

function ProcessStep({
  number,
  title,
  description,
  href,
}: {
  number: string;

  title: string;

  description: string;

  href: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.05]"
    >

      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-300 font-black text-[#062d32]">
        {number}
      </span>

      <div className="min-w-0">

        <h3 className="font-black text-white">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          {description}
        </p>

      </div>

    </Link>
  );
}