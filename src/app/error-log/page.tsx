"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type FilterType =
  | "all"
  | "unreviewed"
  | "reviewed";

interface PopulatedQuestion {
  _id?: string;
  id?: string;
  question?: string;
  pinyin?: string;
  topic?: string;
  level?: number;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
}

interface PopulatedRegion {
  _id?: string;
  id?: string;
  name?: string;
  chineseName?: string;
  pinyin?: string;
}

interface ErrorLogItem {
  _id: string;
  id?: string;

  question?:
    | string
    | PopulatedQuestion;

  region?:
    | string
    | PopulatedRegion;

  questionSnapshot?: string;
  questionText?: string;

  pinyinSnapshot?: string;
  pinyin?: string;

  topicSnapshot?: string;
  topic?: string;

  levelSnapshot?: number;
  level?: number;

  regionNameSnapshot?: string;
  regionName?: string;

  selectedAnswer?: string;
  selectedAnswerSnapshot?: string;

  correctAnswer?: string;
  correctAnswerSnapshot?: string;

  explanationSnapshot?: string;
  explanation?: string;

  wrongCount: number;
  reviewed: boolean;

  lastWrongAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ErrorLogsResponse {
  success: boolean;
  data?: ErrorLogItem[];
  total?: number;
  message?: string;
}

function getQuestionText(
  item: ErrorLogItem,
) {
  if (
    item.question &&
    typeof item.question === "object"
  ) {
    return (
      item.question.question ||
      item.questionSnapshot ||
      item.questionText ||
      "Câu hỏi không còn tồn tại"
    );
  }

  return (
    item.questionSnapshot ||
    item.questionText ||
    "Câu hỏi không còn tồn tại"
  );
}

function getPinyin(
  item: ErrorLogItem,
) {
  if (
    item.question &&
    typeof item.question === "object"
  ) {
    return (
      item.question.pinyin ||
      item.pinyinSnapshot ||
      item.pinyin ||
      ""
    );
  }

  return (
    item.pinyinSnapshot ||
    item.pinyin ||
    ""
  );
}

function getTopic(
  item: ErrorLogItem,
) {
  if (
    item.question &&
    typeof item.question === "object"
  ) {
    return (
      item.question.topic ||
      item.topicSnapshot ||
      item.topic ||
      "Chưa phân loại"
    );
  }

  return (
    item.topicSnapshot ||
    item.topic ||
    "Chưa phân loại"
  );
}

function getLevel(
  item: ErrorLogItem,
) {
  if (
    item.question &&
    typeof item.question === "object" &&
    item.question.level
  ) {
    return item.question.level;
  }

  return (
    item.levelSnapshot ||
    item.level ||
    0
  );
}

function getRegionName(
  item: ErrorLogItem,
) {
  if (
    item.region &&
    typeof item.region === "object"
  ) {
    return (
      item.region.name ||
      item.regionNameSnapshot ||
      item.regionName ||
      "Chưa xác định"
    );
  }

  return (
    item.regionNameSnapshot ||
    item.regionName ||
    "Chưa xác định"
  );
}

function getSelectedAnswer(
  item: ErrorLogItem,
) {
  return (
    item.selectedAnswer ||
    item.selectedAnswerSnapshot ||
    "Không trả lời – hết thời gian"
  );
}

function getCorrectAnswer(
  item: ErrorLogItem,
) {
  return (
    item.correctAnswer ||
    item.correctAnswerSnapshot ||
    "Không còn dữ liệu đáp án"
  );
}

function getExplanation(
  item: ErrorLogItem,
) {
  if (
    item.question &&
    typeof item.question === "object"
  ) {
    return (
      item.question.explanation ||
      item.explanationSnapshot ||
      item.explanation ||
      ""
    );
  }

  return (
    item.explanationSnapshot ||
    item.explanation ||
    ""
  );
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "Chưa xác định";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default function ErrorLogPage() {
  const router =
    useRouter();

  const [
    items,
    setItems,
  ] =
    useState<
      ErrorLogItem[]
    >([]);

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "all",
    );

  const [
    searchText,
    setSearchText,
  ] =
    useState("");

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
    message,
    setMessage,
  ] =
    useState("");

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

