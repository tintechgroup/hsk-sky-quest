"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizSticker {
  id: string;
  type: "quiz";
  title: string;
  icon: string;
  questions: Question[];
  isActive: boolean;
}

interface Region {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;
  stickers: QuizSticker[];
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeQuestion(value: unknown, index: number): Question | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = value as Record<string, unknown>;
  const options = Array.isArray(item.options)
    ? item.options.map(text).slice(0, 4)
    : [];

  return {
    id: text(item.id) || `question-${index + 1}`,
    question: text(item.question),
    options,
    correctIndex: Math.max(0, Math.min(3, Number(item.correctIndex) || 0)),
    explanation: text(item.explanation),
  };
}

function normalizeRegion(value: unknown): Region | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = value as Record<string, unknown>;
  const stickers = Array.isArray(item.stickers) ? item.stickers : [];

  return {
    id: text(item.id) || text(item._id),
    name: text(item.name),
    chineseName: text(item.chineseName),
    pinyin: text(item.pinyin),
    slug: text(item.slug),
    stickers: stickers
      .filter(
        (sticker): sticker is Record<string, unknown> =>
          Boolean(sticker) &&
          typeof sticker === "object" &&
          !Array.isArray(sticker),
      )
      .filter((sticker) => sticker.type === "quiz")
      .map((sticker, index) => ({
        id: text(sticker.id) || `sticker-${index + 1}`,
        type: "quiz" as const,
        title: text(sticker.title) || "Thử thách trắc nghiệm",
        icon:
          text(sticker.icon) ||
          text(sticker.imageUrl) ||
          text(sticker.image) ||
          text(sticker.stickerImage) ||
          text(sticker.stickerUrl),
        questions: (Array.isArray(sticker.questions) ? sticker.questions : [])
          .map(normalizeQuestion)
          .filter((question): question is Question => question !== null),
        isActive: sticker.isActive !== false,
      })),
  };
}

const pageBackground: CSSProperties = {
  backgroundColor: "#10232b",
  backgroundImage:
    "linear-gradient(rgba(4, 15, 23, 0.12), rgba(4, 15, 23, 0.22)), url('/uploads/explore-stickers/hinhnencauhoi.png')",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
};

function Fireworks() {
  return (
    <div
      aria-hidden="true"
      className="quiz-fireworks pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {Array.from({ length: 32 }, (_, index) => {
        const angle = (index / 32) * Math.PI * 2;
        const distance = 90 + (index % 5) * 30;

        const style = {
          left: "50%",
          top: "42%",
          animationDelay: `${(index % 8) * 20}ms`,
          ["--dx" as string]: `${Math.cos(angle) * distance}px`,
          ["--dy" as string]: `${Math.sin(angle) * distance}px`,
          ["--spin" as string]: `${360 + index * 17}deg`,
        } as CSSProperties;

        return <i key={index} style={style} />;
      })}
    </div>
  );
}

