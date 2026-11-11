"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

interface ExploreQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ExploreSticker {
  id: string;
  type: "info" | "quiz";
  title: string;
  icon: string;
  questions: ExploreQuestion[];
  isActive: boolean;
}

interface ExploreRegion {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  stickers: ExploreSticker[];
  isActive: boolean;
}

function getText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeQuestion(
  value: unknown,
  index: number,
): ExploreQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const options = Array.isArray(raw.options)
    ? raw.options.map(getText).slice(0, 4)
    : [];

  const parsedIndex = Number(raw.correctIndex);
  const correctIndex = Number.isFinite(parsedIndex)
    ? Math.max(0, Math.min(Math.max(0, options.length - 1), parsedIndex))
    : 0;

  return {
    id: getText(raw.id) || `question-${index + 1}`,
    question: getText(raw.question),
    options,
    correctIndex,
    explanation: getText(raw.explanation),
  };
}

function normalizeRegion(value: unknown): ExploreRegion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const id = getText(raw.id) || getText(raw._id);
  const name = getText(raw.name);

  if (!id || !name) return null;

  const rawStickers = Array.isArray(raw.stickers) ? raw.stickers : [];

  const stickers = rawStickers
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        !Array.isArray(item),
    )
    .map((item, index): ExploreSticker => {
      const rawQuestions = Array.isArray(item.questions)
        ? item.questions
        : [];

      return {
        id: getText(item.id) || `sticker-${index + 1}`,
        type: item.type === "quiz" ? "quiz" : "info",
        title: getText(item.title) || "Thử thách trắc nghiệm",
        icon:
          getText(item.icon) ||
          getText(item.imageUrl) ||
          getText(item.image) ||
          getText(item.stickerImage),
        questions: rawQuestions
          .map(normalizeQuestion)
          .filter(
            (question): question is ExploreQuestion => question !== null,
          ),
        isActive: item.isActive !== false,
      };
    });

  return {
    id,
    name,
    chineseName: getText(raw.chineseName),
    pinyin: getText(raw.pinyin),
    stickers,
    isActive: raw.isActive !== false,
  };
}

function ShrimpIllustration() {
  return (
    <div className="relative grid size-20 place-items-center rounded-[28px] border border-amber-200/40 bg-[#071522]/50 shadow-[0_20px_60px_rgba(251,146,60,.2)] backdrop-blur-sm sm:size-24">
      <span className="text-5xl drop-shadow-[0_8px_20px_rgba(251,146,60,.4)] sm:text-6xl">
        🦞
      </span>
      <span className="absolute -right-2 -top-2 grid size-9 place-items-center rounded-xl border border-amber-200/40 bg-[#102537]/85 text-lg">
        🥢
      </span>
    </div>
  );
}

