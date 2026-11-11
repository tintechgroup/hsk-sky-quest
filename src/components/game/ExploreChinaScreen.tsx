"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExploreQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ExploreSticker {
  id: string;
  type: "info" | "quiz";
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

interface Props {
  regions: ExploreRegion[];
  onBack: () => void;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

export default function ExploreChinaScreen({
  regions,
  onBack,
}: Props) {
  const { language } =
    useLanguage();

  const localize = (
    vietnamese: string,
    chinese: string,
  ) =>
    language === "zh"
      ? chinese
      : vietnamese;

  const regionDisplayName = (
    region: ExploreRegion,
  ) =>
    language === "zh"
      ? region.chineseName ||
        region.name
      : region.name;

  const safeRegions =
    Array.isArray(regions)
      ? regions
      : [];

  const [
    selectedRegion,
    setSelectedRegion,
  ] =
    useState<ExploreRegion | null>(
      null,
    );

  const [
    selectedSticker,
    setSelectedSticker,
  ] =
    useState<ExploreSticker | null>(
      null,
    );

  const [
    mapImageFailed,
    setMapImageFailed,
  ] =
    useState(false);

  const [
    questionIndex,
    setQuestionIndex,
  ] =
    useState(0);

  const [
    answer,
    setAnswer,
  ] =
    useState<number | null>(
      null,
    );

  const [
    score,
    setScore,
  ] =
    useState(0);

  const [
    finished,
    setFinished,
  ] =
    useState(false);

  const questions =
    selectedSticker?.type ===
    "quiz"
      ? selectedSticker.questions
      : [];

  const currentQuestion =
    questions[questionIndex];

  function selectRegion(
    region: ExploreRegion,
  ) {
    setSelectedRegion(region);
    setSelectedSticker(null);
    setQuestionIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  }

  function closeRegion() {
    setSelectedRegion(null);
    setSelectedSticker(null);
    setQuestionIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  }

  function openSticker(
    sticker: ExploreSticker,
  ) {
    setSelectedSticker(sticker);
    setQuestionIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(
      sticker.type === "quiz" &&
        sticker.questions.length === 0,
    );
  }

  function closeSticker() {
    setSelectedSticker(null);
    setQuestionIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  }

  function chooseAnswer(
    index: number,
  ) {
    if (
      answer !== null ||
      !currentQuestion
    ) {
      return;
    }

    setAnswer(index);

    if (
      index ===
      currentQuestion.correctIndex
    ) {
      setScore(
        (current) => current + 1,
      );
    }
  }

  function nextQuestion() {
    if (
      questionIndex + 1 >=
      questions.length
    ) {
      setFinished(true);
      return;
    }

    setQuestionIndex(
      (current) => current + 1,
    );

    setAnswer(null);
  }

  function retryQuiz() {
    setQuestionIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  }

  return (
    <main className="fixed inset-0 z-40 overflow-hidden bg-black text-white">
      <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-center bg-black">
        <button
          type="button"
          onClick={onBack}
          aria-label={localize(
            "Đóng bản đồ",
            "关闭地图",
          )}
          className="absolute left-5 grid size-10 place-items-center text-4xl font-light text-white transition hover:text-cyan-200"
        >
          ×
        </button>

        <span className="text-lg font-semibold tracking-wide">
          1/1
        </span>

        <span className="absolute right-5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
          {safeRegions.length}{" "}
          {localize(
            "tỉnh",
            "个省份",
          )}
        </span>
      </header>

      <section className="absolute inset-x-0 bottom-0 top-16 flex items-center justify-center overflow-hidden bg-black">
        {/*
          Khung ảnh có tỷ lệ 2:3 để vùng đặt marker trùng với ảnh bản đồ.
          Ảnh bản đồ nên được cắt bỏ phần thanh đen của ảnh tham khảo.
        */}
        <div
          className="relative max-h-full max-w-full overflow-hidden"
          style={{
            width:
              "min(100vw, calc((100svh - 4rem) * 2 / 3))",
            height:
              "min(calc(100svh - 4rem), calc(100vw * 3 / 2))",
            aspectRatio: "2 / 3",
          }}
        >
          {!mapImageFailed ? (
            // Đặt ảnh tại public/images/explore-china-map.png
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/explore-china-map.png"
              alt={localize(
                "Bản đồ khám phá Trung Quốc",
                "中国探索地图",
              )}
              className="absolute inset-0 h-full w-full object-fill"
              onError={() =>
                setMapImageFailed(true)
              }
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,#15374a,#03080d)] px-6 text-center">
              <div>
                <div className="text-5xl">
                  🗺️
                </div>

                <p className="mt-4 font-bold">
                  {localize(
                    "Chưa tìm thấy ảnh bản đồ",
                    "未找到地图图片",
                  )}
                </p>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  {localize(
                    "Đặt ảnh tại",
                    "请将地图图片放在",
                  )}{" "}
                  <code className="text-cyan-200">
                    public/images/explore-china-map.png
                  </code>
                  .
                </p>
              </div>
            </div>
          )}

          {safeRegions.map(
            (region) => (
              <button
                key={region.id}
                type="button"
                onClick={() =>
                  selectRegion(region)
                }
                title={`${region.name} ${region.chineseName}`}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 shadow-lg transition hover:scale-110 ${
                  selectedRegion?.id ===
                  region.id
                    ? "border-amber-200 bg-amber-300 text-slate-950"
                    : "bg-slate-950/80 text-white hover:bg-cyan-950/90"
                }`}
                style={{
                  left: `${clamp(
                    region.mapX,
                    4,
                    96,
                  )}%`,
                  top: `${clamp(
                    region.mapY,
                    4,
                    96,
                  )}%`,
                  borderColor:
                    selectedRegion?.id ===
                    region.id
                      ? undefined
                      : region.color,
                }}
              >
                <span className="block max-w-28 truncate text-xs font-black">
                  {regionDisplayName(
                    region,
                  )}
                </span>

                {language === "zh" ? (
                  region.pinyin && (
                    <span className="mt-0.5 block text-[10px] opacity-75">
                      {region.pinyin}
                    </span>
                  )
                ) : (
                  region.chineseName && (
                    <span className="mt-0.5 block text-[10px] opacity-75">
                      {region.chineseName}
                    </span>
                  )
                )}
              </button>
            ),
          )}

          {safeRegions.length === 0 && (
            <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-center text-xs text-white">
              {localize(
                "Chưa có tỉnh đang hiển thị trên bản đồ",
                "地图上目前没有显示任何省份",
              )}
            </div>
          )}
        </div>
      </section>

      {selectedRegion && (
        <div
          className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRegion();
            }
          }}
        >
          <section className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-t-3xl border border-white/10 bg-[#081e2e] shadow-2xl sm:rounded-3xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] font-black tracking-[.18em] text-emerald-300">
                  {localize(
                    "TỈNH ĐÃ CHỌN",
                    "已选择的省份",
                  )}
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {regionDisplayName(
                    selectedRegion,
                  )}

                  {language !== "zh" &&
                    selectedRegion.chineseName && (
                      <span className="ml-2 text-base font-medium text-slate-400">
                        {
                          selectedRegion.chineseName
                        }
                      </span>
                    )}
                </h2>

                {selectedRegion.pinyin && (
                  <p className="mt-1 text-xs text-slate-400">
                    {
                      selectedRegion.pinyin
                    }
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeRegion}
                aria-label={localize(
                  "Đóng tỉnh",
                  "关闭省份窗口",
                )}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl text-slate-300 hover:bg-white/10"
              >
                ×
              </button>
            </header>

            <div className="max-h-[calc(82vh-80px)] overflow-y-auto p-4 sm:p-5">
              {selectedRegion.stickers.filter(
                (sticker) =>
                  sticker.isActive,
              ).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center">
                  <div className="text-4xl">
                    🖼️
                  </div>

                  <p className="mt-3 font-bold">
                    {localize(
                      "Tỉnh này chưa có sticker",
                      "该省份还没有贴纸",
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {localize(
                      "Thêm sticker trong Admin → Khám phá Trung Quốc.",
                      "请在管理后台 → 探索中国中添加贴纸。",
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    {localize(
                      "Chọn sticker để xem",
                      "选择贴纸查看内容",
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedRegion.stickers
                      .filter(
                        (sticker) =>
                          sticker.isActive,
                      )
                      .map((sticker) => (
                        <button
                          key={sticker.id}
                          type="button"
                          onClick={() =>
                            openSticker(sticker)
                          }
                          className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30 text-left transition hover:-translate-y-1 hover:border-cyan-200/50"
                        >
                          <div className="aspect-square overflow-hidden bg-black/30">
                            {sticker.icon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sticker.icon}
                                alt={sticker.title}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="grid h-full place-items-center text-4xl">
                                🖼️
                              </div>
                            )}
                          </div>

                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-black">
                              {sticker.title}
                            </p>

                            <p className="mt-1 text-[11px] text-cyan-100/70">
                              {sticker.type ===
                              "quiz"
                                ? localize(
                                    `Trắc nghiệm · ${sticker.questions.length} câu`,
                                    `测验 · ${sticker.questions.length} 道题`,
                                  )
                                : localize(
                                    "Nội dung tỉnh",
                                    "省份介绍",
                                  )}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedSticker &&
        selectedRegion && (
          <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-6">
            <section className="my-auto max-h-[94vh] w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#081e2e] shadow-2xl">
              <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-[.16em] text-cyan-200">
                    {regionDisplayName(
                      selectedRegion,
                    ).toUpperCase()}
                  </p>

                  <h2 className="mt-1 truncate text-lg font-black">
                    {
                      selectedSticker.title
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeSticker}
                  aria-label={localize(
                    "Đóng sticker",
                    "关闭贴纸",
                  )}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl hover:bg-white/10"
                >
                  ×
                </button>
              </header>

              <div className="max-h-[calc(94vh-72px)] overflow-y-auto p-4 sm:p-5">
                {selectedSticker.icon && (
                  <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedSticker.icon}
                      alt={selectedSticker.title}
                      className="mx-auto max-h-56 w-full object-contain"
                    />
                  </div>
                )}

                {selectedSticker.type ===
                "info" ? (
                  <article className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[.06] p-5">
                    <p className="whitespace-pre-line text-sm leading-7 text-slate-100">
                      {
                        selectedSticker.content
                      }
                    </p>
                  </article>
                ) : finished ? (
                  <div className="py-8 text-center">
                    <div className="text-5xl">
                      {questions.length === 0
                        ? "📝"
                        : score ===
                            questions.length
                          ? "🥳"
                          : score > 0
                            ? "😊"
                            : "😢"}
                    </div>

                    <h3 className="mt-3 text-xl font-black">
                      {questions.length === 0
                        ? localize(
                            "Chưa có câu hỏi",
                            "暂无题目",
                          )
                        : localize(
                            "Hoàn thành trắc nghiệm",
                            "测验已完成",
                          )}
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      {questions.length === 0
                        ? localize(
                            "Sticker này chưa được thêm câu hỏi.",
                            "这张贴纸还没有添加题目。",
                          )
                        : localize(
                            `Bạn trả lời đúng ${score}/${questions.length} câu.`,
                            `你答对了 ${score}/${questions.length} 题。`,
                          )}
                    </p>

                    {questions.length > 0 && (
                      <button
                        type="button"
                        onClick={retryQuiz}
                        className="mt-5 rounded-xl bg-amber-200 px-5 py-3 text-sm font-black text-slate-950"
                      >
                        {localize(
                          "Làm lại",
                          "再试一次",
                        )}
                      </button>
                    )}
                  </div>
                ) : currentQuestion ? (
                  <section className="rounded-2xl border border-amber-200/15 bg-amber-300/[.05] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-amber-200/10 px-3 py-1 text-[10px] font-black tracking-widest text-amber-200">
                        {localize(
                          "CÂU",
                          "第",
                        )}{" "}
                        {questionIndex + 1}/
                        {questions.length}
                      </span>

                      <span className="text-xs font-bold text-slate-400">
                        ⭐ {score}{" "}
                        {localize(
                          "điểm",
                          "分",
                        )}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-black leading-7">
                      {
                        currentQuestion.question
                      }
                    </h3>

                    <div className="mt-4 space-y-2.5">
                      {currentQuestion.options.map(
                        (
                          option,
                          index,
                        ) => {
                          const correct =
                            index ===
                            currentQuestion.correctIndex;

                          const chosen =
                            answer === index;

                          let style =
                            "border-white/10 bg-slate-950/25 hover:border-amber-200/40";

                          if (
                            answer !== null &&
                            correct
                          ) {
                            style =
                              "border-emerald-300/50 bg-emerald-300/10";
                          } else if (
                            answer !== null &&
                            chosen
                          ) {
                            style =
                              "border-rose-300/50 bg-rose-300/10";
                          } else if (
                            answer !== null
                          ) {
                            style =
                              "border-white/5 bg-slate-950/10 opacity-60";
                          }

                          return (
                            <button
                              key={`${currentQuestion.id}-${index}`}
                              type="button"
                              disabled={
                                answer !== null
                              }
                              onClick={() =>
                                chooseAnswer(index)
                              }
                              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold text-slate-100 ${style}`}
                            >
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black">
                                {String.fromCharCode(
                                  65 + index,
                                )}
                              </span>

                              <span className="flex-1">
                                {option}
                              </span>

                              {answer !== null &&
                                correct && (
                                  <span
                                    aria-label={localize(
                                      "Đúng",
                                      "正确",
                                    )}
                                  >
                                    😊
                                  </span>
                                )}

                              {chosen &&
                                !correct && (
                                  <span
                                    aria-label={localize(
                                      "Sai",
                                      "错误",
                                    )}
                                  >
                                    😢
                                  </span>
                                )}
                            </button>
                          );
                        },
                      )}
                    </div>

