"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FormEvent } from "react";
import type { HSKLevel } from "@/types/game";

const QUESTION_STORAGE_KEY =
  "hsk-admin-question-bank";

const LEVELS: HSKLevel[] = [3, 4, 5, 6];

const TOPICS = [
  "Từ vựng",
  "Ngữ pháp",
  "Đọc hiểu",
  "Văn hóa",
  "Địa lý",
];

interface AdminQuestion {
  id: string;
  level: HSKLevel;
  topic: string;
  question: string;
  pinyin: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
  createdAt: string;
  updatedAt: string;
}

interface QuestionForm {
  level: HSKLevel;
  topic: string;
  question: string;
  pinyin: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  hint: string;
  explanation: string;
}

const INITIAL_FORM: QuestionForm = {
  level: 3,
  topic: "Từ vựng",
  question: "",
  pinyin: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctIndex: 0,
  hint: "",
  explanation: "",
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<
    AdminQuestion[]
  >([]);

  const [form, setForm] =
    useState<QuestionForm>(INITIAL_FORM);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");

  const [filterLevel, setFilterLevel] = useState<
    HSKLevel | "all"
  >("all");

  const [searchKeyword, setSearchKeyword] =
    useState("");

  useEffect(() => {
    try {
      const savedData = window.localStorage.getItem(
        QUESTION_STORAGE_KEY,
      );

      if (!savedData) return;

      const parsedData: unknown =
        JSON.parse(savedData);

      if (Array.isArray(parsedData)) {
        setQuestions(parsedData);
      }
    } catch (error) {
      console.error(
        "Không thể đọc ngân hàng câu hỏi:",
        error,
      );
    }
  }, []);

  const filteredQuestions = useMemo(() => {
    const normalizedKeyword = searchKeyword
      .trim()
      .toLowerCase();

    return questions
      .filter((question) => {
        if (filterLevel === "all") return true;

        return question.level === filterLevel;
      })
      .filter((question) => {
        if (!normalizedKeyword) return true;

        return (
          question.question
            .toLowerCase()
            .includes(normalizedKeyword) ||
          question.topic
            .toLowerCase()
            .includes(normalizedKeyword)
        );
      })
      .sort((first, second) => {
        return (
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime()
        );
      });
  }, [
    questions,
    filterLevel,
    searchKeyword,
  ]);

  function updateForm<K extends keyof QuestionForm>(
    field: K,
    value: QuestionForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function saveQuestionList(
    nextQuestions: AdminQuestion[],
  ) {
    setQuestions(nextQuestions);

    window.localStorage.setItem(
      QUESTION_STORAGE_KEY,
      JSON.stringify(nextQuestions),
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const options = [
      form.optionA.trim(),
      form.optionB.trim(),
      form.optionC.trim(),
      form.optionD.trim(),
    ];

    if (
      !form.question.trim() ||
      options.some((option) => !option) ||
      !form.explanation.trim()
    ) {
      setMessage(
        "Vui lòng nhập câu hỏi, đủ bốn đáp án và phần giải thích.",
      );

      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      const nextQuestions = questions.map(
        (question) => {
          if (question.id !== editingId) {
            return question;
          }

          return {
            ...question,
            level: form.level,
            topic: form.topic,
            question: form.question.trim(),
            pinyin: form.pinyin.trim(),
            options,
            correctIndex: form.correctIndex,
            hint: form.hint.trim(),
            explanation:
              form.explanation.trim(),
            updatedAt: now,
          };
        },
      );

      saveQuestionList(nextQuestions);
      setMessage("Đã cập nhật câu hỏi.");
    } else {
      const newQuestion: AdminQuestion = {
        id: crypto.randomUUID(),
        level: form.level,
        topic: form.topic,
        question: form.question.trim(),
        pinyin: form.pinyin.trim(),
        options,
        correctIndex: form.correctIndex,
        hint: form.hint.trim(),
        explanation: form.explanation.trim(),
        createdAt: now,
        updatedAt: now,
      };

      saveQuestionList([
        newQuestion,
        ...questions,
      ]);

      setMessage(
        "Đã thêm câu hỏi vào ngân hàng.",
      );
    }

    resetForm();
  }

  function startEditing(
    question: AdminQuestion,
  ) {
    setEditingId(question.id);

    setForm({
      level: question.level,
      topic: question.topic,
      question: question.question,
      pinyin: question.pinyin,
      optionA: question.options[0] ?? "",
      optionB: question.options[1] ?? "",
      optionC: question.options[2] ?? "",
      optionD: question.options[3] ?? "",
      correctIndex: question.correctIndex,
      hint: question.hint,
      explanation: question.explanation,
    });

    setMessage(
      "Đang chỉnh sửa câu hỏi đã chọn.",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function deleteQuestion(questionId: string) {
    const shouldDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa câu hỏi này?",
    );

    if (!shouldDelete) return;

    const nextQuestions = questions.filter(
      (question) =>
        question.id !== questionId,
    );

    saveQuestionList(nextQuestions);

    if (editingId === questionId) {
      resetForm();
    }

    setMessage("Đã xóa câu hỏi.");
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId(null);
  }

  return (
    <main className="min-h-screen bg-[#061522] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-[1450px]">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-emerald-300/20 bg-gradient-to-r from-[#0c2b40] to-[#092033] p-5 shadow-2xl md:flex-row md:items-center md:justify-between md:p-7">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-500 text-2xl shadow-lg shadow-emerald-400/15">
              📚
            </div>

            <div>
              <p className="m-0 text-[10px] font-black tracking-[0.17em] text-emerald-300">
                HSK SKY QUEST
              </p>

              <h1 className="mb-0 mt-1 text-2xl font-black md:text-3xl">
                Quản trị ngân hàng câu hỏi
              </h1>

              <p className="mb-0 mt-1 text-sm text-slate-400">
                Thêm và quản lý câu hỏi HSK 3–6
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-emerald-300/10"
          >
            ← Quay lại game
          </Link>
        </header>

        {/* Thống kê */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Tổng câu hỏi"
            value={questions.length}
            color="emerald"
          />

          {LEVELS.map((level) => (
            <StatCard
              key={level}
              label={`HSK ${level}`}
              value={
                questions.filter(
                  (question) =>
                    question.level === level,
                ).length
              }
              color={
                level === 3
                  ? "blue"
                  : level === 4
                    ? "amber"
                    : level === 5
                      ? "orange"
                      : "red"
              }
            />
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[480px_minmax(0,1fr)]">
          {/* Form */}
          <section className="h-fit rounded-3xl border border-emerald-300/15 bg-[#0b2235] p-5 shadow-2xl xl:sticky xl:top-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="m-0 text-[10px] font-black tracking-[0.15em] text-emerald-300">
                  {editingId
                    ? "CHỈNH SỬA"
                    : "CÂU HỎI MỚI"}
                </p>

                <h2 className="mb-0 mt-1 text-xl font-black">
                  {editingId
                    ? "Cập nhật câu hỏi"
                    : "Thêm câu hỏi"}
                </h2>
              </div>

              <span className="grid size-11 place-items-center rounded-xl bg-emerald-300/10 text-xl">
                ✍️
              </span>
            </div>

            {message && (
              <div className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                {message}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Trình độ">
                  <select
                    value={form.level}
                    onChange={(event) =>
                      updateForm(
                        "level",
                        Number(
                          event.target.value,
                        ) as HSKLevel,
                      )
                    }
                    className={inputClass}
                  >
                    {LEVELS.map((level) => (
                      <option
                        key={level}
                        value={level}
                      >
                        HSK {level}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Chủ đề">
                  <select
                    value={form.topic}
                    onChange={(event) =>
                      updateForm(
                        "topic",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  >
                    {TOPICS.map((topic) => (
                      <option
                        key={topic}
                        value={topic}
                      >
                        {topic}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Nội dung câu hỏi">
                <textarea
                  rows={3}
                  value={form.question}
                  onChange={(event) =>
                    updateForm(
                      "question",
                      event.target.value,
                    )
                  }
                  placeholder="Ví dụ: 我每天早上七点___。"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Pinyin">
                <input
                  value={form.pinyin}
                  onChange={(event) =>
                    updateForm(
                      "pinyin",
                      event.target.value,
                    )
                  }
                  placeholder="Không bắt buộc"
                  className={inputClass}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AnswerInput
                  label="Đáp án A"
                  value={form.optionA}
                  onChange={(value) =>
                    updateForm("optionA", value)
                  }
                />

                <AnswerInput
                  label="Đáp án B"
                  value={form.optionB}
                  onChange={(value) =>
                    updateForm("optionB", value)
                  }
                />

                <AnswerInput
                  label="Đáp án C"
                  value={form.optionC}
                  onChange={(value) =>
                    updateForm("optionC", value)
                  }
                />

                <AnswerInput
                  label="Đáp án D"
                  value={form.optionD}
                  onChange={(value) =>
                    updateForm("optionD", value)
                  }
                />
              </div>

              <FormField label="Đáp án chính xác">
                <select
                  value={form.correctIndex}
                  onChange={(event) =>
                    updateForm(
                      "correctIndex",
                      Number(event.target.value),
                    )
                  }
                  className={inputClass}
                >
                  <option value={0}>
                    A – {form.optionA || "Đáp án A"}
                  </option>

                  <option value={1}>
                    B – {form.optionB || "Đáp án B"}
                  </option>

                  <option value={2}>
                    C – {form.optionC || "Đáp án C"}
                  </option>

                  <option value={3}>
                    D – {form.optionD || "Đáp án D"}
                  </option>
                </select>
              </FormField>

              <FormField label="Gợi ý">
                <textarea
                  rows={2}
                  value={form.hint}
                  onChange={(event) =>
                    updateForm(
                      "hint",
                      event.target.value,
                    )
                  }
                  placeholder="Gợi ý cho người chơi"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Giải thích đáp án">
                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={(event) =>
                    updateForm(
                      "explanation",
                      event.target.value,
                    )
                  }
                  placeholder="Giải thích vì sao đáp án đúng"
                  className={inputClass}
                />
              </FormField>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="min-h-12 flex-1 rounded-xl bg-gradient-to-r from-emerald-300 to-emerald-400 px-5 font-black text-[#062d32] transition hover:-translate-y-0.5"
                >
                  {editingId
                    ? "Lưu thay đổi"
                    : "Thêm câu hỏi"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMessage("");
                    }}
                    className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-5 font-bold text-slate-300"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Danh sách */}
          <section className="rounded-3xl border border-emerald-300/15 bg-[#0b2235] p-5 shadow-2xl">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="m-0 text-[10px] font-black tracking-[0.15em] text-emerald-300">
                  NGÂN HÀNG CÂU HỎI
                </p>

                <h2 className="mb-0 mt-1 text-xl font-black">
                  Danh sách câu hỏi
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={searchKeyword}
                  onChange={(event) =>
                    setSearchKeyword(
                      event.target.value,
                    )
                  }
                  placeholder="Tìm câu hỏi..."
                  className="min-h-11 rounded-xl border border-white/10 bg-[#071a2a] px-4 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50"
                />

                <select
                  value={filterLevel}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setFilterLevel(
                      value === "all"
                        ? "all"
                        : (Number(
                            value,
                          ) as HSKLevel),
                    );
                  }}
                  className="min-h-11 rounded-xl border border-white/10 bg-[#071a2a] px-4 text-sm outline-none focus:border-emerald-300/50"
                >
                  <option value="all">
                    Tất cả HSK
                  </option>

                  {LEVELS.map((level) => (
                    <option
                      key={level}
                      value={level}
                    >
                      HSK {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-7 text-center">
                <div className="text-6xl">🗂️</div>

                <h3 className="mb-2 mt-4 text-xl font-black">
                  Chưa có câu hỏi
                </h3>

                <p className="max-w-md text-sm leading-relaxed text-slate-400">
                  Hãy sử dụng biểu mẫu bên trái để thêm
                  câu hỏi đầu tiên vào ngân hàng.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map(
                  (question, index) => (
                    <article
                      key={question.id}
                      className="rounded-2xl border border-white/10 bg-[#071b2c]/80 p-5 transition hover:border-emerald-300/25"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-300">
                              HSK {question.level}
                            </span>

                            <span className="rounded-full bg-blue-300/10 px-3 py-1 text-[10px] font-black text-blue-300">
                              {question.topic}
                            </span>

                            <span className="text-[10px] text-slate-600">
                              #{index + 1}
                            </span>
                          </div>

                          <h3 className="m-0 text-lg font-black leading-relaxed text-white">
                            {question.question}
                          </h3>

                          {question.pinyin && (
                            <p className="mb-0 mt-1 text-sm italic text-amber-200/70">
                              {question.pinyin}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(question)
                            }
                            className="rounded-xl border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-300/20"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteQuestion(
                                question.id,
                              )
                            }
                            className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-300/20"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {question.options.map(
                          (option, optionIndex) => (
                            <div
                              key={`${question.id}-${optionIndex}`}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                                optionIndex ===
                                question.correctIndex
                                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                                  : "border-white/5 bg-white/[0.025] text-slate-300"
                              }`}
                            >
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-black">
                                {String.fromCharCode(
                                  65 + optionIndex,
                                )}
                              </span>

                              <span>{option}</span>

                              {optionIndex ===
                                question.correctIndex && (
                                <span className="ml-auto text-emerald-300">
                                  ✓
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      <div className="mt-4 rounded-xl bg-white/[0.025] p-3 text-xs leading-relaxed text-slate-400">
                        <strong className="text-slate-300">
                          Giải thích:
                        </strong>{" "}
                        {question.explanation}
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-[#071a2a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/10";

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">
        {label}
      </span>

      {children}
    </label>
  );
}

function AnswerInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label}>
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={inputClass}
      />
    </FormField>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color:
    | "emerald"
    | "blue"
    | "amber"
    | "orange"
    | "red";
}) {
  const colorClasses = {
    emerald:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-300",
    blue:
      "border-blue-300/20 bg-blue-300/10 text-blue-300",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-300",
    orange:
      "border-orange-300/20 bg-orange-300/10 text-orange-300",
    red:
      "border-red-300/20 bg-red-300/10 text-red-300",
  };

  return (
    <article
      className={`rounded-2xl border p-4 ${colorClasses[color]}`}
    >
      <span className="text-[10px] font-black tracking-wider opacity-75">
        {label}
      </span>

      <strong className="mt-1 block text-3xl font-black">
        {value}
      </strong>
    </article>
  );
}