export default function ExploreChinaQuizPage() {
  const router = useRouter();

  const [region, setRegion] = useState<ExploreRegion | null>(null);
  const [sticker, setSticker] = useState<ExploreSticker | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [feedbackSeconds, setFeedbackSeconds] = useState(4);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuiz() {
      const params = new URLSearchParams(window.location.search);
      const regionId = params.get("regionId");
      const stickerId = params.get("stickerId");

      if (!regionId || !stickerId) {
        setError("Thiếu thông tin tỉnh hoặc sticker trong đường dẫn.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/explore-regions", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Không tải được dữ liệu câu hỏi.",
          );
        }

        const rows = Array.isArray(result.data) ? result.data : [];
        const regions = rows
          .map(normalizeRegion)
          .filter(
            (item): item is ExploreRegion => item !== null && item.isActive,
          );

        const selectedRegion = regions.find((item) => item.id === regionId);
        const selectedSticker = selectedRegion?.stickers.find(
          (item) => item.id === stickerId && item.isActive,
        );

        if (!selectedRegion || !selectedSticker) {
          throw new Error("Không tìm thấy tỉnh hoặc sticker trắc nghiệm.");
        }

        if (selectedSticker.type !== "quiz") {
          throw new Error("Sticker này không phải loại trắc nghiệm.");
        }

        if (selectedSticker.questions.length === 0) {
          throw new Error("Sticker này chưa có câu hỏi.");
        }

        const invalidQuestion = selectedSticker.questions.find(
          (question) =>
            !question.question.trim() ||
            question.options.length !== 4 ||
            question.options.some((option) => !option.trim()),
        );

        if (invalidQuestion) {
          throw new Error(
            "Có câu hỏi chưa đủ nội dung hoặc chưa có đủ bốn đáp án.",
          );
        }

        setRegion(selectedRegion);
        setSticker(selectedSticker);
      } catch (loadError) {
        if (
          loadError instanceof Error &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không tải được câu hỏi.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadQuiz();

    return () => controller.abort();
  }, []);

  const questions = sticker?.questions ?? [];
  const currentQuestion = questions[questionIndex];

  const isAnswerCorrect =
    selectedAnswer !== null &&
    currentQuestion !== undefined &&
    selectedAnswer === currentQuestion.correctIndex;

  const progress =
    questions.length > 0
      ? ((questionIndex + (selectedAnswer !== null ? 1 : 0)) /
          questions.length) *
        100
      : 0;

  function goBackToMap() {
    router.push("/explore-china");
  }

  function startQuiz() {
    setHasStarted(true);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setFeedbackSeconds(4);
    setIsFinished(false);
  }

  function chooseAnswer(index: number) {
    if (selectedAnswer !== null || !currentQuestion) return;

    setSelectedAnswer(index);
    setFeedbackSeconds(4);

    if (index === currentQuestion.correctIndex) {
      setScore((current) => current + 1);
    }
  }

  function goToNextQuestion() {
    if (selectedAnswer === null) return;

    if (questionIndex + 1 >= questions.length) {
      setIsFinished(true);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedAnswer(null);
    setFeedbackSeconds(4);
  }

  function retryQuiz() {
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setFeedbackSeconds(4);
    setIsFinished(false);
    setHasStarted(false);
  }

  // Giữ ảnh phản hồi và nút trên màn hình.
  // Người chơi bấm nút thì chuyển ngay; nếu không bấm thì tự chuyển sau 4 giây.
  useEffect(() => {
    if (selectedAnswer === null || !hasStarted || isFinished) return;

    const countdown = window.setInterval(() => {
      setFeedbackSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    const autoAdvance = window.setTimeout(() => {
      if (questionIndex + 1 >= questions.length) {
        setIsFinished(true);
        return;
      }

      setQuestionIndex((current) => current + 1);
      setSelectedAnswer(null);
      setFeedbackSeconds(4);
    }, 4000);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(autoAdvance);
    };
  }, [
    selectedAnswer,
    questionIndex,
    questions.length,
    hasStarted,
    isFinished,
  ]);

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#04111b] px-4 text-white">
        <div className="text-center">
          <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-2xl">
            ❓
          </span>
          <p className="mt-4 text-sm text-white">
            Đang tải câu hỏi · 正在加载题目…
          </p>
        </div>
      </main>
    );
  }

  if (error || !region || !sticker || !currentQuestion) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#04111b] px-4 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-rose-200/25 bg-[#101d29]/85 p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-300/15 text-3xl">
            😢
          </div>

          <h1 className="mt-4 text-xl font-black">
            Không mở được thử thách
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-100">
            无法打开挑战
          </p>
          <p className="mt-3 text-sm leading-6 text-white">
            {error || "Sticker chưa có nội dung câu hỏi."}
          </p>

          <button
            type="button"
            onClick={goBackToMap}
            className="mt-5 min-h-11 rounded-xl border border-white/35 bg-white/[.08] px-5 text-sm font-bold transition hover:bg-white/15"
          >
            ← Quay lại bản đồ · 返回地图
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#04111b] text-white">
      {/* Ảnh nền phố Hộ Bộ Hạng */}
      <div
        className="pointer-events-none absolute inset-0 -z-30 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/uploads/explore-stickers/hinhnencauhoi.png')",
        }}
      />

      {/* Lớp phủ kính tối nhẹ, vẫn nhìn thấy hình nền */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[#06121d]/20" />

      <header className="sticky top-0 z-40 flex min-h-[66px] items-center justify-between gap-2 border-b border-white/25 bg-[#071522]/45 px-3 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={goBackToMap}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/35 bg-[#071522]/40 px-3 text-xs font-bold text-white transition hover:bg-[#071522]/60 sm:px-4 sm:text-sm"
        >
          <span aria-hidden="true">←</span>
          <span>Bản đồ · 地图</span>
        </button>

        <div className="min-w-0 text-center drop-shadow-[0_1px_3px_rgba(0,0,0,.95)]">
          <p className="truncate text-[9px] font-black tracking-[.18em] text-emerald-100 sm:text-[10px]">
            HSK SKY QUEST · THỬ THÁCH · 挑战
          </p>
          <p className="truncate text-xs font-black text-white sm:text-sm">
            学霸，你好！
          </p>
          <p className="truncate text-[10px] text-white sm:text-xs">
            {region.name}
            {region.chineseName ? ` · ${region.chineseName}` : ""}
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-amber-100/35 bg-[#071522]/45 px-3 py-2 text-xs font-black text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,.95)]">
          ⭐ {score}
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100dvh-66px)] w-full max-w-5xl items-center justify-center px-3 py-5 sm:px-6 sm:py-8">
        <div className="relative w-full overflow-hidden rounded-[24px] border border-white/35 bg-[#0a1925]/55 shadow-[0_20px_65px_rgba(0,0,0,.28)] backdrop-blur-md sm:rounded-[30px]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[.06] via-transparent to-black/[.08]" />

          {!hasStarted ? (
            <div className="relative px-5 py-7 sm:px-9 sm:py-9">
              <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-amber-300/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 size-52 rounded-full bg-red-400/10 blur-3xl" />

              <div className="relative flex flex-col items-center text-center drop-shadow-[0_1px_3px_rgba(0,0,0,.95)]">
                <ShrimpIllustration />

                <span className="mt-5 rounded-full border border-amber-100/40 bg-[#071522]/55 px-4 py-1.5 text-[9px] font-black tracking-[.18em] text-amber-50 sm:text-[10px]">
                  HỘ BỘ HẠNG · 户部巷
                </span>

                <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">
                  Chào mừng đến với sạp tôm hùm đất Hộ Bộ Hạng!
                </h1>
                <p className="mt-2 text-lg font-black text-amber-100 sm:text-xl">
                  欢迎来到户部巷小龙虾摊！
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-white sm:text-base">
                  Xin chào! Chúc mừng bạn đã trở thành chủ nhân của một sạp
                  hàng tôm hùm đất <strong>小龙虾</strong> nổi tiếng tại phố
                  đi bộ Hộ Bộ Hạng, Vũ Hán, Hồ Bắc!
                </p>
                <p className="mt-2 max-w-3xl text-xs leading-6 text-white sm:text-sm">
                  你好！恭喜你成为湖北武汉户部巷步行街一间小龙虾摊的老板！
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-white sm:text-base">
                  Khách hàng sẽ thử thách bạn bằng câu hỏi về văn hóa, lịch
                  sử, giáo dục, kinh tế, địa lý và những điều thú vị của Hồ Bắc.
                </p>
                <p className="mt-2 max-w-3xl text-xs leading-6 text-white sm:text-sm">
                  顾客会通过湖北的文化、历史、教育、经济和地理问题来考验你。
                </p>
              </div>

              <div className="relative mt-7 drop-shadow-[0_1px_3px_rgba(0,0,0,.95)]">
                <h2 className="text-center text-xs font-black tracking-[.16em] text-amber-50 sm:text-sm">
                  LUẬT CHƠI SIÊU ĐƠN GIẢN · 游戏规则
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl border border-emerald-100/40 bg-[#071522]/55 p-4 backdrop-blur-sm">
                    <span className="text-2xl">🦞</span>
                    <h3 className="mt-2 text-sm font-black text-white">
                      Trả lời đúng · 回答正确
                    </h3>
                    <p className="mb-0 mt-1 text-xs leading-5 text-white">
                      Bán thành công một suất tôm hùm đất, nhận 10 tệ.
                    </p>
                    <p className="mb-0 mt-1 text-[10px] leading-5 text-white">
                      成功卖出一份小龙虾，赚取10元。
                    </p>
                  </article>

                  <article className="rounded-2xl border border-rose-100/40 bg-[#071522]/55 p-4 backdrop-blur-sm">
                    <span className="text-2xl">💨</span>
                    <h3 className="mt-2 text-sm font-black text-white">
                      Trả lời sai · 回答错误
                    </h3>
                    <p className="mb-0 mt-1 text-xs leading-5 text-white">
                      Khách lắc đầu rời đi, bạn mất cơ hội bán hàng.
                    </p>
                    <p className="mb-0 mt-1 text-[10px] leading-5 text-white">
                      顾客摇摇头离开，你错过了一次销售机会。
                    </p>
                  </article>

                  <article className="rounded-2xl border border-amber-100/40 bg-[#071522]/55 p-4 backdrop-blur-sm">
                    <span className="text-2xl">💰</span>
                    <h3 className="mt-2 text-sm font-black text-white">
                      Mục tiêu · 游戏目标
                    </h3>
                    <p className="mb-0 mt-1 text-xs leading-5 text-white">
                      Phục vụ thật nhiều khách và kiếm càng nhiều tiền càng tốt.
                    </p>
                    <p className="mb-0 mt-1 text-[10px] leading-5 text-white">
                      尽可能服务更多顾客，赚取更多收入。
                    </p>
                  </article>
                </div>
              </div>

              <div className="relative mt-6 rounded-2xl border border-white/40 bg-[#071522]/55 p-4 text-center drop-shadow-[0_1px_3px_rgba(0,0,0,.95)] backdrop-blur-sm">
                <p className="mb-0 text-sm font-bold leading-6 text-white">
                  Ở Hộ Bộ Hạng, người ta có thể quên một chuyến du lịch,
                  nhưng nhất định không quên một đĩa tôm hùm đất ngon.
                </p>
                <p className="mb-0 mt-1 text-xs text-white">
                  在户部巷，人们也许会忘记一次旅行，却不会忘记一盘美味的小龙虾。
                </p>
                <p className="mb-0 mt-3 text-xs font-black text-amber-100">
                  Bạn đã sẵn sàng mở hàng chưa? · 准备好开张了吗？
                </p>
                <p className="mb-0 mt-1 text-xs text-white">
                  🔥 Kéo tạp dề lên, chuẩn bị nước sốt và bắt đầu đón khách nào!
                  🦞
                </p>
              </div>

              <div className="relative mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={startQuiz}
                  className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-200 to-orange-300 px-7 text-sm font-black text-[#172532] shadow-[0_12px_30px_rgba(251,191,36,.2)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  🔥 Bắt đầu đón khách · 开始迎客
                </button>

                <button
                  type="button"
                  onClick={goBackToMap}
                  className="min-h-12 rounded-2xl border border-white/40 bg-[#071522]/50 px-6 text-sm font-bold text-white transition hover:bg-[#071522]/70"
                >
                  ← Quay lại bản đồ · 返回地图
                </button>
              </div>
            </div>
          ) : isFinished ? (
            <div className="relative px-5 py-10 text-center drop-shadow-[0_1px_3px_rgba(0,0,0,.95)] sm:px-10 sm:py-14">
              <div className="mx-auto grid size-20 place-items-center rounded-3xl border border-amber-100/40 bg-[#071522]/55 text-5xl backdrop-blur-sm">
                {score === questions.length
                  ? "🏆"
                  : score > 0
                    ? "🎉"
                    : "💪"}
              </div>

              <p className="mt-6 text-[10px] font-black tracking-[.2em] text-amber-100">
                ĐÃ HOÀN THÀNH · 已完成挑战
              </p>

              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                {score === questions.length
                  ? "Xuất sắc! · 太棒了！"
                  : score > 0
                    ? "Làm tốt lắm! · 做得不错！"
                    : "Thử lại lần nữa nhé! · 再试一次吧！"}
              </h1>

              <p className="mt-3 text-sm text-white">
                Bạn trả lời đúng · 答对了
              </p>

              <p className="mt-2 text-4xl font-black text-amber-100">
                {score}
                <span className="text-xl text-white"> / {questions.length}</span>
              </p>

              <button
                type="button"
                onClick={retryQuiz}
                className="mt-7 min-h-12 rounded-xl border border-white/40 bg-[#071522]/55 px-5 text-sm font-bold text-white transition hover:bg-[#071522]/75"
              >
                Làm lại · 再玩一次
              </button>

              <button
                type="button"
                onClick={goBackToMap}
                className="ml-0 mt-3 min-h-12 rounded-xl bg-gradient-to-r from-amber-200 to-orange-300 px-6 text-sm font-black text-[#172532] transition hover:brightness-105 sm:ml-3"
              >
                ← Quay lại bản đồ · 返回地图
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex items-center justify-between gap-3 px-4 pb-4 pt-5 drop-shadow-[0_1px_3px_rgba(0,0,0,.95)] sm:px-7 sm:pb-5 sm:pt-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/40 bg-[#071522]/55 p-1.5 backdrop-blur-sm sm:size-14">
                    {sticker.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sticker.icon}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-2xl">❓</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black tracking-[.16em] text-amber-100 sm:text-[10px]">
                      THỬ THÁCH TRẮC NGHIỆM · 答题挑战
                    </p>
                    <h1 className="mt-1 truncate text-base font-black text-white sm:text-xl">
                      {sticker.title}
                    </h1>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-white/40 bg-[#071522]/55 px-3 py-2 text-[10px] font-bold text-white backdrop-blur-sm sm:px-4 sm:text-xs">
                  Câu {questionIndex + 1}/{questions.length}
                  {" · "}
                  第 {questionIndex + 1}/{questions.length} 题
                </span>
              </div>

              <div className="relative px-4 sm:px-7">
                <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-amber-200 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {selectedAnswer === null ? (
                <>
                  <div className="relative mx-4 mt-5 rounded-2xl border border-white/40 bg-[#071521]/65 p-4 shadow-[0_10px_30px_rgba(0,0,0,.2)] backdrop-blur-md sm:mx-7 sm:mt-6 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/35 bg-[#0a1b27]/65 px-3 py-1.5 text-[9px] font-black tracking-wider text-white sm:text-[10px]">
                        CÂU HỎI {questionIndex + 1} · 第 {questionIndex + 1} 题
                      </span>
                      <span className="text-[10px] font-bold text-white sm:text-xs">
                        ⭐ {score} điểm · 分数
                      </span>
                    </div>

                    <h2 className="mb-0 mt-4 whitespace-pre-wrap break-words text-lg font-black leading-relaxed text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.95)] sm:mt-5 sm:text-2xl">
                      {currentQuestion.question}
                    </h2>
                  </div>

                  <div className="relative grid gap-2.5 px-4 pb-5 pt-4 drop-shadow-[0_1px_3px_rgba(0,0,0,.9)] sm:grid-cols-2 sm:gap-3 sm:px-7 sm:pb-7">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={`${currentQuestion.id}-${index}`}
                        type="button"
                        onClick={() => chooseAnswer(index)}
                        className="group flex min-h-[62px] w-full items-center gap-3 rounded-2xl border border-white/40 bg-[#102536]/70 px-4 py-3 text-left shadow-[0_6px_18px_rgba(0,0,0,.16)] backdrop-blur-md transition hover:border-white/70 hover:bg-[#18364a]/80 focus:outline-none focus:ring-2 focus:ring-cyan-100/70 sm:min-h-[72px] sm:px-5"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/[.14] text-xs font-black text-white sm:size-10">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-sm font-bold text-white sm:text-base">
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  aria-live="polite"
                  className="relative flex min-h-[350px] flex-col items-center justify-center px-5 py-8 sm:min-h-[440px] sm:py-10"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[#071522]/15" />

                  {/* Ẩn bảng câu hỏi, giữ ảnh phản hồi và nút chuyển câu */}
                  <div
                    key={`${questionIndex}-${selectedAnswer}`}
                    className="relative z-10 flex w-full flex-col items-center animate-[quizPop_.4s_ease-out]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        isAnswerCorrect
                          ? "/uploads/explore-stickers/hinhvui.png"
                          : "/uploads/explore-stickers/hinhbuon.png"
                      }
                      alt={isAnswerCorrect ? "Trả lời đúng" : "Trả lời sai"}
                      className="h-auto max-h-[230px] w-auto max-w-[min(65vw,250px)] object-contain drop-shadow-[0_16px_35px_rgba(0,0,0,.45)] sm:max-h-[290px] sm:max-w-[310px]"
                    />

                    <p className="sr-only" role="status">
                      {isAnswerCorrect ? "Trả lời đúng" : "Trả lời sai"}
                    </p>

                    <p className="mt-4 rounded-full border border-white/35 bg-[#071522]/70 px-4 py-2 text-xs font-black text-white backdrop-blur-sm sm:text-sm">
                      {isAnswerCorrect
                        ? "Chính xác! · 回答正确"
                        : "Chưa đúng, cố gắng ở câu sau nhé · 回答错误"}
                    </p>

                    <button
                      type="button"
                      onClick={goToNextQuestion}
                      className="mt-4 min-h-12 rounded-xl bg-gradient-to-r from-amber-200 to-orange-300 px-6 text-sm font-black text-[#172532] shadow-[0_10px_24px_rgba(251,191,36,.22)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-white/80"
                    >
                      {questionIndex + 1 >= questions.length
                        ? "Xem kết quả · 查看结果"
                        : "Câu tiếp theo · 下一题"}
                      {" →"}
                    </button>

                    <p className="mt-2 text-[10px] font-bold text-white drop-shadow sm:text-xs">
                      Tự chuyển sau {feedbackSeconds} giây nếu bạn chưa bấm ·
                      {" "}
                      {feedbackSeconds} 秒后自动进入下一题
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes quizPop {
          0% {
            opacity: 0;
            transform: scale(0.72) translateY(16px);
          }
          70% {
            opacity: 1;
            transform: scale(1.06) translateY(-3px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </main>
  );
}