"use client";

import Link from "next/link";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type HSKLevel = 3 | 4 | 5 | 6;

interface Region {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  isActive: boolean;
}

interface Question {
  id: string;

  regionId: string;
  regionName: string;

  level: HSKLevel;

  topic: string;
  question: string;
  pinyin: string;

  options: string[];
  correctIndex: number;

  hint: string;
  explanation: string;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

interface QuestionForm {
  regionId: string;

  level: HSKLevel;

  topic: string;

  question: string;

  pinyin: string;

  options: [
    string,
    string,
    string,
    string,
  ];

  correctIndex: number;

  hint: string;

  explanation: string;

  isActive: boolean;
}

interface ApiResult {
  success?: boolean;
  message?: string;
  data?: unknown;
  questions?: unknown;
  regions?: unknown;
}

const HSK_LEVELS: HSKLevel[] = [
  3,
  4,
  5,
  6,
];

const ANSWER_LABELS = [
  "A",
  "B",
  "C",
  "D",
];

const INITIAL_FORM: QuestionForm = {
  regionId: "",

  level: 3,

  topic: "",

  question: "",

  pinyin: "",

  options: [
    "",
    "",
    "",
    "",
  ],

  correctIndex: 0,

  hint: "",

  explanation: "",

  isActive: true,
};

function getString(
  value: unknown,
  fallback = "",
) {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

async function readResponse(
  response: Response,
): Promise<ApiResult> {
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

function normalizeRegion(
  value: unknown,
): Region | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const raw = value as Record<
    string,
    unknown
  >;

  const id =
    getString(raw.id) ||
    getString(raw._id);

  const name = getString(raw.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,

    name,

    chineseName:
      getString(raw.chineseName),

    pinyin:
      getString(raw.pinyin),

    isActive:
      raw.isActive !== false,
  };
}

function normalizeQuestion(
  value: unknown,
  regions: Region[],
): Question | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const raw = value as Record<
    string,
    unknown
  >;

  const id =
    getString(raw.id) ||
    getString(raw._id);

  const questionText =
    getString(raw.question);

  if (!id || !questionText) {
    return null;
  }

  let regionId = "";
  let regionName = "";

  if (
    raw.region &&
    typeof raw.region === "object"
  ) {
    const populatedRegion =
      raw.region as Record<
        string,
        unknown
      >;

    regionId =
      getString(
        populatedRegion.id,
      ) ||
      getString(
        populatedRegion._id,
      );

    regionName =
      getString(
        populatedRegion.name,
      );
  } else {
    regionId =
      getString(raw.regionId) ||
      getString(raw.region);
  }

  if (!regionName) {
    regionName =
      getString(raw.regionName);
  }

  if (!regionName && regionId) {
    regionName =
      regions.find(
        (region) =>
          region.id === regionId,
      )?.name ?? "";
  }

  const rawLevel =
    Number(raw.level);

  const level: HSKLevel =
    rawLevel === 4 ||
    rawLevel === 5 ||
    rawLevel === 6
      ? rawLevel
      : 3;

  const options =
    Array.isArray(raw.options)
      ? raw.options
          .map((option) =>
            getString(option),
          )
          .slice(0, 4)
      : [];

  while (
    options.length < 4
  ) {
    options.push("");
  }

  const rawCorrectIndex =
    Number(raw.correctIndex);

  const correctIndex =
    Number.isInteger(
      rawCorrectIndex,
    ) &&
    rawCorrectIndex >= 0 &&
    rawCorrectIndex <= 3
      ? rawCorrectIndex
      : 0;

  return {
    id,

    regionId,

    regionName:
      regionName ||
      "Chưa xác định",

    level,

    topic:
      getString(raw.topic),

    question:
      questionText,

    pinyin:
      getString(raw.pinyin),

    options,

    correctIndex,

    hint:
      getString(raw.hint),

    explanation:
      getString(
        raw.explanation,
      ),

    isActive:
      raw.isActive !== false,

    createdAt:
      getString(raw.createdAt),

    updatedAt:
      getString(raw.updatedAt),
  };
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

export default function AdminQuestionsPage() {
  const [
    regions,
    setRegions,
  ] = useState<Region[]>([]);

  const [
    questions,
    setQuestions,
  ] = useState<Question[]>([]);

  const [
    form,
    setForm,
  ] =
    useState<QuestionForm>(
      INITIAL_FORM,
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    regionFilter,
    setRegionFilter,
  ] = useState("");

  const [
    levelFilter,
    setLevelFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    regionsLoading,
    setRegionsLoading,
  ] = useState(true);

  const [
    questionsLoading,
    setQuestionsLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    togglingId,
    setTogglingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadRegions =
    useCallback(async () => {
      try {
        setRegionsLoading(true);

        const response =
          await fetch(
            "/api/regions",
            {
              method: "GET",

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
            getString(
              result.message,
              "Không thể tải danh sách tỉnh/thành.",
            ),
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

        const normalized =
          rawRegions
            .map(
              normalizeRegion,
            )
            .filter(
              (
                region,
              ): region is Region =>
                region !== null,
            );

        setRegions(
          normalized,
        );

        setForm(
          (previous) => ({
            ...previous,

            regionId:
              previous.regionId ||
              normalized[0]
                ?.id ||
              "",
          }),
        );

        return normalized;
      } catch (loadError) {
        console.error(
          "GET /api/regions:",
          loadError,
        );

        setRegions([]);

        setError(
          loadError instanceof
          Error
            ? loadError.message
            : "Không thể tải danh sách tỉnh/thành.",
        );

        return [];
      } finally {
        setRegionsLoading(
          false,
        );
      }
    }, []);

  const loadQuestions =
    useCallback(
      async (
        availableRegions: Region[],
      ) => {
        try {
          setQuestionsLoading(
            true,
          );

          /*
           * QUAN TRỌNG:
           * API admin dùng
           * ?scope=admin
           */
          const response =
            await fetch(
              "/api/questions?scope=admin",
              {
                method: "GET",

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
            if (
              response.status ===
              401
            ) {
              throw new Error(
                "Bạn chưa đăng nhập.",
              );
            }

            if (
              response.status ===
              403
            ) {
              throw new Error(
                getString(
                  result.message,
                  "Tài khoản hiện tại không có quyền admin.",
                ),
              );
            }

            throw new Error(
              getString(
                result.message,
                "Không thể tải danh sách câu hỏi.",
              ),
            );
          }

          const rawQuestions =
            Array.isArray(
              result.data,
            )
              ? result.data
              : Array.isArray(
                    result.questions,
                  )
                ? result.questions
                : [];

          const normalized =
            rawQuestions
              .map(
                (question) =>
                  normalizeQuestion(
                    question,
                    availableRegions,
                  ),
              )
              .filter(
                (
                  question,
                ): question is Question =>
                  question !==
                  null,
              );

          setQuestions(
            normalized,
          );
        } catch (
          loadError
        ) {
          console.error(
            "GET /api/questions:",
            loadError,
          );

          setQuestions(
            [],
          );

          setError(
            loadError instanceof
            Error
              ? loadError.message
              : "Không thể tải danh sách câu hỏi.",
          );
        } finally {
          setQuestionsLoading(
            false,
          );
        }
      },
      [],
    );

  /*
   * ========================================
   * INITIAL DATA LOAD
   * ========================================
   */
  useEffect(() => {
    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          void (async () => {
            setError(
              "",
            );

            const loadedRegions =
              await loadRegions();

            if (
              cancelled
            ) {
              return;
            }

            await loadQuestions(
              loadedRegions,
            );
          })();
        },
        0,
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer,
      );
    };
  }, [
    loadRegions,
    loadQuestions,
  ]);

  const filteredQuestions =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return questions.filter(
        (question) => {
          const matchesSearch =
            !keyword ||
            question.question
              .toLowerCase()
              .includes(keyword) ||
            question.topic
              .toLowerCase()
              .includes(keyword) ||
            question.pinyin
              .toLowerCase()
              .includes(keyword);

          const matchesRegion =
            !regionFilter ||
            question.regionId ===
              regionFilter;

          const matchesLevel =
            !levelFilter ||
            question.level ===
              Number(
                levelFilter,
              );

          const matchesStatus =
            !statusFilter ||
            (statusFilter ===
            "active"
              ? question.isActive
              : !question.isActive);

          return (
            matchesSearch &&
            matchesRegion &&
            matchesLevel &&
            matchesStatus
          );
        },
      );
    }, [
      questions,
      search,
      regionFilter,
      levelFilter,
      statusFilter,
    ]);

  const activeCount =
    questions.filter(
      (question) =>
        question.isActive,
    ).length;

  const inactiveCount =
    questions.length -
    activeCount;

  function resetForm() {
    setForm({
      ...INITIAL_FORM,

      regionId:
        regions[0]?.id ||
        "",
    });

    setEditingId(null);
  }

  function updateForm<
    Key extends keyof QuestionForm,
  >(
    key: Key,
    value:
      QuestionForm[Key],
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [key]: value,
      }),
    );
  }

  function updateOption(
    index: number,
    value: string,
  ) {
    setForm(
      (previous) => {
        const options = [
          ...previous.options,
        ] as QuestionForm["options"];

        options[index] =
          value;

        return {
          ...previous,
          options,
        };
      },
    );
  }

  function validateForm() {
    if (!form.regionId) {
      return "Vui lòng chọn tỉnh/thành.";
    }

    if (
      !form.topic.trim()
    ) {
      return "Vui lòng nhập chủ đề.";
    }

    if (
      !form.question.trim()
    ) {
      return "Vui lòng nhập nội dung câu hỏi.";
    }

    if (
      form.options.some(
        (option) =>
          !option.trim(),
      )
    ) {
      return "Vui lòng nhập đầy đủ 4 đáp án.";
    }

    if (
      !Number.isInteger(
        form.correctIndex,
      ) ||
      form.correctIndex < 0 ||
      form.correctIndex > 3
    ) {
      return "Vui lòng chọn đáp án đúng.";
    }

    if (
      !form.explanation.trim()
    ) {
      return "Vui lòng nhập phần giải thích đáp án.";
    }

    return "";
  }

  async function updateQuestionRequest(
    questionId: string,
    payload: Record<
      string,
      unknown
    >,
  ) {
    let response =
      await fetch(
        `/api/questions/${questionId}`,
        {
          method: "PUT",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    /*
     * Nếu API không dùng PUT
     * thì thử PATCH.
     */
    if (
      response.status ===
      405
    ) {
      response =
        await fetch(
          `/api/questions/${questionId}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );
    }

    return response;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validation =
      validateForm();

    if (validation) {
      setError(
        validation,
      );

      setSuccessMessage(
        "",
      );

      return;
    }

    try {
      setSubmitting(true);

      setError("");

      setSuccessMessage(
        "",
      );

      const payload = {
        region:
          form.regionId,

        regionId:
          form.regionId,

        level:
          form.level,

        topic:
          form.topic.trim(),

        question:
          form.question.trim(),

        pinyin:
          form.pinyin.trim(),

        options:
          form.options.map(
            (option) =>
              option.trim(),
          ),

        correctIndex:
          form.correctIndex,

        hint:
          form.hint.trim(),

        explanation:
          form.explanation.trim(),

        isActive:
          form.isActive,
      };

      const response =
        editingId
          ? await updateQuestionRequest(
              editingId,
              payload,
            )
          : await fetch(
              "/api/questions",
              {
                method:
                  "POST",

                credentials:
                  "include",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                body:
                  JSON.stringify(
                    payload,
                  ),
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
        if (
          response.status ===
          401
        ) {
          throw new Error(
            "Bạn chưa đăng nhập. Hãy đăng nhập lại.",
          );
        }

        if (
          response.status ===
          403
        ) {
          throw new Error(
            getString(
              result.message,
              "Tài khoản hiện tại không có quyền quản trị câu hỏi.",
            ),
          );
        }

        throw new Error(
          getString(
            result.message,
            editingId
              ? "Không thể cập nhật câu hỏi."
              : "Không thể thêm câu hỏi.",
          ),
        );
      }

      setSuccessMessage(
        editingId
          ? "Đã cập nhật câu hỏi thành công."
          : "Đã thêm câu hỏi mới thành công.",
      );

      resetForm();

      await loadQuestions(
        regions,
      );
    } catch (
      submitError
    ) {
      console.error(
        "Lưu câu hỏi:",
        submitError,
      );

      setError(
        submitError instanceof
        Error
          ? submitError.message
          : "Không thể lưu câu hỏi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(
    question: Question,
  ) {
    setEditingId(
      question.id,
    );

    setForm({
      regionId:
        question.regionId ||
        regions[0]?.id ||
        "",

      level:
        question.level,

      topic:
        question.topic,

      question:
        question.question,

      pinyin:
        question.pinyin,

      options: [
        question.options[0] ||
          "",

        question.options[1] ||
          "",

        question.options[2] ||
          "",

        question.options[3] ||
          "",
      ],

      correctIndex:
        question.correctIndex,

      hint:
        question.hint,

      explanation:
        question.explanation,

      isActive:
        question.isActive,
    });

    setError("");

    setSuccessMessage(
      "",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function toggleQuestion(
    question: Question,
  ) {
    try {
      setTogglingId(
        question.id,
      );

      setError("");

      setSuccessMessage(
        "",
      );

      const response =
        await updateQuestionRequest(
          question.id,
          {
            isActive:
              !question.isActive,
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
          getString(
            result.message,
            "Không thể thay đổi trạng thái câu hỏi.",
          ),
        );
      }

      setQuestions(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              question.id
                ? {
                    ...item,

                    isActive:
                      !question.isActive,
                  }
                : item,
          ),
      );

      setSuccessMessage(
        question.isActive
          ? "Đã ẩn câu hỏi."
          : "Đã kích hoạt câu hỏi.",
      );
    } catch (
      toggleError
    ) {
      setError(
        toggleError instanceof
        Error
          ? toggleError.message
          : "Không thể thay đổi trạng thái.",
      );
    } finally {
      setTogglingId(
        null,
      );
    }
  }

  async function deleteQuestion(
    question: Question,
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa câu hỏi:\n"${question.question}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        question.id,
      );

      setError("");

      setSuccessMessage(
        "",
      );

      const response =
        await fetch(
          `/api/questions/${question.id}`,
          {
            method:
              "DELETE",

            credentials:
              "include",

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
          getString(
            result.message,
            "Không thể xóa câu hỏi.",
          ),
        );
      }

      setQuestions(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !==
              question.id,
          ),
      );

      if (
        editingId ===
        question.id
      ) {
        resetForm();
      }

      setSuccessMessage(
        "Đã xóa câu hỏi thành công.",
      );
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
        Error
          ? deleteError.message
          : "Không thể xóa câu hỏi.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function refreshData() {
    setError("");

    setSuccessMessage("");

    const loadedRegions =
      await loadRegions();

    await loadQuestions(
      loadedRegions,
    );
  }

  return (
    <main className="min-h-screen bg-[#03111f] font-sans text-white">

      <div className="mx-auto grid min-h-screen max-w-[1920px] lg:grid-cols-[255px_1fr]">

        {/* ================= SIDEBAR ================= */}

        <aside className="border-b border-white/10 bg-[#061b2b] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">

          <div className="border-b border-white/10 px-5 py-5">

            <Link
              href="/admin"
              className="flex items-center gap-3"
            >

              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-400 text-2xl text-slate-950">
                ✈
              </span>

              <span>

                <strong className="block text-sm font-black">
                  HSK SKY QUEST
                </strong>

                <small className="text-xs font-bold text-emerald-300">
                  ADMIN PANEL
                </small>

              </span>

            </Link>

          </div>

          <nav className="grid gap-2 p-3 sm:grid-cols-4 lg:grid-cols-1">

            <Link
              href="/admin"
              className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              📊 Tổng quan
            </Link>

            <Link
              href="/admin/regions"
              className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              🗺️ Tỉnh/thành
            </Link>

            <Link
              href="/admin/questions"
              className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-black text-white"
            >
              📝 Câu hỏi
            </Link>

            <Link
              href="/"
              className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              🎮 Xem trò chơi
            </Link>

          </nav>

        </aside>

        {/* ================= CONTENT ================= */}

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">

          {/* HEADER */}

          <header className="rounded-[28px] border border-cyan-400/20 bg-[#0a263a] p-5 shadow-xl sm:p-7">

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div>

                <span className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-black tracking-[0.14em] text-emerald-300">
                  HSK SKY QUEST ADMIN
                </span>

                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Quản lý câu hỏi
                </h1>

                <p className="mt-2 max-w-3xl leading-7 text-slate-400">
                  Quản lý ngân hàng câu hỏi theo
                  tỉnh/thành và cấp độ HSK.
                </p>

              </div>

              <div className="grid grid-cols-3 gap-3">

                <article className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-center">

                  <strong className="block text-2xl text-blue-300">
                    {questions.length}
                  </strong>

                  <span className="text-xs font-bold text-slate-300">
                    Tổng cộng
                  </span>

                </article>

                <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">

                  <strong className="block text-2xl text-emerald-300">
                    {activeCount}
                  </strong>

                  <span className="text-xs font-bold text-slate-300">
                    Hoạt động
                  </span>

                </article>

                <article className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-center">

                  <strong className="block text-2xl text-amber-300">
                    {inactiveCount}
                  </strong>

                  <span className="text-xs font-bold text-slate-300">
                    Đã ẩn
                  </span>

                </article>

              </div>

            </div>

          </header>

          {/* MESSAGE */}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-200"
            >
              ✕ {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-200"
            >
              ✓ {successMessage}
            </div>
          )}

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">

            {/* ================= FORM ================= */}

            <form
              onSubmit={
                handleSubmit
              }
              className="rounded-[28px] border border-white/10 bg-[#0a263a] p-5 shadow-xl sm:p-6 xl:sticky xl:top-6"
            >

              <span className="text-xs font-black tracking-[0.14em] text-emerald-300">
                {editingId
                  ? "CHỈNH SỬA CÂU HỎI"
                  : "CÂU HỎI MỚI"}
              </span>

              <div className="mt-2 flex items-center justify-between gap-3">

                <h2 className="text-2xl font-black">
                  {editingId
                    ? "Cập nhật câu hỏi"
                    : "Thêm câu hỏi"}
                </h2>

                {editingId && (
                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"
                  >
                    Hủy sửa
                  </button>
                )}

              </div>

              {regions.length ===
                0 &&
                !regionsLoading && (
                  <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                    Chưa có tỉnh/thành.
                    Hãy thêm tỉnh trước khi thêm câu hỏi.
                  </div>
                )}

              <div className="mt-6 grid gap-5">

                {/* REGION + HSK */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <label>

                    <span className="mb-2 block text-sm font-bold">
                      Tỉnh/thành *
                    </span>

                    <select
                      value={
                        form.regionId
                      }
                      disabled={
                        regionsLoading ||
                        regions.length ===
                          0
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "regionId",
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-12 w-full rounded-xl border border-slate-600 bg-[#103149] px-3 outline-none focus:border-emerald-400"
                    >

                      <option value="">
                        Chọn tỉnh/thành
                      </option>

                      {regions.map(
                        (
                          region,
                        ) => (
                          <option
                            key={
                              region.id
                            }
                            value={
                              region.id
                            }
                          >
                            {
                              region.name
                            }

                            {region.chineseName
                              ? ` · ${region.chineseName}`
                              : ""}
                          </option>
                        ),
                      )}

                    </select>

                  </label>

                  <label>

                    <span className="mb-2 block text-sm font-bold">
                      Cấp độ HSK *
                    </span>

                    <select
                      value={
                        form.level
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "level",
                          Number(
                            event
                              .target
                              .value,
                          ) as HSKLevel,
                        )
                      }
                      className="h-12 w-full rounded-xl border border-slate-600 bg-[#103149] px-3 outline-none focus:border-emerald-400"
                    >

                      {HSK_LEVELS.map(
                        (
                          level,
                        ) => (
                          <option
                            key={
                              level
                            }
                            value={
                              level
                            }
                          >
                            HSK{" "}
                            {
                              level
                            }
                          </option>
                        ),
                      )}

                    </select>

                  </label>

                </div>

                {/* TOPIC */}

                <label>

                  <span className="mb-2 block text-sm font-bold">
                    Chủ đề *
                  </span>

                  <input
                    value={
                      form.topic
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "topic",
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Ví dụ: Du lịch, Ẩm thực, Gia đình..."
                    className="h-12 w-full rounded-xl border border-slate-600 bg-[#103149] px-4 outline-none focus:border-emerald-400"
                  />

                </label>

                {/* QUESTION */}

                <label>

                  <span className="mb-2 block text-sm font-bold">
                    Nội dung câu hỏi *
                  </span>

                  <textarea
                    value={
                      form.question
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "question",
                        event
                          .target
                          .value,
                      )
                    }
                    rows={4}
                    placeholder="例如：中国的首都是哪里？"
                    className="w-full resize-y rounded-xl border border-slate-600 bg-[#103149] px-4 py-3 outline-none focus:border-emerald-400"
                  />

                </label>

                {/* PINYIN */}

                <label>

                  <span className="mb-2 block text-sm font-bold">
                    Phiên âm Pinyin
                  </span>

                  <input
                    value={
                      form.pinyin
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "pinyin",
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Zhōngguó de shǒudū shì nǎlǐ?"
                    className="h-12 w-full rounded-xl border border-slate-600 bg-[#103149] px-4 outline-none focus:border-emerald-400"
                  />

                </label>

                {/* OPTIONS */}

                <fieldset>

                  <legend className="mb-3 text-sm font-bold">
                    Bốn đáp án *
                  </legend>

                  <div className="grid gap-3">

                    {form.options.map(
                      (
                        option,
                        index,
                      ) => (
                        <label
                          key={
                            index
                          }
                          className={`flex items-center gap-3 rounded-xl border p-3 ${
                            form.correctIndex ===
                            index
                              ? "border-emerald-400 bg-emerald-400/10"
                              : "border-slate-700 bg-[#0c2c42]"
                          }`}
                        >

                          <input
                            type="radio"
                            name="correctIndex"
                            checked={
                              form.correctIndex ===
                              index
                            }
                            onChange={() =>
                              updateForm(
                                "correctIndex",
                                index,
                              )
                            }
                            className="h-4 w-4 accent-emerald-400"
                          />

                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 font-black">
                            {
                              ANSWER_LABELS[
                                index
                              ]
                            }
                          </span>

                          <input
                            value={
                              option
                            }
                            onChange={(
                              event,
                            ) =>
                              updateOption(
                                index,
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder={`Đáp án ${ANSWER_LABELS[index]}`}
                            className="h-10 min-w-0 flex-1 bg-transparent outline-none"
                          />

                        </label>
                      ),
                    )}

                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Chọn nút tròn bên trái để đánh dấu đáp án đúng.
                  </p>

                </fieldset>

                {/* HINT */}

                <label>

                  <span className="mb-2 block text-sm font-bold">
                    Gợi ý
                  </span>

                  <textarea
                    value={
                      form.hint
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "hint",
                        event
                          .target
                          .value,
                      )
                    }
                    rows={2}
                    placeholder="Nhập gợi ý cho người chơi..."
                    className="w-full resize-y rounded-xl border border-slate-600 bg-[#103149] px-4 py-3 outline-none focus:border-emerald-400"
                  />

                </label>

                {/* EXPLANATION */}

                <label>

                  <span className="mb-2 block text-sm font-bold">
                    Giải thích đáp án *
                  </span>

                  <textarea
                    value={
                      form.explanation
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "explanation",
                        event
                          .target
                          .value,
                      )
                    }
                    rows={3}
                    placeholder="Giải thích tại sao đáp án này chính xác..."
                    className="w-full resize-y rounded-xl border border-slate-600 bg-[#103149] px-4 py-3 outline-none focus:border-emerald-400"
                  />

                </label>

                {/* ACTIVE */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-[#0c2c42] p-4">

                  <span>

                    <strong className="block text-sm">
                      Trạng thái hoạt động
                    </strong>

                    <small className="text-slate-400">
                      Câu hỏi hoạt động sẽ được sử dụng trong trận đấu.
                    </small>

                  </span>

                  <input
                    type="checkbox"
                    checked={
                      form.isActive
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "isActive",
                        event
                          .target
                          .checked,
                      )
                    }
                    className="h-5 w-5 accent-emerald-400"
                  />

                </label>

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    regions.length ===
                      0
                  }
                  className="rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-400 px-5 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Đang lưu..."
                    : editingId
                      ? "Cập nhật câu hỏi"
                      : "Thêm câu hỏi"}
                </button>

              </div>

            </form>

            {/* ================= QUESTION LIST ================= */}

            <section className="min-w-0 rounded-[28px] border border-white/10 bg-[#0a263a] p-5 shadow-xl sm:p-6">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <span className="text-xs font-black tracking-[0.14em] text-blue-300">
                    NGÂN HÀNG CÂU HỎI
                  </span>

                  <h2 className="mt-1 text-2xl font-black">
                    Danh sách câu hỏi
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    void refreshData()
                  }
                  disabled={
                    regionsLoading ||
                    questionsLoading
                  }
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  ↻ Làm mới
                </button>

              </div>

              {/* FILTER */}

              <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">

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
                  placeholder="Tìm câu hỏi, chủ đề..."
                  className="h-12 rounded-xl border border-slate-600 bg-[#103149] px-4 outline-none focus:border-blue-400"
                />

                <select
                  value={
                    regionFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setRegionFilter(
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-12 rounded-xl border border-slate-600 bg-[#103149] px-3 outline-none focus:border-blue-400"
                >

                  <option value="">
                    Tất cả tỉnh/thành
                  </option>

                  {regions.map(
                    (
                      region,
                    ) => (
                      <option
                        key={
                          region.id
                        }
                        value={
                          region.id
                        }
                      >
                        {
                          region.name
                        }
                      </option>
                    ),
                  )}

                </select>

                <select
                  value={
                    levelFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setLevelFilter(
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-12 rounded-xl border border-slate-600 bg-[#103149] px-3 outline-none focus:border-blue-400"
                >

                  <option value="">
                    Tất cả cấp độ
                  </option>

                  {HSK_LEVELS.map(
                    (
                      level,
                    ) => (
                      <option
                        key={
                          level
                        }
                        value={
                          level
                        }
                      >
                        HSK{" "}
                        {
                          level
                        }
                      </option>
                    ),
                  )}

                </select>

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
                        .value,
                    )
                  }
                  className="h-12 rounded-xl border border-slate-600 bg-[#103149] px-3 outline-none focus:border-blue-400"
                >

                  <option value="">
                    Tất cả trạng thái
                  </option>

                  <option value="active">
                    Đang hoạt động
                  </option>

                  <option value="inactive">
                    Đã ẩn
                  </option>

                </select>

              </div>

              {/* LOADING */}

              {questionsLoading ? (
                <div className="mt-8 grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10">

                  <div className="text-center">

                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-300/20 border-t-blue-300" />

                    <p className="mt-3 text-sm font-bold text-slate-400">
                      Đang tải câu hỏi...
                    </p>

                  </div>

                </div>
              ) : filteredQuestions.length ===
                0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center">

                  <div className="text-5xl">
                    📭
                  </div>

                  <h3 className="mt-4 text-xl font-black">
                    Chưa có câu hỏi phù hợp
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    Hãy thêm câu hỏi mới hoặc thay đổi bộ lọc.
                  </p>

                </div>
              ) : (
                <div className="mt-6 grid gap-4">

                  {filteredQuestions.map(
                    (
                      question,
                    ) => (
                      <article
                        key={
                          question.id
                        }
                        className={`rounded-2xl border p-4 sm:p-5 ${
                          question.isActive
                            ? "border-white/10 bg-[#0c2c42]"
                            : "border-amber-400/20 bg-amber-400/[0.04]"
                        }`}
                      >

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                                HSK{" "}
                                {
                                  question.level
                                }
                              </span>

                              <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-[10px] font-black text-blue-300">
                                {
                                  question.regionName
                                }
                              </span>

                              {question.topic && (
                                <span className="rounded-full bg-purple-400/10 px-2.5 py-1 text-[10px] font-black text-purple-300">
                                  {
                                    question.topic
                                  }
                                </span>
                              )}

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                  question.isActive
                                    ? "bg-emerald-400/10 text-emerald-300"
                                    : "bg-amber-400/10 text-amber-300"
                                }`}
                              >
                                {question.isActive
                                  ? "● Hoạt động"
                                  : "○ Đã ẩn"}
                              </span>

                            </div>

                            <h3 className="mt-3 break-words text-lg font-black leading-relaxed text-white">
                              {
                                question.question
                              }
                            </h3>

                            {question.pinyin && (
                              <p className="mt-1 break-words text-sm italic text-amber-200">
                                {
                                  question.pinyin
                                }
                              </p>
                            )}

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">

                              {question.options.map(
                                (
                                  option,
                                  index,
                                ) => (
                                  <div
                                    key={
                                      index
                                    }
                                    className={`rounded-xl border px-3 py-2 text-sm ${
                                      index ===
                                      question.correctIndex
                                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                                        : "border-white/10 bg-white/[0.03] text-slate-300"
                                    }`}
                                  >
                                    <strong className="mr-2">
                                      {
                                        ANSWER_LABELS[
                                          index
                                        ]
                                      }
                                      .
                                    </strong>

                                    {
                                      option
                                    }

                                    {index ===
                                      question.correctIndex && (
                                      <span className="ml-2 text-emerald-300">
                                        ✓
                                      </span>
                                    )}

                                  </div>
                                ),
                              )}

                            </div>

                            {question.hint && (
                              <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/5 p-3 text-sm text-amber-100">
                                <strong>
                                  💡 Gợi ý:
                                </strong>{" "}
                                {
                                  question.hint
                                }
                              </div>
                            )}

                            {question.explanation && (
                              <div className="mt-3 rounded-xl border border-blue-400/10 bg-blue-400/5 p-3 text-sm leading-6 text-slate-300">
                                <strong className="text-blue-200">
                                  Giải thích:
                                </strong>{" "}
                                {
                                  question.explanation
                                }
                              </div>
                            )}

                            <p className="mt-4 text-xs text-slate-500">
                              Cập nhật:{" "}
                              {formatDate(
                                question.updatedAt ||
                                  question.createdAt,
                              )}
                            </p>

                          </div>

                          <div className="grid shrink-0 grid-cols-3 gap-2 xl:w-[300px]">

                            <button
                              type="button"
                              onClick={() =>
                                startEditing(
                                  question,
                                )
                              }
                              className="min-h-11 rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 text-xs font-black text-blue-200 transition hover:bg-blue-400/20"
                            >
                              ✏️ Sửa
                            </button>

                            <button
                              type="button"
                              disabled={
                                togglingId ===
                                question.id
                              }
                              onClick={() =>
                                void toggleQuestion(
                                  question,
                                )
                              }
                              className="min-h-11 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 text-xs font-black text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
                            >
                              {togglingId ===
                              question.id
                                ? "..."
                                : question.isActive
                                  ? "Ẩn"
                                  : "Bật"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                deletingId ===
                                question.id
                              }
                              onClick={() =>
                                void deleteQuestion(
                                  question,
                                )
                              }
                              className="min-h-11 rounded-xl border border-red-400/20 bg-red-400/10 px-3 text-xs font-black text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
                            >
                              {deletingId ===
                              question.id
                                ? "..."
                                : "🗑 Xóa"}
                            </button>

                          </div>

                        </div>

                      </article>
                    ),
                  )}

                </div>
              )}

            </section>

          </div>

        </section>

      </div>

    </main>
  );
}