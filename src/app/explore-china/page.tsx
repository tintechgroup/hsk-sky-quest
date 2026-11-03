"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

type StickerType = "info" | "quiz";

interface ExploreQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ExploreSticker {
  id: string;
  type: StickerType;
  title: string;
  icon: string;
  content: string;
  questions: ExploreQuestion[];
  isActive: boolean;
}

interface ExploreRegion {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;
  mapX: number;
  mapY: number;
  color: string;
  stickers: ExploreSticker[];
  isActive: boolean;
}

function getText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface NormalizedSticker {
  id: string;
  type: "info" | "quiz";
  title: string;
  icon: string;
  content: string;
  questions: NormalizedQuestion[];
  isActive: boolean;
}

function normalizeQuestion(
  value: unknown,
  index: number,
): NormalizedQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const question = value as Record<string, unknown>;

  return {
    id: getText(question.id) || `question-${index + 1}`,
    question: getText(question.question),
    options: Array.isArray(question.options)
      ? question.options.map(getText).slice(0, 4)
      : [],
    correctIndex: Math.max(
      0,
      Math.min(3, getNumber(question.correctIndex, 0)),
    ),
    explanation: getText(question.explanation),
  };
}

function normalizeSticker(
  value: unknown,
  index: number,
): NormalizedSticker | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const sticker = value as Record<string, unknown>;
  const type = sticker.type === "quiz" ? "quiz" : "info";
  const rawQuestions = Array.isArray(sticker.questions)
    ? sticker.questions
    : [];

  return {
    id: getText(sticker.id) || `sticker-${index + 1}`,
    type,
    title:
      getText(sticker.title) ||
      (type === "quiz" ? "Trắc nghiệm" : "Nội dung tỉnh"),
    icon:
      getText(sticker.icon) ||
      getText(sticker.imageUrl) ||
      getText(sticker.image) ||
      getText(sticker.stickerImage) ||
      getText(sticker.stickerUrl),
    content: type === "info" ? getText(sticker.content) : "",
    questions:
      type === "quiz"
        ? rawQuestions
            .map(normalizeQuestion)
            .filter(
              (question): question is NormalizedQuestion =>
                question !== null,
            )
        : [],
    isActive: sticker.isActive !== false,
  };
}

function normalizeRegion(
  value: unknown,
  index: number,
): ExploreRegion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const region = value as Record<string, unknown>;
  const id = getText(region.id) || getText(region._id);
  const name = getText(region.name);

  if (!id || !name) return null;

  const rawStickers = Array.isArray(region.stickers)
    ? region.stickers
    : [];

  return {
    id,
    name,
    chineseName: getText(region.chineseName),
    pinyin: getText(region.pinyin),
    slug: getText(region.slug) || `region-${index + 1}`,
    mapX: Math.max(0, Math.min(100, getNumber(region.mapX, 50))),
    mapY: Math.max(0, Math.min(100, getNumber(region.mapY, 50))),
    color: getText(region.color) || "#34d399",
    stickers: rawStickers
      .map(normalizeSticker)
      .filter(
        (sticker): sticker is NormalizedSticker => sticker !== null,
      ),
    isActive: region.isActive !== false,
  };
}

interface Props {
  regions: ExploreRegion[];
  onBack: () => void;
  onOpenQuiz: (region: ExploreRegion, sticker: ExploreSticker) => void;
}

interface StickerImageProps {
  src: string;
  alt: string;
  className: string;
  fallbackClassName: string;
  fallback: string;
}

function StickerImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallback,
}: StickerImageProps) {
  const [hasError, setHasError] = useState(!src);

  if (hasError) {
    return <div className={fallbackClassName}>{fallback}</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

function ExploreChinaScreen({
  regions,
  onBack,
  onOpenQuiz,
}: Props) {
  const [selectedRegion, setSelectedRegion] =
    useState<ExploreRegion | null>(null);
  const [activeSticker, setActiveSticker] =
    useState<ExploreSticker | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const updateLayout = () => setIsDesktop(media.matches);

    updateLayout();
    media.addEventListener("change", updateLayout);

    return () => media.removeEventListener("change", updateLayout);
  }, []);

  const visibleRegions = regions.filter((region) => region.isActive);

  const visibleStickers = (selectedRegion?.stickers ?? []).filter(
    (sticker) => sticker.isActive,
  );

  const quizQuestions = activeSticker?.questions ?? [];
  const currentQuestion = quizQuestions[questionIndex];

  function chooseRegion(region: ExploreRegion) {
    setSelectedRegion(region);
    setActiveSticker(null);
    setQuestionIndex(0);
    setAnswerIndex(null);
    setScore(0);
    setQuizFinished(false);
  }

  function closeRegion() {
    setSelectedRegion(null);
    setActiveSticker(null);
    setQuestionIndex(0);
    setAnswerIndex(null);
    setScore(0);
    setQuizFinished(false);
  }

  function openSticker(sticker: ExploreSticker) {
    setActiveSticker(sticker);
    setQuestionIndex(0);
    setAnswerIndex(null);
    setScore(0);
    setQuizFinished(
      sticker.type === "quiz" && sticker.questions.length === 0,
    );
  }

  function chooseAnswer(index: number) {
    if (answerIndex !== null || !currentQuestion) return;

    setAnswerIndex(index);

    if (index === currentQuestion.correctIndex) {
      setScore((current) => current + 1);
    }
  }

  function nextQuestion() {
    if (questionIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setAnswerIndex(null);
  }

  function closeSticker() {
    setActiveSticker(null);
    setQuestionIndex(0);
    setAnswerIndex(null);
    setScore(0);
    setQuizFinished(false);
  }

  useEffect(() => {
    if (!selectedRegion) return;

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (activeSticker) {
        setActiveSticker(null);
        setQuestionIndex(0);
        setAnswerIndex(null);
        setScore(0);
        setQuizFinished(false);
      } else {
        setSelectedRegion(null);
        setActiveSticker(null);
        setQuestionIndex(0);
        setAnswerIndex(null);
        setScore(0);
        setQuizFinished(false);
      }
    }

    window.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      window.removeEventListener("keydown", handleDialogKeyDown);
    };
  }, [selectedRegion, activeSticker]);

  return (
    <main className="min-h-dvh bg-[#04111b] text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#030b12]/95 px-3 backdrop-blur-xl sm:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Đóng trang khám phá Trung Quốc"
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-2xl transition hover:bg-white/10"
        >
          ×
        </button>

        <div className="text-center">
          <p className="text-[10px] font-black tracking-[.22em] text-emerald-300 sm:text-xs">
            HSK SKY QUEST · EXPLORE
          </p>
          <p className="text-sm font-black sm:text-base">
            Khám phá Trung Quốc
          </p>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-bold text-slate-300 sm:text-xs">
          {visibleRegions.length} tỉnh
        </span>
      </header>

      <section className="mx-auto w-full max-w-[1800px] p-3 sm:p-5 lg:p-6">
        <div className="relative h-[calc(100dvh-5.5rem)] min-h-[500px] w-full overflow-hidden rounded-3xl border border-cyan-100/10 bg-[radial-gradient(ellipse_at_50%_40%,rgba(19,75,94,.48),transparent_65%),linear-gradient(145deg,#0b2332,#06121d)] shadow-2xl">
          <div
            className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-90"
            style={{
              backgroundImage: "url('/images/explore-china-map.png')",
              backgroundSize: isDesktop ? "auto 100%" : "contain",
              backgroundPosition: isDesktop ? "left center" : "center",
            }}
            aria-label="Bản đồ khám phá Trung Quốc"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute left-[5%] top-[8%] h-[82%] w-[70%] opacity-80 sm:left-[9%] sm:w-[64%]">
              <svg
                viewBox="0 0 720 560"
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full"
              >
                <defs>
                  <linearGradient
                    id="china-fill"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#41d9bd" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#1686a0" stopOpacity=".08" />
                  </linearGradient>

                  <filter
                    id="map-glow"
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <path
                  d="M150 87 201 72 235 88 271 57 312 78 348 50 389 72 424 63 451 91 492 83 516 111 551 119 558 152 594 165 580 198 611 221 590 253 610 283 580 303 588 338 552 350 542 387 504 391 485 421 448 415 423 448 390 438 367 474 331 458 298 489 271 468 233 480 207 450 170 455 151 423 119 414 127 377 91 359 108 326 79 303 99 274 74 250 99 222 83 193 113 170 105 137 137 122Z"
                  fill="url(#china-fill)"
                  stroke="#65e6d3"
                  strokeOpacity=".62"
                  strokeWidth="3"
                  strokeDasharray="9 9"
                  filter="url(#map-glow)"
                />

                <path
                  d="M163 275C231 225 274 252 321 200S401 178 430 228 492 273 523 234 550 215 574 244"
                  fill="none"
                  stroke="#a5f3e8"
                  strokeOpacity=".34"
                  strokeWidth="3"
                  strokeDasharray="7 10"
                />

                <g fill="#8bf2de" filter="url(#map-glow)">
                  <circle cx="164" cy="275" r="7" />
                  <circle cx="321" cy="200" r="7" />
                  <circle cx="430" cy="228" r="7" />
                  <circle cx="523" cy="234" r="7" />
                </g>

                <text
                  x="352"
                  y="309"
                  textAnchor="middle"
                  fill="#d7fff8"
                  fillOpacity=".48"
                  fontSize="44"
                  fontWeight="800"
                  letterSpacing="12"
                >
                  CHINA
                </text>

                <text
                  x="352"
                  y="337"
                  textAnchor="middle"
                  fill="#c3f8ee"
                  fillOpacity=".52"
                  fontSize="13"
                  fontWeight="700"
                  letterSpacing="3"
                >
                  DISCOVER THE JOURNEY
                </text>
              </svg>
            </div>

            <div className="absolute inset-0 bg-[linear-gradient(rgba(128,216,226,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(128,216,226,.035)_1px,transparent_1px)] bg-[size:36px_36px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_36%_52%,transparent_5%,rgba(4,17,27,.16)_75%)]" />
          </div>

          {visibleRegions.length === 0 ? (
            <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-white/10 bg-[#071725]/90 p-5 text-center shadow-xl backdrop-blur lg:bottom-auto lg:left-auto lg:right-6 lg:top-1/2 lg:w-[min(390px,38%)] lg:-translate-y-1/2">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-cyan-300/10 text-3xl">
                🗺️
              </div>
              <p className="mt-3 text-lg font-black">
                Chưa có tỉnh khám phá
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Admin cần thêm tỉnh riêng và bật hiển thị trên bản đồ.
              </p>
            </div>
          ) : (
            visibleRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => chooseRegion(region)}
                title={`${region.name}${
                  region.chineseName ? ` · ${region.chineseName}` : ""
                }`}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-3 py-2 text-left shadow-lg transition hover:z-20 hover:scale-110 ${
                  selectedRegion?.id === region.id
                    ? "border-white bg-[#08273a] text-white ring-4 ring-cyan-300/40"
                    : "border-white/90 bg-[#09283c]/90 text-white hover:bg-[#0b5367]"
                }`}
                style={{
                  left: isDesktop
                    ? `${Math.max(1, Math.min(27, region.mapX * 0.27))}%`
                    : `${Math.max(3, Math.min(97, region.mapX))}%`,
                  top: `${Math.max(5, Math.min(95, region.mapY))}%`,
                  boxShadow: `0 0 0 2px ${region.color || "#34d399"}`,
                }}
              >
                <span className="block max-w-28 truncate text-xs font-black sm:text-sm">
                  {region.name}
                </span>

                {region.chineseName && (
                  <span className="mt-0.5 block text-center text-[10px] opacity-80">
                    {region.chineseName}
                  </span>
                )}
              </button>
            ))
          )}

          {visibleRegions.length > 0 && !selectedRegion && (
            <div className="absolute right-6 top-1/2 z-20 hidden w-[min(390px,38%)] -translate-y-1/2 rounded-3xl border border-white/10 bg-[#071725]/90 p-6 text-center shadow-2xl backdrop-blur lg:block">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-cyan-300/10 text-3xl">
                🧭
              </div>

              <p className="mt-4 text-xs font-black tracking-[.2em] text-emerald-300">
                BẮT ĐẦU HÀNH TRÌNH
              </p>

              <h2 className="mt-2 text-xl font-black">Chọn một tỉnh</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Bấm điểm ghim trên bản đồ để xem sticker. Sticker nội dung mở
                bong bóng chat; sticker trắc nghiệm mở câu hỏi A–D.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-xl border border-cyan-200/15 bg-cyan-300/[.05] p-3">
                  <p className="text-xs font-black text-cyan-100">
                    💬 Nội dung
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Bong bóng chat
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200/15 bg-amber-300/[.05] p-3">
                  <p className="text-xs font-black text-amber-100">
                    ❓ Trắc nghiệm
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Câu hỏi A–D
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedRegion && (
            <div className="absolute inset-x-2 bottom-2 z-30 flex h-[76dvh] max-h-[680px] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-4 sm:h-auto sm:w-[min(440px,calc(100%-2rem))]">
              <section
                aria-labelledby="explore-region-title"
                className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[26px] border border-cyan-100/20 bg-[#071a28]/95 shadow-[0_24px_80px_rgba(0,0,0,.58)] backdrop-blur-xl sm:rounded-[28px]"
              >
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-300/[.10] to-transparent" />

                <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-200/20 bg-emerald-300/10 text-xl shadow-[0_0_25px_rgba(52,211,153,.12)]">
                      🧭
                    </span>

                    <div className="min-w-0">
                      <p className="text-[9px] font-black tracking-[.2em] text-emerald-300 sm:text-[10px]">
                        ĐIỂM ĐẾN ĐÃ MỞ KHÓA
                      </p>

                      <h1
                        id="explore-region-title"
                        className="mt-0.5 truncate text-xl font-black sm:text-2xl"
                      >
                        {selectedRegion.name}

                        {selectedRegion.chineseName && (
                          <span className="ml-2 text-base font-medium text-slate-300 sm:text-lg">
                            {selectedRegion.chineseName}
                          </span>
                        )}
                      </h1>

                      {selectedRegion.pinyin && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {selectedRegion.pinyin}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeRegion}
                    aria-label="Đóng cửa sổ tỉnh"
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-xl text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>
                </header>

                <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                  {!activeSticker ? (
                    <>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black tracking-[.18em] text-cyan-200">
                            BỘ SƯU TẬP KHÁM PHÁ
                          </p>

                          <h2 className="mt-1 text-lg font-black sm:text-xl">
                            Sticker của tỉnh
                          </h2>

                          <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                            Chạm vào sticker để đọc nội dung hoặc bắt đầu thử
                            thách.
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-bold text-slate-300 sm:text-xs">
                          {visibleStickers.length} sticker
                        </span>
                      </div>

                      {visibleStickers.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-6 text-center">
                          <div className="text-3xl">🖼️</div>
                          <p className="mt-3 text-sm font-bold">
                            Tỉnh này chưa có sticker
                          </p>
                        </div>
                      ) : (
                        <div className="mt-5 grid gap-3">
                          {visibleStickers.map((sticker) => (
                            <button
                              key={sticker.id}
                              type="button"
                              onClick={() =>
                                sticker.type === "quiz"
                                  ? onOpenQuiz(selectedRegion, sticker)
                                  : openSticker(sticker)
                              }
                              className={`group flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-200/60 ${
                                sticker.type === "quiz"
                                  ? "border-amber-200/20 bg-gradient-to-br from-amber-200/[.10] to-amber-200/[.025] hover:border-amber-200/50"
                                  : "border-cyan-200/20 bg-gradient-to-br from-cyan-200/[.10] to-cyan-200/[.025] hover:border-cyan-200/50"
                              }`}
                            >
                              <div className="relative size-[82px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/25 sm:size-[92px]">
                                <StickerImage
                                  src={sticker.icon}
                                  alt={sticker.title}
                                  className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                                  fallbackClassName="grid h-full w-full place-items-center text-3xl"
                                  fallback={
                                    sticker.type === "quiz" ? "❓" : "💬"
                                  }
                                />
                              </div>

                              <div className="min-w-0 flex-1 py-1">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider ${
                                    sticker.type === "quiz"
                                      ? "text-amber-200"
                                      : "text-cyan-200"
                                  }`}
                                >
                                  {sticker.type === "quiz"
                                    ? "Trắc nghiệm"
                                    : "Nội dung tỉnh"}
                                </span>

                                <p className="mt-1 truncate text-sm font-black sm:text-base">
                                  {sticker.title}
                                </p>

                                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                                  {sticker.type === "quiz"
                                    ? `${sticker.questions.length} câu hỏi · chạm để làm`
                                    : "Chạm để đọc nội dung"}
                                </p>
                              </div>

                              <span className="shrink-0 pr-1 text-lg text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white">
                                ›
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={closeSticker}
                        className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-2 text-xs font-bold text-cyan-100 transition hover:bg-white/10 hover:text-white"
                      >
                        ← Danh sách sticker
                      </button>

                      {activeSticker.type === "info" ? (
                        <div className="mx-auto w-full max-w-[390px] py-2">
                          <div className="mb-2 flex items-center gap-2 px-2">
                            <span className="grid size-8 place-items-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-base">
                              🧭
                            </span>

                            <div>
                              <p className="text-xs font-bold text-white">
                                Hướng dẫn viên · {selectedRegion.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Vừa gửi cho bạn
                              </p>
                            </div>
                          </div>

                          <div className="relative pb-3">
                            <span
                              aria-hidden="true"
                              className="absolute -bottom-0.5 left-9 z-0 size-6 rotate-[-24deg] rounded-bl-md border-b border-l border-cyan-100/80 bg-[#55b2c1]"
                            />

                            <article className="relative z-10 flex max-h-[min(58dvh,500px)] min-h-[250px] w-full flex-col overflow-hidden rounded-[28px] border border-cyan-100/80 bg-gradient-to-br from-[#83d5df] via-[#63bac8] to-[#4ba2b5] text-[#103746] shadow-[0_18px_35px_rgba(0,0,0,.28)] sm:rounded-[32px]">
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-2 rounded-[22px] border border-white/20 sm:rounded-[26px]"
                              />

                              <div className="relative z-10 flex shrink-0 items-center gap-2.5 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
                                <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/60 bg-white/35 p-1 shadow-sm sm:size-12">
                                  <StickerImage
                                    src={activeSticker.icon}
                                    alt={`Ảnh sticker ${activeSticker.title}`}
                                    className="max-h-full max-w-full object-contain"
                                    fallbackClassName="grid size-full place-items-center text-xl"
                                    fallback="💬"
                                  />
                                </div>

                                <h2 className="min-w-0 break-words text-sm font-black leading-snug sm:text-base">
                                  {activeSticker.title}
                                </h2>
                              </div>

                              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 text-[13px] font-medium leading-[1.65] [overflow-wrap:anywhere] sm:px-5 sm:text-sm sm:leading-6">
                                <p className="whitespace-pre-wrap break-words">
                                  {activeSticker.content ||
                                    "Chưa có nội dung cho sticker này."}
                                </p>
                              </div>
                            </article>
                          </div>
                        </div>
                      ) : (
                        <section className="rounded-3xl border border-amber-200/20 bg-gradient-to-br from-amber-300/[.09] to-orange-300/[.03] p-5">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="size-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
                              <StickerImage
                                src={activeSticker.icon}
                                alt={`Sticker ${activeSticker.title}`}
                                className="h-full w-full object-cover"
                                fallbackClassName="grid h-full w-full place-items-center text-xl"
                                fallback="❓"
                              />
                            </div>

                            <div>
                              <p className="text-[10px] font-black tracking-widest text-amber-200">
                                THỬ THÁCH TRẮC NGHIỆM
                              </p>
                              <h2 className="font-black">
                                {activeSticker.title}
                              </h2>
                            </div>
                          </div>

                          {quizFinished ? (
                            <div className="py-5 text-center">
                              <div className="text-5xl">
                                {quizQuestions.length === 0
                                  ? "📝"
                                  : score === quizQuestions.length
                                    ? "🥳"
                                    : score > 0
                                      ? "😊"
                                      : "😢"}
                              </div>

                              <h3 className="mt-3 text-xl font-black">
                                {quizQuestions.length === 0
                                  ? "Chưa có câu hỏi"
                                  : "Hoàn thành thử thách!"}
                              </h3>

                              <p className="mt-2 text-sm text-slate-300">
                                {quizQuestions.length === 0
                                  ? "Admin chưa thêm câu hỏi cho sticker này."
                                  : `Bạn trả lời đúng ${score}/${quizQuestions.length} câu.`}
                              </p>

                              <button
                                type="button"
                                onClick={closeSticker}
                                className="mt-5 rounded-xl bg-amber-200 px-5 py-3 text-sm font-black text-slate-900"
                              >
                                Quay lại sticker
                              </button>
                            </div>
                          ) : currentQuestion ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="rounded-full bg-amber-200/10 px-3 py-1 text-[10px] font-black tracking-widest text-amber-200">
                                  CÂU {questionIndex + 1}/{quizQuestions.length}
                                </span>

                                <span className="text-xs font-bold text-slate-300">
                                  ⭐ {score} điểm
                                </span>
                              </div>

                              <h3 className="mt-4 text-lg font-black leading-7">
                                {currentQuestion.question}
                              </h3>

                              <div className="mt-4 space-y-2.5">
                                {currentQuestion.options.map(
                                  (option, index) => {
                                    const isCorrect =
                                      index === currentQuestion.correctIndex;
                                    const isChosen = answerIndex === index;

                                    let optionStyle =
                                      "border-white/10 bg-slate-950/20 hover:border-amber-200/40 hover:bg-amber-200/[.06]";

                                    if (answerIndex !== null) {
                                      if (isCorrect) {
                                        optionStyle =
                                          "border-emerald-300/50 bg-emerald-300/10";
                                      } else if (isChosen) {
                                        optionStyle =
                                          "border-rose-300/50 bg-rose-300/10";
                                      } else {
                                        optionStyle =
                                          "border-white/5 bg-slate-950/10 opacity-60";
                                      }
                                    }

                                    return (
                                      <button
                                        key={`${currentQuestion.id}-${index}`}
                                        type="button"
                                        onClick={() => chooseAnswer(index)}
                                        disabled={answerIndex !== null}
                                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-sm font-semibold transition ${optionStyle}`}
                                      >
                                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black">
                                          {String.fromCharCode(65 + index)}
                                        </span>

                                        <span className="flex-1">{option}</span>

                                        {answerIndex !== null && isCorrect && (
                                          <span aria-label="Đúng">😊</span>
                                        )}

                                        {isChosen && !isCorrect && (
                                          <span aria-label="Sai">😢</span>
                                        )}
                                      </button>
                                    );
                                  },
                                )}
                              </div>

                              {answerIndex !== null && (
                                <div
                                  className={`mt-4 rounded-xl p-3 text-sm leading-6 ${
                                    answerIndex === currentQuestion.correctIndex
                                      ? "bg-emerald-300/10 text-emerald-100"
                                      : "bg-rose-300/10 text-rose-100"
                                  }`}
                                >
                                  <strong>
                                    {answerIndex === currentQuestion.correctIndex
                                      ? "😊 Chính xác! "
                                      : "😢 Chưa đúng. "}
                                  </strong>

                                  {currentQuestion.explanation ||
                                    (answerIndex === currentQuestion.correctIndex
                                      ? "Bạn đã chọn đáp án đúng."
                                      : `Đáp án đúng: ${currentQuestion.options[currentQuestion.correctIndex]}`)}
                                </div>
                              )}

                              {answerIndex !== null && (
                                <button
                                  type="button"
                                  onClick={nextQuestion}
                                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-200 to-orange-200 py-3 font-black text-slate-900"
                                >
                                  {questionIndex + 1 === quizQuestions.length
                                    ? "Xem kết quả"
                                    : "Câu tiếp theo →"}
                                </button>
                              )}
                            </>
                          ) : null}
                        </section>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function ExploreChinaPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<ExploreRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRegions(showLoader = true) {
      if (showLoader) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await fetch("/api/explore-regions", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = (await response.json()) as ApiResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Không tải được dữ liệu bản đồ.",
          );
        }

        const rows = Array.isArray(result.data) ? result.data : [];

        setRegions(
          rows
            .map(normalizeRegion)
            .filter(
              (region): region is ExploreRegion => region !== null,
            ),
        );
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
            : "Không tải được dữ liệu bản đồ.",
        );
      } finally {
        if (showLoader && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRegions();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadRegions(false);
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020b12] text-white">
        <p className="text-sm text-slate-300">
          Đang tải bản đồ khám phá...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020b12] px-4 text-white">
        <section className="max-w-lg rounded-2xl border border-rose-300/20 bg-rose-300/10 p-6 text-center">
          <h1 className="text-lg font-black">Không mở được bản đồ</h1>
          <p className="mt-2 text-sm text-rose-100">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10"
          >
            Tải lại trang
          </button>
        </section>
      </main>
    );
  }

  return (
    <ExploreChinaScreen
      regions={regions}
      onBack={() => router.push("/")}
      onOpenQuiz={(region, sticker) =>
        router.push(
          `/explore-china/quiz?regionId=${encodeURIComponent(region.id)}&stickerId=${encodeURIComponent(sticker.id)}`,
        )
      }
    />
  );
}