export default function ExploreQuizPage() {
  const router = useRouter();

  const [region, setRegion] = useState<Region | null>(null);
  const [sticker, setSticker] = useState<QuizSticker | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fireworksKey, setFireworksKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuiz() {
      try {
        const params = new URLSearchParams(window.location.search);
        const regionId = params.get("regionId") || "";
        const stickerId = params.get("stickerId") || "";

        if (!regionId || !stickerId) {
          throw new Error("Thiếu thông tin tỉnh hoặc sticker trắc nghiệm.");
        }

        const response = await fetch("/api/explore-regions", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không tải được câu hỏi.");
        }

        const rows = Array.isArray(result.data) ? result.data : [];
        const foundRegion = rows
          .map(normalizeRegion)
          .find((item): item is Region => Boolean(item && item.id === regionId));

        const foundSticker = foundRegion?.stickers.find(
          (item) => item.id === stickerId && item.isActive,
        );

        if (!foundRegion || !foundSticker) {
          throw new Error(
            "Không tìm thấy sticker trắc nghiệm. Hãy quay lại bản đồ.",
          );
        }

        setRegion(foundRegion);
        setSticker(foundSticker);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không tải được câu hỏi.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadQuiz();

    return () => controller.abort();
  }, []);

  const questions = sticker?.questions ?? [];
  const currentQuestion = questions[questionIndex];

  const answerIsCorrect =
    answerIndex !== null &&
    currentQuestion !== undefined &&
    answerIndex === currentQuestion.correctIndex;

  function selectAnswer(index: number) {
    if (answerIndex !== null || !currentQuestion) return;

    setAnswerIndex(index);

    if (index === currentQuestion.correctIndex) {
      setScore((current) => current + 1);
      setFireworksKey((current) => current + 1);
    }
  }

  function continueQuiz() {
    if (questionIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setAnswerIndex(null);
  }

  function restartQuiz() {
    setQuestionIndex(0);
    setAnswerIndex(null);
    setScore(0);
    setFinished(false);
  }

  if (loading) {
    return (
      <main
        className="relative grid min-h-dvh place-items-center overflow-hidden px-4 text-white"
        style={pageBackground}
      >
        <div className="rounded-2xl border border-white/25 bg-[#071725]/85 px-6 py-4 text-sm font-bold shadow-2xl backdrop-blur-xl">
          <span className="mr-2 animate-pulse">✦</span>
          Đang tải thử thách...
        </div>
      </main>
    );
  }

  if (error || !region || !sticker) {
    return (
      <main
        className="relative grid min-h-dvh place-items-center overflow-hidden px-4 text-white"
        style={pageBackground}
      >
        <section className="w-full max-w-lg rounded-3xl border border-white/25 bg-[#071725]/90 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="text-5xl">🧭</div>
          <p className="mt-4 text-xs font-black tracking-[.2em] text-emerald-200">
            HSK SKY QUEST
          </p>
          <h1 className="mt-2 text-xl font-black sm:text-2xl">
            Không mở được thử thách
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {error || "Không tìm thấy dữ liệu trắc nghiệm."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/explore-china")}
            className="mt-6 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-5 py-3 font-black text-slate-950 transition hover:brightness-110"
          >
            ← Quay lại bản đồ
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-dvh overflow-hidden text-white"
      style={pageBackground}
    >
      {answerIsCorrect && !finished && (
        <div key={fireworksKey}>
          <Fireworks />
        </div>
      )}

      <header className="relative z-10 flex min-h-16 items-center justify-between gap-3 border-b border-white/20 bg-[#04111b]/60 px-3 py-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/explore-china")}
          className="rounded-xl border border-white/25 bg-black/30 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-black/45"
        >
          ← <span className="hidden sm:inline">Bản đồ</span>
        </button>

        <div className="min-w-0 text-center">
          <p className="text-[9px] font-black tracking-[.2em] text-emerald-200 sm:text-[10px]">
            HSK SKY QUEST · THỬ THÁCH
          </p>
          <p className="truncate text-sm font-black sm:text-base">
            {region.name}
            {region.chineseName ? ` · ${region.chineseName}` : ""}
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-white/25 bg-black/35 px-3 py-2 text-xs font-black text-amber-100">
          ⭐ {score}
        </span>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center justify-center p-3 py-5 sm:p-6 sm:py-8">
        <article className="w-full overflow-hidden rounded-[26px] border border-white/30 bg-[#071725]/95 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:rounded-[34px]">
          <div className="h-1.5 w-full bg-white/15">
            <div
              className="h-full bg-gradient-to-r from-emerald-300 via-cyan-200 to-amber-200 transition-all duration-500"
              style={{
                width: `${
                  finished
                    ? 100
                    : questions.length
                      ? ((questionIndex + (answerIndex !== null ? 1 : 0)) /
                          questions.length) *
                        100
                      : 0
                }%`,
              }}
            />
          </div>

          <div className="p-4 sm:p-7 md:p-9">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1.5 sm:size-14">
                  {sticker.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sticker.icon}
                      alt=""
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <span className="text-2xl">❓</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[.18em] text-amber-200 sm:text-[10px]">
                    THỬ THÁCH TRẮC NGHIỆM
                  </p>
                  <h1 className="mt-1 truncate text-lg font-black sm:text-2xl">
                    {sticker.title}
                  </h1>
                </div>
              </div>

              {questions.length > 0 && !finished && (
                <span className="rounded-full border border-white/20 bg-white/[.08] px-3.5 py-2 text-xs font-black text-slate-100">
                  Câu {questionIndex + 1} / {questions.length}
                </span>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="py-12 text-center sm:py-14">
                <div className="text-5xl">📝</div>
                <h2 className="mt-4 text-xl font-black">Chưa có câu hỏi</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Sticker này chưa có câu hỏi trắc nghiệm.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/explore-china")}
                  className="mt-6 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-5 py-3 font-black text-slate-950"
                >
                  Quay lại bản đồ
                </button>
              </div>
            ) : finished ? (
              <div className="py-9 text-center sm:py-14">
                <div className="text-6xl">
                  {score === questions.length
                    ? "🏆"
                    : score >= Math.ceil(questions.length / 2)
                      ? "😊"
                      : "😢"}
                </div>

                <p className="mt-5 text-xs font-black tracking-[.2em] text-emerald-200">
                  ĐÃ HOÀN THÀNH
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  {score === questions.length
                    ? "Xuất sắc!"
                    : score > 0
                      ? "Làm tốt lắm!"
                      : "Cố gắng lần sau nhé!"}
                </h2>
                <p className="mt-3 text-base text-slate-200">
                  Bạn trả lời đúng{" "}
                  <strong className="text-amber-200">
                    {score}/{questions.length}
                  </strong>{" "}
                  câu hỏi.
                </p>

                <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200/25 bg-emerald-300/10 p-4">
                    <p className="text-xs text-slate-300">Đúng</p>
                    <p className="mt-1 text-2xl font-black text-emerald-200">
                      {score}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-200/25 bg-rose-300/10 p-4">
                    <p className="text-xs text-slate-300">Chưa đúng</p>
                    <p className="mt-1 text-2xl font-black text-rose-200">
                      {questions.length - score}
                    </p>
                  </div>
                </div>

                <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={restartQuiz}
                    className="flex-1 rounded-xl border border-white/25 bg-white/[.08] px-5 py-3 font-bold transition hover:bg-white/15"
                  >
                    Làm lại
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/explore-china")}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-200 to-orange-200 px-5 py-3 font-black text-slate-950 transition hover:brightness-105"
                  >
                    Về bản đồ
                  </button>
                </div>
              </div>
            ) : currentQuestion ? (
              <div
                className={`mt-6 sm:mt-8 ${
                  answerIndex !== null && !answerIsCorrect ? "quiz-shake" : ""
                }`}
              >
                <div className="rounded-2xl border border-white/20 bg-[#06131d]/85 p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-amber-200/10 px-3 py-1.5 text-[10px] font-black tracking-wider text-amber-100">
                      CÂU HỎI {questionIndex + 1}
                    </span>
                    <span className="text-xs font-black text-slate-200">
                      ⭐ {score} điểm
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-black leading-7 sm:mt-5 sm:text-2xl sm:leading-9">
                    {currentQuestion.question || "Câu hỏi chưa có nội dung"}
                  </h2>
                </div>

                <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2">
                  {Array.from({ length: 4 }, (_, index) => {
                    const option = currentQuestion.options[index] || "";
                    const isCorrect = index === currentQuestion.correctIndex;
                    const isSelected = answerIndex === index;

                    let optionStyle =
                      "border-white/20 bg-[#102435]/95 hover:border-cyan-200/70 hover:bg-cyan-200/[.1]";

                    if (answerIndex !== null) {
                      if (isCorrect) {
                        optionStyle =
                          "border-emerald-300/75 bg-emerald-300/15 text-emerald-50";
                      } else if (isSelected) {
                        optionStyle =
                          "border-rose-300/75 bg-rose-300/15 text-rose-50";
                      } else {
                        optionStyle =
                          "border-white/10 bg-[#102435]/65 opacity-65";
                      }
                    }

                    return (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        type="button"
                        onClick={() => selectAnswer(index)}
                        disabled={answerIndex !== null || !option}
                        className={`flex min-h-[64px] items-center gap-3 rounded-2xl border p-3 text-left transition duration-200 sm:min-h-[76px] sm:p-4 ${optionStyle} disabled:cursor-default`}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-black">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-6 sm:text-base">
                          {option || "Chưa có nội dung đáp án"}
                        </span>

                        {answerIndex !== null && isCorrect && (
                          <span className="text-xl" aria-label="Đáp án đúng">
                            ✓
                          </span>
                        )}

                        {isSelected && !isCorrect && (
                          <span
                            className="text-xl"
                            aria-label="Đáp án chưa đúng"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {answerIndex !== null && (
                  <div
                    aria-live="polite"
                    className={`mt-4 flex items-center gap-4 rounded-2xl border p-3.5 sm:mt-5 sm:gap-5 sm:p-4 ${
                      answerIsCorrect
                        ? "border-emerald-200/40 bg-emerald-300/15"
                        : "border-rose-200/40 bg-rose-300/15"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        answerIsCorrect
                          ? "/uploads/explore-stickers/hinhvui.png"
                          : "/uploads/explore-stickers/hinhbuon.png"
                      }
                      alt={
                        answerIsCorrect
                          ? "Vui vì trả lời đúng"
                          : "Buồn vì trả lời sai"
                      }
                      className={`h-20 w-20 shrink-0 object-contain drop-shadow-lg sm:h-24 sm:w-24 ${
                        answerIsCorrect
                          ? "quiz-character-pop"
                          : "quiz-character-sad"
                      }`}
                    />

                    <div className="min-w-0">
                      <p
                        className={`text-base font-black sm:text-lg ${
                          answerIsCorrect ? "text-emerald-100" : "text-rose-100"
                        }`}
                      >
                        {answerIsCorrect
                          ? "🎉 Chính xác!"
                          : "💛 Chưa đúng rồi"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-white/90">
                        {currentQuestion.explanation ||
                          `Đáp án đúng là ${String.fromCharCode(
                            65 + currentQuestion.correctIndex,
                          )}: ${
                            currentQuestion.options[
                              currentQuestion.correctIndex
                            ] || ""
                          }`}
                      </p>
                    </div>
                  </div>
                )}

                {answerIndex !== null && (
                  <button
                    type="button"
                    onClick={continueQuiz}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-200 to-orange-200 px-5 py-3.5 font-black text-slate-950 shadow-lg transition hover:brightness-105 sm:mt-5 sm:py-4"
                  >
                    {questionIndex + 1 === questions.length
                      ? "Xem tổng kết điểm →"
                      : "Câu tiếp theo →"}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <style jsx global>{`
        @keyframes quiz-firework {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.4) rotate(0deg);
          }

          75% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--dx)),
                calc(-50% + var(--dy))
              )
              scale(0.15) rotate(var(--spin));
          }
        }

        .quiz-fireworks i {
          position: absolute;
          width: 9px;
          height: 15px;
          border-radius: 3px;
          background: #fde68a;
          box-shadow: 0 0 14px rgba(253, 230, 138, 0.8);
          animation: quiz-firework 1050ms cubic-bezier(0.12, 0.7, 0.25, 1)
            forwards;
        }

        .quiz-fireworks i:nth-child(3n) {
          background: #6ee7b7;
          box-shadow: 0 0 14px rgba(110, 231, 183, 0.8);
        }

        .quiz-fireworks i:nth-child(3n + 1) {
          background: #f9a8d4;
          box-shadow: 0 0 14px rgba(249, 168, 212, 0.8);
        }

        .quiz-fireworks i:nth-child(3n + 2) {
          background: #7dd3fc;
          box-shadow: 0 0 14px rgba(125, 211, 252, 0.8);
        }

        @keyframes quiz-character-pop {
          0% {
            transform: scale(0.65) rotate(-8deg);
            opacity: 0.4;
          }

          65% {
            transform: scale(1.12) rotate(5deg);
            opacity: 1;
          }

          100% {
            transform: scale(1) rotate(0);
          }
        }

        .quiz-character-pop {
          animation: quiz-character-pop 460ms
            cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        @keyframes quiz-character-sad {
          0%,
          100% {
            transform: translateX(0) rotate(0);
          }

          20%,
          60% {
            transform: translateX(-5px) rotate(-3deg);
          }

          40%,
          80% {
            transform: translateX(5px) rotate(3deg);
          }
        }

        .quiz-character-sad {
          animation: quiz-character-sad 420ms ease-in-out both;
        }

        @keyframes quiz-card-shake {
          0%,
          100% {
            transform: translateX(0);
          }

          25% {
            transform: translateX(-5px);
          }

          75% {
            transform: translateX(5px);
          }
        }

        .quiz-shake {
          animation: quiz-card-shake 280ms ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .quiz-fireworks i,
          .quiz-character-pop,
          .quiz-character-sad,
          .quiz-shake {
            animation-duration: 1ms !important;
          }
        }
      `}</style>
    </main>
  );
}