                    {answer !== null && (
                      <>
                        <div
                          className={`mt-4 rounded-xl p-3 text-sm leading-6 ${
                            answer ===
                            currentQuestion.correctIndex
                              ? "bg-emerald-300/10 text-emerald-100"
                              : "bg-rose-300/10 text-rose-100"
                          }`}
                        >
                          <strong>
                            {answer ===
                            currentQuestion.correctIndex
                              ? localize(
                                  "😊 Chính xác! ",
                                  "😊 回答正确！",
                                )
                              : localize(
                                  "😢 Chưa đúng. ",
                                  "😢 回答错误。 ",
                                )}
                          </strong>

                          {currentQuestion.explanation ||
                            (answer ===
                            currentQuestion.correctIndex
                              ? localize(
                                  "Bạn đã chọn đáp án đúng.",
                                  "你选择了正确答案。",
                                )
                              : localize(
                                  `Đáp án đúng: ${currentQuestion.options[currentQuestion.correctIndex]}`,
                                  `正确答案：${currentQuestion.options[currentQuestion.correctIndex]}`,
                                ))}
                        </div>

                        <button
                          type="button"
                          onClick={nextQuestion}
                          className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-200 to-orange-200 py-3 font-black text-slate-950"
                        >
                          {questionIndex + 1 ===
                          questions.length
                            ? localize(
                                "Xem kết quả",
                                "查看结果",
                              )
                            : localize(
                                "Câu tiếp theo →",
                                "下一题 →",
                              )}
                        </button>
                      </>
                    )}
                  </section>
                ) : null}
              </div>
            </section>
          </div>
        )}
    </main>
  );
}