  const loadErrorLogs =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          "",
        );

        try {
          const response =
            await fetch(
              "/api/error-logs",
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              ErrorLogsResponse;

          if (
            response.status ===
            401
          ) {
            router.push(
              "/login?returnUrl=%2Ferror-log",
            );

            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Không thể tải Error Log.",
            );
          }

          setItems(
            Array.isArray(
              result.data,
            )
              ? result.data
              : [],
          );
        } catch (
          loadError
        ) {
          console.error(
            "Không thể tải Error Log:",
            loadError,
          );

          setError(
            loadError instanceof
            Error
              ? loadError.message
              : "Đã xảy ra lỗi khi tải dữ liệu.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        router,
      ],
    );

  /*
   * ========================================
   * AUTO LOAD ERROR LOG
   * ========================================
   *
   * Không gọi loadErrorLogs() trực tiếp
   * trong body của effect.
   *
   * React ESLint mới sẽ báo:
   * react-hooks/set-state-in-effect
   *
   * Schedule request sang task tiếp theo.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadErrorLogs();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    loadErrorLogs,
  ]);

  /*
   * Tự động ẩn thông báo thành công.
   */
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setMessage(
            "",
          );
        },
        3000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    message,
  ]);

  const statistics =
    useMemo(
      () => {
        const total =
          items.length;

        const reviewed =
          items.filter(
            (
              item,
            ) =>
              item.reviewed,
          ).length;

        const unreviewed =
          total -
          reviewed;

        const totalWrongAttempts =
          items.reduce(
            (
              totalValue,
              item,
            ) =>
              totalValue +
              Math.max(
                1,
                Number(
                  item.wrongCount,
                ) || 1,
              ),
            0,
          );

        return {
          total,
          reviewed,
          unreviewed,
          totalWrongAttempts,
        };
      },
      [
        items,
      ],
    );

  const filteredItems =
    useMemo(
      () => {
        const keyword =
          searchText
            .trim()
            .toLowerCase();

        return items.filter(
          (
            item,
          ) => {
            if (
              filter ===
                "reviewed" &&
              !item.reviewed
            ) {
              return false;
            }

            if (
              filter ===
                "unreviewed" &&
              item.reviewed
            ) {
              return false;
            }

            if (
              !keyword
            ) {
              return true;
            }

            const searchableText =
              [
                getQuestionText(
                  item,
                ),
                getPinyin(
                  item,
                ),
                getTopic(
                  item,
                ),
                getRegionName(
                  item,
                ),
                getSelectedAnswer(
                  item,
                ),
                getCorrectAnswer(
                  item,
                ),
              ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
              keyword,
            );
          },
        );
      },
      [
        filter,
        items,
        searchText,
      ],
    );

  async function toggleReviewed(
    item: ErrorLogItem,
  ) {
    if (
      updatingId
    ) {
      return;
    }

    setUpdatingId(
      item._id,
    );

    setError(
      "",
    );

    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/error-logs/${item._id}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                reviewed:
                  !item.reviewed,
              }),
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;

          message?: string;
        };

      if (
        response.status ===
        401
      ) {
        router.push(
          "/login?returnUrl=%2Ferror-log",
        );

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể cập nhật câu hỏi.",
        );
      }

      setItems(
        (
          previous,
        ) =>
          previous.map(
            (
              oldItem,
            ) =>
              oldItem._id ===
              item._id
                ? {
                    ...oldItem,

                    reviewed:
                      !oldItem.reviewed,
                  }
                : oldItem,
          ),
      );

      setMessage(
        !item.reviewed
          ? "Đã đánh dấu câu hỏi là đã ôn tập."
          : "Đã chuyển về trạng thái chưa ôn tập.",
      );
    } catch (
      updateError
    ) {
      console.error(
        "Không thể cập nhật:",
        updateError,
      );

      setError(
        updateError instanceof
        Error
          ? updateError.message
          : "Không thể cập nhật câu hỏi.",
      );
    } finally {
      setUpdatingId(
        null,
      );
    }
  }

  async function deleteItem(
    item: ErrorLogItem,
  ) {
    if (
      deletingId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Bạn có chắc muốn xóa câu hỏi này khỏi Error Log không?",
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeletingId(
      item._id,
    );

    setError(
      "",
    );

    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/error-logs/${item._id}`,
          {
            method:
              "DELETE",

            credentials:
              "include",
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;

          message?: string;
        };

      if (
        response.status ===
        401
      ) {
        router.push(
          "/login?returnUrl=%2Ferror-log",
        );

        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể xóa câu hỏi.",
        );
      }

      setItems(
        (
          previous,
        ) =>
          previous.filter(
            (
              oldItem,
            ) =>
              oldItem._id !==
              item._id,
          ),
      );

      setMessage(
        "Đã xóa câu hỏi khỏi Error Log.",
      );
    } catch (
      deleteError
    ) {
      console.error(
        "Không thể xóa Error Log:",
        deleteError,
      );

      setError(
        deleteError instanceof
        Error
          ? deleteError.message
          : "Không thể xóa câu hỏi.",
      );
    } finally {
      setDeletingId(
        null,
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#061827] px-3 py-4 font-sans text-white sm:px-5 sm:py-7 lg:px-8">

      <div className="mx-auto w-full max-w-7xl">

        {/* Thanh điều hướng */}

        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-emerald-300/15 bg-[#0b2436] p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">

          <div className="flex min-w-0 items-center gap-3">

            <Link
              href="/"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-300 text-xl text-[#062d32]"
              aria-label="Về trang chủ"
            >
              ✈
            </Link>

            <div className="min-w-0">

              <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300">
                HSK Sky Quest
              </span>

              <h1 className="truncate text-xl font-black text-white sm:text-2xl">
                Sổ câu trả lời sai
              </h1>

            </div>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">

            <Link
              href="/"
              className="grid min-h-11 place-items-center rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              ← Trang chủ
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadErrorLogs()
              }
              disabled={
                loading
              }
              className="min-h-11 rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#062d32] transition hover:bg-emerald-200 disabled:opacity-50"
            >
              {loading
                ? "Đang tải..."
                : "Làm mới"}
            </button>

          </div>

        </header>

        {/* Tiêu đề */}

        <section className="mb-5 overflow-hidden rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-[#12334a] via-[#0c263a] to-[#071a29] p-5 shadow-2xl sm:p-8">

          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <span className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                Error Log
              </span>

              <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
                Học lại từ những câu sai
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Những câu trả lời chưa chính xác
                được lưu theo tài khoản của bạn.
                Hãy xem lại lời giải và đánh dấu
                sau khi đã ôn tập.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[480px]">

              <StatisticCard
                label="Câu sai"
                value={
                  statistics.total
                }
                color="red"
              />

              <StatisticCard
                label="Lần trả lời sai"
                value={
                  statistics.totalWrongAttempts
                }
                color="amber"
              />

              <StatisticCard
                label="Chưa ôn"
                value={
                  statistics.unreviewed
                }
                color="blue"
              />

              <StatisticCard
                label="Đã ôn"
                value={
                  statistics.reviewed
                }
                color="emerald"
              />

            </div>

          </div>

        </section>

        {/* Bộ lọc */}

        <section className="mb-5 rounded-2xl border border-white/10 bg-[#0b2436] p-4 sm:p-5">

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">

            <label className="relative block">

              <span className="sr-only">
                Tìm kiếm câu hỏi
              </span>

              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                🔍
              </span>

              <input
                type="search"
                value={
                  searchText
                }
                onChange={(
                  event,
                ) =>
                  setSearchText(
                    event.target.value,
                  )
                }
                placeholder="Tìm câu hỏi, chủ đề, tỉnh hoặc đáp án..."
                className="min-h-12 w-full rounded-xl border border-white/10 bg-[#061827] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300/50"
              />

            </label>

            <div className="grid grid-cols-3 gap-2">

              <FilterButton
                active={
                  filter ===
                  "all"
                }
                onClick={() =>
                  setFilter(
                    "all",
                  )
                }
              >
                Tất cả
              </FilterButton>

              <FilterButton
                active={
                  filter ===
                  "unreviewed"
                }
                onClick={() =>
                  setFilter(
                    "unreviewed",
                  )
                }
              >
                Chưa ôn
              </FilterButton>

              <FilterButton
                active={
                  filter ===
                  "reviewed"
                }
                onClick={() =>
                  setFilter(
                    "reviewed",
                  )
                }
              >
                Đã ôn
              </FilterButton>

            </div>

          </div>

        </section>

        {/* Thông báo */}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"
          >
            <strong>
              Không thể thực hiện:
            </strong>{" "}
            {error}
          </div>
        )}

        {/* Trạng thái tải */}

        {loading && (
          <section className="grid min-h-[360px] place-items-center rounded-3xl border border-white/10 bg-[#0b2436] p-6 text-center">

            <div>

              <div className="mx-auto size-12 animate-spin rounded-full border-4 border-emerald-300/20 border-t-emerald-300" />

              <strong className="mt-4 block text-lg">
                Đang tải câu trả lời sai
              </strong>

              <p className="mt-1 text-sm text-slate-400">
                Vui lòng chờ trong giây lát...
              </p>

            </div>

          </section>
        )}

        {/* Không có dữ liệu */}

        {!loading &&
          filteredItems.length ===
            0 && (
            <section className="grid min-h-[360px] place-items-center rounded-3xl border border-white/10 bg-[#0b2436] p-6 text-center">

              <div className="max-w-md">

                <div className="text-7xl">
                  {items.length ===
                  0
                    ? "🎉"
                    : "🔎"}
                </div>

                <h2 className="mt-4 text-2xl font-black">
                  {items.length ===
                  0
                    ? "Chưa có câu trả lời sai"
                    : "Không tìm thấy kết quả"}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {items.length ===
                  0
                    ? "Hãy bắt đầu một trận đấu. Những câu trả lời sai sẽ tự động xuất hiện tại đây."
                    : "Hãy thử thay đổi từ khóa hoặc trạng thái lọc."}
                </p>

                <Link
                  href="/"
                  className="mt-6 inline-grid min-h-12 place-items-center rounded-xl bg-emerald-300 px-6 font-black text-[#062d32]"
                >
                  Bắt đầu hành trình
                </Link>

              </div>

            </section>
          )}

        {/* Danh sách câu sai */}

        {!loading &&
          filteredItems.length >
            0 && (
            <div className="grid gap-4">

              {filteredItems.map(
                (
                  item,
                  index,
                ) => (
                  <ErrorLogCard
                    key={
                      item._id
                    }
                    item={
                      item
                    }
                    index={
                      index
                    }
                    updating={
                      updatingId ===
                      item._id
                    }
                    deleting={
                      deletingId ===
                      item._id
                    }
                    onToggleReviewed={() =>
                      void toggleReviewed(
                        item,
                      )
                    }
                    onDelete={() =>
                      void deleteItem(
                        item,
                      )
                    }
                  />
                ),
              )}

            </div>
          )}

      </div>

    </main>
  );
}

function ErrorLogCard({
  item,
  index,
  updating,
  deleting,
  onToggleReviewed,
  onDelete,
}: {
  item: ErrorLogItem;

  index: number;

  updating: boolean;

  deleting: boolean;

  onToggleReviewed:
    () => void;

  onDelete:
    () => void;
}) {
  const questionText =
    getQuestionText(
      item,
    );

  const pinyin =
    getPinyin(
      item,
    );

  const topic =
    getTopic(
      item,
    );

  const level =
    getLevel(
      item,
    );

  const regionName =
    getRegionName(
      item,
    );

  const selectedAnswer =
    getSelectedAnswer(
      item,
    );

  const correctAnswer =
    getCorrectAnswer(
      item,
    );

  const explanation =
    getExplanation(
      item,
    );

  return (
    <article
      className={`overflow-hidden rounded-2xl border shadow-xl sm:rounded-3xl ${
        item.reviewed
          ? "border-emerald-300/25 bg-[#0b2935]"
          : "border-red-300/20 bg-[#0d2436]"
      }`}
    >

      <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

        <div className="flex min-w-0 items-start gap-3">

          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl font-black ${
              item.reviewed
                ? "bg-emerald-300 text-[#062d32]"
                : "bg-red-300 text-[#3b0c12]"
            }`}
          >
            {index + 1}
          </span>

          <div className="min-w-0">

            <div className="flex flex-wrap gap-2">

              {level >
                0 && (
                <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-300">
                  HSK {level}
                </span>
              )}

              <span className="max-w-[200px] truncate rounded-full bg-blue-300/10 px-2.5 py-1 text-[10px] font-black text-blue-300">
                {topic}
              </span>

              <span className="max-w-[200px] truncate rounded-full bg-purple-300/10 px-2.5 py-1 text-[10px] font-black text-purple-200">
                📍{" "}
                {regionName}
              </span>

            </div>

            <small className="mt-2 block text-xs text-slate-500">
              Lần sai gần nhất:{" "}
              {formatDate(
                item.lastWrongAt ||
                  item.updatedAt ||
                  item.createdAt,
              )}
            </small>

          </div>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              item.reviewed
                ? "bg-emerald-300/15 text-emerald-200"
                : "bg-red-300/15 text-red-200"
            }`}
          >
            {item.reviewed
              ? "✓ Đã ôn tập"
              : "● Chưa ôn tập"}
          </span>

          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
            Sai ×
            {Math.max(
              1,
              Number(
                item.wrongCount,
              ) || 1,
            )}
          </span>

        </div>

      </header>

      <div className="p-4 sm:p-6">

        <h2 className="break-words text-lg font-black leading-relaxed text-white sm:text-xl lg:text-2xl">
          {questionText}
        </h2>

        {pinyin && (
          <p className="mt-2 break-words text-sm italic leading-relaxed text-amber-200">
            {pinyin}
          </p>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2">

          <div className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4">

            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-red-300">
              Câu trả lời của bạn
            </span>

            <p className="mt-2 break-words text-sm font-bold leading-relaxed text-red-100 sm:text-base">
              ✕{" "}
              {selectedAnswer}
            </p>

          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">

            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
              Đáp án chính xác
            </span>

            <p className="mt-2 break-words text-sm font-bold leading-relaxed text-emerald-100 sm:text-base">
              ✓{" "}
              {correctAnswer}
            </p>

          </div>

        </div>

        {explanation && (
          <div className="mt-4 rounded-2xl border border-blue-300/15 bg-blue-300/5 p-4">

            <strong className="text-sm text-blue-200">
              💡 Giải thích
            </strong>

            <p className="mt-2 break-words text-sm leading-relaxed text-slate-300">
              {explanation}
            </p>

          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">

          <button
            type="button"
            disabled={
              updating ||
              deleting
            }
            onClick={
              onToggleReviewed
            }
            className={`min-h-12 rounded-xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
              item.reviewed
                ? "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                : "bg-emerald-300 text-[#062d32] hover:bg-emerald-200"
            }`}
          >
            {updating
              ? "Đang cập nhật..."
              : item.reviewed
                ? "Đánh dấu chưa ôn"
                : "✓ Đánh dấu đã ôn"}
          </button>

          <button
            type="button"
            disabled={
              deleting ||
              updating
            }
            onClick={
              onDelete
            }
            className="min-h-12 rounded-xl border border-red-300/20 bg-red-400/10 px-5 text-sm font-bold text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "Đang xóa..."
              : "🗑 Xóa"}
          </button>

        </div>

      </div>

    </article>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;

  onClick:
    () => void;

  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`min-h-11 rounded-xl px-3 text-xs font-black transition sm:px-4 sm:text-sm ${
        active
          ? "bg-emerald-300 text-[#062d32]"
          : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function StatisticCard({
  label,
  value,
  color,
}: {
  label: string;

  value: number;

  color:
    | "red"
    | "amber"
    | "blue"
    | "emerald";
}) {
  const colorClasses = {
    red:
      "border-red-300/20 bg-red-300/10 text-red-200",

    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-200",

    blue:
      "border-blue-300/20 bg-blue-300/10 text-blue-200",

    emerald:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  };

  return (
    <article
      className={`rounded-2xl border p-3 text-center ${colorClasses[color]}`}
    >

      <strong className="block text-2xl font-black sm:text-3xl">
        {value}
      </strong>

      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </span>

    </article>
  );
}