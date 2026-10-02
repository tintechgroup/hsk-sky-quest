"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useBattleQuestionsContext,
} from "@/contexts/BattleQuestionsContext";

import type {
  MatchmakingMatch,
  MatchmakingPlayer,
} from "@/components/game/MatchmakingScreen";

import type {
  HSKLevel,
  Inventory,
} from "@/types/game";

import type {
  GameQuestion,
} from "@/types/question";

import type {
  Region,
} from "@/types/region";

interface TeamBattleScreenProps {
  level: HSKLevel;
  region: Region;
  match: MatchmakingMatch;
  initialInventory: Inventory;
  onRestart: () => void;
}

type BattleStage =
  | "battle"
  | "waiting-result"
  | "result";

type Winner =
  | "red"
  | "blue"
  | "draw";

interface FinalResult {
  winner: Winner;

  redScore: number;
  blueScore: number;

  redTime: number;
  blueTime: number;

  persistedMatchId?: string;
}

interface SubmitResponse {
  success: boolean;

  completed?: boolean;
  alreadySubmitted?: boolean;

  message?: string;

  data?: {
    matchId?: string;
    persistedMatchId?: string;

    winner?: Winner;

    redScore?: number;
    blueScore?: number;

    redTime?: number;
    blueTime?: number;
  };
}

interface StatusResponse {
  success: boolean;

  message?: string;

  data?:
    | MatchmakingMatch
    | null;
}

const QUESTION_TIME =
  30;

const RESULT_POLLING_INTERVAL =
  2000;

export default function TeamBattleScreen({
  level,
  region,
  match,
  initialInventory,
  onRestart,
}: TeamBattleScreenProps) {
  const {
    questions:
      battleQuestions,
  } =
    useBattleQuestionsContext();

  const [
    liveMatch,
    setLiveMatch,
  ] =
    useState(match);

  const [
    stage,
    setStage,
  ] =
    useState<BattleStage>(
      "battle",
    );

  const [
    questionIndex,
    setQuestionIndex,
  ] =
    useState(0);

  const [
    selectedIndex,
    setSelectedIndex,
  ] =
    useState<
      number | null
    >(null);

  const [
    answered,
    setAnswered,
  ] =
    useState(false);

  const [
    timedOut,
    setTimedOut,
  ] =
    useState(false);

  const [
    correctAnswers,
    setCorrectAnswers,
  ] =
    useState(0);

  const [
    wrongAnswers,
    setWrongAnswers,
  ] =
    useState(0);

  /*
   * Tổng thời gian của TẤT CẢ câu.
   *
   * Không chỉ tính câu đúng.
   */
  const [
    totalBattleTime,
    setTotalBattleTime,
  ] =
    useState(0);

  /*
   * Thời gian đã dùng riêng
   * cho câu hiện tại.
   *
   * Thay Date.now() để tránh:
   * react-hooks/purity.
   */
  const [
    elapsedThisQuestion,
    setElapsedThisQuestion,
  ] =
    useState(0);

  const [
    timeLeft,
    setTimeLeft,
  ] =
    useState(
      QUESTION_TIME,
    );

  const [
    inventory,
    setInventory,
  ] =
    useState<Inventory>({
      ...initialInventory,
    });

  const [
    hiddenOptions,
    setHiddenOptions,
  ] =
    useState<number[]>(
      [],
    );

  const [
    showHint,
    setShowHint,
  ] =
    useState(false);

  const [
    showPinyin,
    setShowPinyin,
  ] =
    useState(false);

  const [
    retryOffered,
    setRetryOffered,
  ] =
    useState(false);

  const [
    retryUsed,
    setRetryUsed,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    submitMessage,
    setSubmitMessage,
  ] =
    useState("");

  const [
    submitError,
    setSubmitError,
  ] =
    useState("");

  const [
    finalResult,
    setFinalResult,
  ] =
    useState<
      FinalResult | null
    >(null);

  const currentQuestion =
    battleQuestions[
      questionIndex
    ];

  const redPlayers =
    useMemo(() => {
      return liveMatch.players.filter(
        (player) =>
          player.team ===
          "red",
      );
    }, [
      liveMatch.players,
    ]);

  const bluePlayers =
    useMemo(() => {
      return liveMatch.players.filter(
        (player) =>
          player.team ===
          "blue",
      );
    }, [
      liveMatch.players,
    ]);

  const currentUserTeam =
    liveMatch.currentUserTeam;

  /*
   * Điểm tạm thời của user.
   */
  const displayedRedScore =
    liveMatch.redScore +
    (currentUserTeam ===
    "red"
      ? correctAnswers
      : 0);

  const displayedBlueScore =
    liveMatch.blueScore +
    (currentUserTeam ===
    "blue"
      ? correctAnswers
      : 0);

  /*
   * ========================================
   * FINISH ROUND
   * ========================================
   *
   * Khai báo TRƯỚC các useEffect sử dụng nó.
   *
   * Đây là phần sửa lỗi:
   * finishRound accessed before declared.
   */
  const finishRound =
    useCallback(
      (
        finalAnswerIndex:
          | number
          | null,
      ) => {
        if (
          !currentQuestion ||
          answered
        ) {
          return;
        }

        const playerCorrect =
          finalAnswerIndex ===
          currentQuestion.correctIndex;

        /*
         * Nếu trả lời quá nhanh,
         * vẫn tính tối thiểu 1 giây.
         */
        const elapsedSeconds =
          Math.max(
            1,
            elapsedThisQuestion,
          );

        /*
         * Luôn tính thời gian,
         * bất kể đúng / sai / timeout.
         */
        setTotalBattleTime(
          (
            previous,
          ) =>
            previous +
            elapsedSeconds,
        );

        if (
          playerCorrect
        ) {
          setCorrectAnswers(
            (
              previous,
            ) =>
              previous +
              1,
          );
        } else {
          setWrongAnswers(
            (
              previous,
            ) =>
              previous +
              1,
          );

          void saveWrongQuestion(
            currentQuestion,
            finalAnswerIndex,
          );
        }

        setTimedOut(
          finalAnswerIndex ===
            null,
        );

        setRetryOffered(
          false,
        );

        setAnswered(
          true,
        );
      },
      [
        answered,
        currentQuestion,
        elapsedThisQuestion,
      ],
    );

  /*
   * ========================================
   * QUESTION TIMER
   * ========================================
   */
  useEffect(() => {
    if (
      stage !==
        "battle" ||
      answered ||
      retryOffered ||
      !currentQuestion
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setTimeLeft(
            (
              previous,
            ) =>
              Math.max(
                0,
                previous -
                  1,
              ),
          );

          setElapsedThisQuestion(
            (
              previous,
            ) =>
              previous +
              1,
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    stage,
    answered,
    retryOffered,
    currentQuestion,
  ]);

  /*
   * ========================================
   * TIMEOUT
   * ========================================
   *
   * Không gọi finishRound trực tiếp
   * trong body useEffect.
   *
   * Callback được schedule sang tick
   * tiếp theo để thỏa rule React mới.
   */
  useEffect(() => {
    if (
      stage !==
        "battle" ||
      answered ||
      retryOffered ||
      timeLeft >
        0 ||
      !currentQuestion
    ) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          finishRound(
            null,
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    stage,
    answered,
    retryOffered,
    timeLeft,
    currentQuestion,
    finishRound,
  ]);

  /*
   * ========================================
   * CHECK FINAL RESULT
   * ========================================
   */
  const checkFinalResult =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/matchmaking?matchId=${encodeURIComponent(
                liveMatch.id,
              )}`,
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
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | StatusResponse
              | null;

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                "Không thể cập nhật kết quả.",
            );
          }

          if (
            !result.data
          ) {
            return;
          }

          setLiveMatch(
            result.data,
          );

          if (
            result.data
              .status ===
              "completed" &&
            result.data
              .winner
          ) {
            setFinalResult({
              winner:
                result.data
                  .winner,

              redScore:
                result.data
                  .redScore,

              blueScore:
                result.data
                  .blueScore,

              redTime:
                result.data
                  .redTime,

              blueTime:
                result.data
                  .blueTime,

              persistedMatchId:
                result.data
                  .persistedMatchId ??
                undefined,
            });

            setStage(
              "result",
            );
          } else {
            setSubmitMessage(
              result.message ||
                "Đang chờ người chơi khác hoàn thành.",
            );
          }
        } catch (
          error
        ) {
          console.warn(
            "Không thể tải kết quả:",
            error,
          );

          setSubmitError(
            error instanceof
            Error
              ? error.message
              : "Không thể cập nhật kết quả.",
          );
        }
      },
      [
        liveMatch.id,
      ],
    );

  /*
   * ========================================
   * RESULT POLLING
   * ========================================
   *
   * Không gọi checkFinalResult()
   * đồng bộ trực tiếp trong effect.
   */
  useEffect(() => {
    if (
      stage !==
      "waiting-result"
    ) {
      return;
    }

    const firstCheck =
      window.setTimeout(
        () => {
          void checkFinalResult();
        },
        0,
      );

    const timer =
      window.setInterval(
        () => {
          void checkFinalResult();
        },
        RESULT_POLLING_INTERVAL,
      );

    return () => {
      window.clearTimeout(
        firstCheck,
      );

      window.clearInterval(
        timer,
      );
    };
  }, [
    checkFinalResult,
    stage,
  ]);

  /*
   * ========================================
   * ITEMS
   * ========================================
   */

  function useFiftyFifty() {
    if (
      !currentQuestion ||
      answered ||
      retryOffered ||
      selectedIndex !==
        null ||
      hiddenOptions.length >
        0 ||
      inventory[
        "fifty-fifty"
      ] <= 0
    ) {
      return;
    }

    const wrongOptions =
      currentQuestion.options
        .map(
          (
            _,
            index,
          ) =>
            index,
        )
        .filter(
          (
            index,
          ) =>
            index !==
            currentQuestion
              .correctIndex,
        )
        .slice(
          0,
          2,
        );

    setHiddenOptions(
      wrongOptions,
    );

    setInventory(
      (
        previous,
      ) => ({
        ...previous,

        "fifty-fifty":
          previous[
            "fifty-fifty"
          ] - 1,
      }),
    );
  }

  function useHint() {
    if (
      !currentQuestion ||
      answered ||
      retryOffered ||
      showHint ||
      inventory.hint <=
        0
    ) {
      return;
    }

    setShowHint(
      true,
    );

    setInventory(
      (
        previous,
      ) => ({
        ...previous,

        hint:
          previous.hint -
          1,
      }),
    );
  }

  function usePinyin() {
    if (
      !currentQuestion ||
      answered ||
      retryOffered ||
      showPinyin ||
      !currentQuestion.pinyin ||
      inventory.pinyin <=
        0
    ) {
      return;
    }

    setShowPinyin(
      true,
    );

    setInventory(
      (
        previous,
      ) => ({
        ...previous,

        pinyin:
          previous.pinyin -
          1,
      }),
    );
  }

  function useExtraTime() {
    if (
      !currentQuestion ||
      answered ||
      retryOffered ||
      inventory[
        "extra-time"
      ] <= 0
    ) {
      return;
    }

    setTimeLeft(
      (
        previous,
      ) =>
        previous +
        10,
    );

    setInventory(
      (
        previous,
      ) => ({
        ...previous,

        "extra-time":
          previous[
            "extra-time"
          ] - 1,
      }),
    );
  }

  /*
   * ========================================
   * SUBMIT ANSWER
   * ========================================
   */
  function submitAnswer() {
    if (
      !currentQuestion ||
      selectedIndex ===
        null ||
      answered ||
      retryOffered
    ) {
      return;
    }

    const isCorrect =
      selectedIndex ===
      currentQuestion.correctIndex;

    if (
      !isCorrect &&
      !retryUsed &&
      inventory.retry >
        0
    ) {
      setRetryOffered(
        true,
      );

      return;
    }

    finishRound(
      selectedIndex,
    );
  }

  /*
   * ========================================
   * RETRY ITEM
   * ========================================
   */
  function useRetry() {
    if (
      !currentQuestion ||
      selectedIndex ===
        null ||
      !retryOffered ||
      retryUsed ||
      inventory.retry <=
        0
    ) {
      return;
    }

    /*
     * Lần trả lời sai đầu tiên vẫn
     * lưu vào error logs.
     */
    void saveWrongQuestion(
      currentQuestion,
      selectedIndex,
    );

    setInventory(
      (
        previous,
      ) => ({
        ...previous,

        retry:
          previous.retry -
          1,
      }),
    );

    setRetryUsed(
      true,
    );

    setRetryOffered(
      false,
    );

    setSelectedIndex(
      null,
    );

    setHiddenOptions(
      [],
    );

    setTimeLeft(
      (
        previous,
      ) =>
        Math.max(
          previous,
          10,
        ),
    );
  }

  function declineRetry() {
    if (
      !retryOffered
    ) {
      return;
    }

    setRetryOffered(
      false,
    );

    finishRound(
      selectedIndex,
    );
  }

  /*
   * ========================================
   * SUBMIT BATTLE RESULT
   * ========================================
   *
   * Room ID là UUID,
   * không phải Mongo ObjectId.
   *
   * Vì vậy submit qua:
   * POST /api/matchmaking
   */
  const submitBattleResult =
    useCallback(
      async () => {
        if (
          submitting
        ) {
          return;
        }

        setSubmitting(
          true,
        );

        setSubmitError(
          "",
        );

        setSubmitMessage(
          "Đang lưu kết quả trận đấu...",
        );

        try {
          const response =
            await fetch(
              "/api/matchmaking",
              {
                method:
                  "POST",

                credentials:
                  "include",

                cache:
                  "no-store",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action:
                      "submit-result",

                    matchId:
                      liveMatch.id,

                    correctAnswers,

                    wrongAnswers,

                    totalTime:
                      totalBattleTime,
                  }),
              },
            );

          const result =
            (await response
              .json()
              .catch(
                () =>
                  null,
              )) as
              | SubmitResponse
              | null;

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                "Không thể lưu kết quả.",
            );
          }

          setSubmitMessage(
            result.message ||
              "Đã lưu kết quả.",
          );

          if (
            result.completed &&
            result.data
              ?.winner
          ) {
            setFinalResult({
              winner:
                result.data
                  .winner,

              redScore:
                result.data
                  .redScore ??
                0,

              blueScore:
                result.data
                  .blueScore ??
                0,

              redTime:
                result.data
                  .redTime ??
                0,

              blueTime:
                result.data
                  .blueTime ??
                0,

              persistedMatchId:
                result.data
                  .persistedMatchId ??
                result.data
                  .matchId,
            });

            setStage(
              "result",
            );
          } else {
            setStage(
              "waiting-result",
            );
          }
        } catch (
          error
        ) {
          console.warn(
            "Không thể nộp kết quả:",
            error,
          );

          setSubmitError(
            error instanceof
            Error
              ? error.message
              : "Không thể lưu kết quả.",
          );
        } finally {
          setSubmitting(
            false,
          );
        }
      },
      [
        correctAnswers,
        liveMatch.id,
        submitting,
        totalBattleTime,
        wrongAnswers,
      ],
    );

  /*
   * ========================================
   * NEXT QUESTION
   * ========================================
   */
  function nextQuestion() {
    if (
      !answered
    ) {
      return;
    }

    if (
      questionIndex >=
      battleQuestions.length -
        1
    ) {
      void submitBattleResult();

      return;
    }

    setQuestionIndex(
      (
        previous,
      ) =>
        previous +
        1,
    );

    setSelectedIndex(
      null,
    );

    setAnswered(
      false,
    );

    setTimedOut(
      false,
    );

    setHiddenOptions(
      [],
    );

    setShowHint(
      false,
    );

    setShowPinyin(
      false,
    );

    setRetryOffered(
      false,
    );

    setRetryUsed(
      false,
    );

    setTimeLeft(
      QUESTION_TIME,
    );

    /*
     * Reset bộ đếm của câu mới.
     *
     * Không cần Date.now().
     */
    setElapsedThisQuestion(
      0,
    );
  }

  /*
   * ========================================
   * EMPTY QUESTIONS
   * ========================================
   */
  if (
    battleQuestions.length ===
    0
  ) {
    return (
      <EmptyQuestionScreen
        level={level}
        region={region}
        onRestart={
          onRestart
        }
      />
    );
  }

  /*
   * ========================================
   * WAITING RESULT
   * ========================================
   */
  if (
    stage ===
    "waiting-result"
  ) {
    return (
      <WaitingResultScreen
        match={
          liveMatch
        }
        message={
          submitMessage
        }
        error={
          submitError
        }
        onRefresh={() =>
          void checkFinalResult()
        }
      />
    );
  }

  /*
   * ========================================
   * FINAL RESULT
   * ========================================
   */
  if (
    stage ===
      "result" &&
    finalResult
  ) {
    return (
      <ResultScreen
        result={
          finalResult
        }
        region={
          region
        }
        match={
          liveMatch
        }
        onRestart={
          onRestart
        }
      />
    );
  }

  if (
    !currentQuestion
  ) {
    return (
      <EmptyQuestionScreen
        level={level}
        region={region}
        onRestart={
          onRestart
        }
      />
    );
  }

  const selectedIsCorrect =
    selectedIndex ===
    currentQuestion.correctIndex;

  const timePercentage =
    Math.min(
      100,

      (
        timeLeft /
        QUESTION_TIME
      ) *
        100,
    );

  /*
   * ========================================
   * BATTLE UI
   * ========================================
   */
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-[#102a40] via-[#0b2237] to-[#071827] shadow-[0_25px_60px_rgba(0,8,20,0.4)] sm:rounded-[28px]">

      {/* SCORE */}

      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-[#051c2c]/90 p-3 sm:gap-4 sm:p-5">

        <TeamScore
          team="ĐỘI ĐỎ"
          icon="🦅"
          score={
            displayedRedScore
          }
          playerCount={
            redPlayers.length
          }
          color="red"
        />

        <div className="min-w-[76px] text-center">

          <span className="block text-[8px] font-black tracking-wider text-emerald-300 sm:text-[11px]">

            CÂU{" "}
            {
              questionIndex +
              1
            }
            /
            {
              battleQuestions.length
            }

          </span>

          <strong className="block text-base font-black text-amber-300 sm:text-2xl">

            HSK{" "}
            {
              currentQuestion.level
            }

          </strong>

          <small className="hidden text-slate-400 sm:block">
            {
              liveMatch.mode
            }
          </small>

        </div>

        <TeamScore
          team="ĐỘI XANH"
          icon="🐉"
          score={
            displayedBlueScore
          }
          playerCount={
            bluePlayers.length
          }
          color="blue"
          alignRight
        />

      </header>

      {/* PLAYERS */}

      <div className="grid grid-cols-2 gap-px bg-white/5">

        <CompactTeamList
          players={
            redPlayers
          }
          color="red"
        />

        <CompactTeamList
          players={
            bluePlayers
          }
          color="blue"
          alignRight
        />

      </div>

      {/* TIMER */}

      <div className="border-y border-white/5 bg-[#061a29]/80 px-4 py-3 sm:px-8">

        <div className="mb-2 flex items-center justify-between">

          <span className="text-[11px] font-bold text-slate-400 sm:text-xs">

            Điểm cá nhân:{" "}
            {
              correctAnswers
            }

          </span>

          <span
            className={`font-black ${
              timeLeft <=
              10
                ? "animate-pulse text-red-400"
                : "text-amber-300"
            }`}
          >

            ⏱{" "}
            {
              timeLeft
            }{" "}
            giây

          </span>

        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">

          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft <=
              10
                ? "bg-red-400"
                : "bg-gradient-to-r from-emerald-400 to-amber-300"
            }`}
            style={{
              width:
                `${timePercentage}%`,
            }}
          />

        </div>

      </div>

      {/* QUESTION */}

      <article className="p-4 sm:p-6 lg:p-9">

        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">

          <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[9px] font-black text-emerald-300">
            CÂU HỎI CHUNG
          </span>

          <span className="rounded-full bg-blue-300/10 px-3 py-1 text-[9px] font-black text-blue-300">
            {
              currentQuestion.topic
            }
          </span>

        </div>

        <h2 className="mx-auto max-w-4xl break-words text-center text-xl font-black leading-relaxed text-white sm:text-2xl lg:text-4xl">

          {
            currentQuestion.question
          }

        </h2>

        <div className="mb-5 mt-3 min-h-6 text-center">

          {showPinyin &&
          currentQuestion.pinyin ? (
            <p className="text-sm italic text-amber-200 sm:text-base">

              {
                currentQuestion.pinyin
              }

            </p>
          ) : (
            <p className="text-xs text-slate-500 sm:text-sm">
              Dùng Kính phiên âm để hiển thị Pinyin
            </p>
          )}

        </div>

        {/* OPTIONS */}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

          {currentQuestion.options.map(
            (
              option,
              index,
            ) => {
              const isHidden =
                hiddenOptions.includes(
                  index,
                );

              const isSelected =
                selectedIndex ===
                index;

              const isCorrect =
                index ===
                currentQuestion.correctIndex;

              let className =
                "flex min-h-[68px] items-center gap-3 rounded-2xl border p-3 text-left transition sm:min-h-[76px] sm:p-4 ";

              if (
                isHidden
              ) {
                className +=
                  "cursor-not-allowed border-white/5 bg-white/5 opacity-30";
              } else if (
                answered &&
                isCorrect
              ) {
                className +=
                  "border-emerald-300 bg-emerald-400/20 text-emerald-100";
              } else if (
                answered &&
                isSelected &&
                !isCorrect
              ) {
                className +=
                  "border-red-400 bg-red-500/20 text-red-100";
              } else if (
                isSelected
              ) {
                className +=
                  "border-amber-300 bg-amber-300/15 text-white";
              } else {
                className +=
                  "border-emerald-200/15 bg-[#123148] text-slate-100 hover:border-emerald-300/50 hover:bg-[#173b54]";
              }

              return (
                <button
                  key={`${currentQuestion.id}-${index}`}
                  type="button"
                  disabled={
                    answered ||
                    retryOffered ||
                    isHidden
                  }
                  onClick={() =>
                    setSelectedIndex(
                      index,
                    )
                  }
                  className={
                    className
                  }
                >

                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 font-black text-emerald-300 sm:size-10">

                    {String.fromCharCode(
                      65 +
                        index,
                    )}

                  </span>

                  <strong className="break-words text-sm sm:text-base">

                    {isHidden
                      ? "Đã loại bỏ"
                      : option}

                  </strong>

                </button>
              );
            },
          )}

        </div>

        {/* HINT */}

        {showHint && (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">

            <strong>
              💡 Gợi ý
            </strong>

            <p className="mt-1 text-sm leading-relaxed">

              {
                currentQuestion.hint
              }

            </p>

          </div>
        )}

        {/* RETRY */}

        {retryOffered && (
          <div className="mt-5 rounded-2xl border border-orange-300/30 bg-orange-300/10 p-4">

            <strong className="text-orange-200">
              Đáp án chưa chính xác
            </strong>

            <p className="mb-4 mt-2 text-sm text-slate-300">
              Bạn có muốn dùng Thẻ hồi đáp để trả lời lại không?
            </p>

            <div className="grid gap-2 sm:grid-cols-2">

              <button
                type="button"
                onClick={
                  useRetry
                }
                className="min-h-12 rounded-xl bg-orange-300 px-4 font-black text-[#33220b]"
              >
                🔄 Dùng thẻ
              </button>

              <button
                type="button"
                onClick={
                  declineRetry
                }
                className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-4 font-bold text-slate-300"
              >
                Không sử dụng
              </button>

            </div>

          </div>
        )}

        {/* ANSWER RESULT */}

        {answered && (
          <div
            className={`mt-5 rounded-2xl border p-4 ${
              selectedIsCorrect &&
              !timedOut
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/30 bg-red-500/10 text-red-100"
            }`}
          >

            <strong className="text-lg">

              {timedOut
                ? "⏱ Đã hết thời gian!"
                : selectedIsCorrect
                  ? "✓ Chính xác!"
                  : "✕ Chưa chính xác!"}

            </strong>

            <p className="mt-2 text-sm leading-relaxed sm:text-base">

              {
                currentQuestion.explanation
              }

            </p>

          </div>
        )}

        {submitError && (
          <div className="mt-5 rounded-xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-100">
            {
              submitError
            }
          </div>
        )}

      </article>

      {/* ITEMS */}

      <footer className="border-t border-white/5 bg-[#061a29]/80 p-4 sm:p-6">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
              Vật phẩm hỗ trợ
            </span>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">

              <ItemButton
                icon="✂️"
                name="50/50"
                quantity={
                  inventory[
                    "fifty-fifty"
                  ]
                }
                disabled={
                  answered ||
                  selectedIndex !==
                    null ||
                  hiddenOptions.length >
                    0
                }
                onClick={
                  useFiftyFifty
                }
              />

              <ItemButton
                icon="💡"
                name="Gợi ý"
                quantity={
                  inventory.hint
                }
                disabled={
                  answered ||
                  showHint
                }
                onClick={
                  useHint
                }
              />

              <ItemButton
                icon="🔎"
                name="Pinyin"
                quantity={
                  inventory.pinyin
                }
                disabled={
                  answered ||
                  showPinyin ||
                  !currentQuestion.pinyin
                }
                onClick={
                  usePinyin
                }
              />

              <ItemButton
                icon="⏱️"
                name="+10 giây"
                quantity={
                  inventory[
                    "extra-time"
                  ]
                }
                disabled={
                  answered
                }
                onClick={
                  useExtraTime
                }
              />

              <ItemButton
                icon="🔄"
                name="Trả lời lại"
                quantity={
                  inventory.retry
                }
                disabled
              />

            </div>

          </div>

          {answered ? (
            <button
              type="button"
              disabled={
                submitting
              }
              onClick={
                nextQuestion
              }
              className="min-h-12 w-full rounded-xl bg-emerald-300 px-7 font-black text-[#062d32] disabled:opacity-50 xl:w-auto"
            >

              {submitting
                ? "Đang lưu kết quả..."
                : questionIndex >=
                    battleQuestions.length -
                      1
                  ? "Hoàn thành trận đấu"
                  : "Câu tiếp theo →"}

            </button>
          ) : (
            <button
              type="button"
              disabled={
                selectedIndex ===
                  null ||
                retryOffered
              }
              onClick={
                submitAnswer
              }
              className="min-h-12 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-7 font-black text-[#382207] disabled:opacity-40 xl:w-auto"
            >
              Xác nhận đáp án
            </button>
          )}

        </div>

      </footer>

    </section>
  );
}

/*
 * ==========================================
 * TEAM SCORE
 * ==========================================
 */

function TeamScore({
  team,
  icon,
  score,
  playerCount,
  color,
  alignRight = false,
}: {
  team: string;
  icon: string;

  score: number;
  playerCount: number;

  color:
    | "red"
    | "blue";

  alignRight?: boolean;
}) {
  const scoreColor =
    color ===
    "red"
      ? "text-red-300"
      : "text-blue-300";

  return (
    <div
      className={`flex items-center gap-2 ${
        alignRight
          ? "justify-end text-right"
          : ""
      }`}
    >

      {!alignRight && (
        <span className="hidden text-2xl sm:block">
          {icon}
        </span>
      )}

      <div>

        <span className="block text-[8px] font-black tracking-wider text-slate-400 sm:text-xs">

          {team} ·{" "}
          {
            playerCount
          }

        </span>

        <strong
          className={`text-2xl font-black sm:text-4xl ${scoreColor}`}
        >
          {score}
        </strong>

      </div>

      {alignRight && (
        <span className="hidden text-2xl sm:block">
          {icon}
        </span>
      )}

    </div>
  );
}

/*
 * ==========================================
 * COMPACT TEAM LIST
 * ==========================================
 */

function CompactTeamList({
  players,
  color,
  alignRight = false,
}: {
  players:
    MatchmakingPlayer[];

  color:
    | "red"
    | "blue";

  alignRight?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-wrap gap-1 bg-[#081d2c] p-2 sm:p-3 ${
        alignRight
          ? "justify-end"
          : ""
      }`}
    >

      {players.map(
        (
          player,
        ) => (
          <span
            key={`${player.user.id}-${player.team}`}
            title={
              player.user.name
            }
            className={`inline-flex max-w-[130px] items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold sm:text-xs ${
              color ===
              "red"
                ? "border-red-300/20 bg-red-300/10 text-red-100"
                : "border-blue-300/20 bg-blue-300/10 text-blue-100"
            }`}
          >

            <span>

              {player.user.avatar ||
                (player.isBot
                  ? "🤖"
                  : "👤")}

            </span>

            <span className="truncate">
              {
                player.user.name
              }
            </span>

          </span>
        ),
      )}

    </div>
  );
}

/*
 * ==========================================
 * ITEM BUTTON
 * ==========================================
 */

function ItemButton({
  icon,
  name,
  quantity,
  disabled,
  onClick,
}: {
  icon: string;

  name: string;

  quantity: number;

  disabled?: boolean;

  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled ||
        quantity <=
          0
      }
      onClick={
        onClick
      }
      className="relative flex min-h-[62px] min-w-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-2 transition hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-35 sm:min-w-[82px]"
    >

      <span className="text-xl">
        {icon}
      </span>

      <strong className="mt-1 truncate text-[9px] text-slate-200">
        {name}
      </strong>

      <small className="absolute right-1 top-1 rounded-full bg-[#061a29] px-1.5 text-[9px] font-black text-amber-300">
        ×{quantity}
      </small>

    </button>
  );
}

/*
 * ==========================================
 * WAITING RESULT
 * ==========================================
 */

function WaitingResultScreen({
  match,
  message,
  error,
  onRefresh,
}: {
  match:
    MatchmakingMatch;

  message: string;

  error: string;

  onRefresh:
    () => void;
}) {
  const submittedCount =
    match.players.filter(
      (
        player,
      ) =>
        player.submitted,
    ).length;

  return (
    <section className="grid min-h-[620px] place-items-center rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-[#102a40] to-[#071827] p-5 text-center">

      <div className="w-full max-w-xl">

        <div className="mx-auto grid size-24 animate-pulse place-items-center rounded-full bg-emerald-300/10 text-5xl">
          ⏳
        </div>

        <span className="mt-6 block text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
          Đã lưu kết quả của bạn
        </span>

        <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          Đang chờ người chơi khác
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">

          {message ||
            "Những người chơi khác vẫn đang trả lời câu hỏi."}

        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">

          <strong className="text-2xl text-amber-300">

            {
              submittedCount
            }
            /
            {
              match.players.length
            }

          </strong>

          <span className="mt-1 block text-xs text-slate-500">
            người đã hoàn thành
          </span>

        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={
            onRefresh
          }
          className="mt-5 min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 font-bold text-slate-200"
        >
          Cập nhật kết quả
        </button>

      </div>

    </section>
  );
}

/*
 * ==========================================
 * RESULT
 * ==========================================
 */

function ResultScreen({
  result,
  region,
  match,
  onRestart,
}: {
  result:
    FinalResult;

  region:
    Region;

  match:
    MatchmakingMatch;

  onRestart:
    () => void;
}) {
  const currentTeam =
    match.currentUserTeam;

  const playerWon =
    result.winner ===
    currentTeam;

  return (
    <section className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-[#102a40] to-[#071827] p-5 text-center">

      <div className="text-8xl">

        {result.winner ===
        "draw"
          ? "🤝"
          : playerWon
            ? "🏆"
            : "🛡️"}

      </div>

      <span className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
        Kết quả trận đấu
      </span>

      <h2 className="mt-2 text-3xl font-black text-white sm:text-5xl">

        {result.winner ===
        "draw"
          ? "Hai đội hòa nhau!"
          : playerWon
            ? "Đội của bạn chiến thắng!"
            : "Đội đối thủ chiến thắng!"}

      </h2>

      <p className="mt-3 text-slate-400">

        {
          match.mode
        }{" "}
        · HSK{" "}
        {
          match.level
        }{" "}
        ·{" "}
        {
          region.name
        }

      </p>

      <div className="my-8 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3">

        <ResultCard
          name="Đội Đỏ"
          icon="🦅"
          score={
            result.redScore
          }
          time={
            result.redTime
          }
          winner={
            result.winner ===
            "red"
          }
          color="red"
        />

        <strong className="text-2xl text-amber-300">
          VS
        </strong>

        <ResultCard
          name="Đội Xanh"
          icon="🐉"
          score={
            result.blueScore
          }
          time={
            result.blueTime
          }
          winner={
            result.winner ===
            "blue"
          }
          color="blue"
        />

      </div>

      <div className="mb-6 rounded-xl border border-emerald-300/10 bg-emerald-300/5 px-5 py-3 text-sm text-slate-300">

        <p>
          Kết quả và số lần chơi đã được lưu vào tài khoản của bạn.
        </p>

        {result.persistedMatchId && (
          <p className="mt-2 break-all text-xs text-slate-500">

            Match ID:{" "}
            {
              result.persistedMatchId
            }

          </p>
        )}

      </div>

      <button
        type="button"
        onClick={
          onRestart
        }
        className="min-h-12 rounded-xl bg-emerald-300 px-7 font-black text-[#062d32]"
      >
        Bắt đầu hành trình mới
      </button>

    </section>
  );
}

/*
 * ==========================================
 * RESULT CARD
 * ==========================================
 */

function ResultCard({
  name,
  icon,
  score,
  time,
  winner,
  color,
}: {
  name: string;

  icon: string;

  score: number;

  time: number;

  winner: boolean;

  color:
    | "red"
    | "blue";
}) {
  return (
    <article
      className={`rounded-2xl border p-4 sm:p-6 ${
        winner
          ? "border-amber-300 bg-amber-300/10"
          : color ===
              "red"
            ? "border-red-300/20 bg-red-300/5"
            : "border-blue-300/20 bg-blue-300/5"
      }`}
    >

      <span className="text-3xl">
        {icon}
      </span>

      <strong className="mt-2 block text-white">
        {name}
      </strong>

      <b className="block text-4xl text-white sm:text-5xl">
        {score}
      </b>

      <small className="text-slate-400">

        {Math.max(
          0,
          Math.round(
            time,
          ),
        )}{" "}
        giây

      </small>

    </article>
  );
}

/*
 * ==========================================
 * EMPTY QUESTION
 * ==========================================
 */

function EmptyQuestionScreen({
  level,
  region,
  onRestart,
}: {
  level:
    HSKLevel;

  region:
    Region;

  onRestart:
    () => void;
}) {
  return (
    <section className="grid min-h-[500px] place-items-center rounded-3xl border border-amber-300/20 bg-[#0b2235] p-6 text-center">

      <div>

        <div className="text-6xl">
          📭
        </div>

        <h2 className="mt-4 text-2xl font-black">
          Chưa có đủ câu hỏi
        </h2>

        <p className="mt-2 text-slate-400">

          Chưa có đủ câu hỏi HSK{" "}
          {level} tại{" "}
          {region.name}.

        </p>

        <button
          type="button"
          onClick={
            onRestart
          }
          className="mt-5 rounded-xl bg-emerald-300 px-6 py-3 font-black text-[#062d32]"
        >
          Quay lại
        </button>

      </div>

    </section>
  );
}

/*
 * ==========================================
 * SAVE WRONG QUESTION
 * ==========================================
 */

async function saveWrongQuestion(
  question:
    GameQuestion,

  selectedIndex:
    | number
    | null,
) {
  try {
    /*
     * Đây là chức năng phụ.
     *
     * API lỗi không được làm
     * gián đoạn trận đấu.
     */
    const response =
      await fetch(
        "/api/error-logs",
        {
          method:
            "POST",

          credentials:
            "include",

          cache:
            "no-store",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify({
              questionId:
                question.id,

              selectedIndex,

              level:
                question.level,

              topic:
                question.topic,

              question:
                question.question,

              correctIndex:
                question.correctIndex,
            }),
        },
      );

    const result =
      (await response
        .json()
        .catch(
          () =>
            null,
        )) as
        | {
            success?:
              boolean;

            message?:
              string;
          }
        | null;

    if (
      response.status ===
        401 ||
      response.status ===
        403
    ) {
      console.warn(
        "Bỏ qua lưu câu sai vì phiên đăng nhập không hợp lệ:",
        result?.message ??
          `HTTP ${response.status}`,
      );

      return;
    }

    if (
      !response.ok ||
      !result?.success
    ) {
      console.warn(
        "Không lưu được câu sai:",
        result?.message ??
          `HTTP ${response.status}`,
      );
    }
  } catch (
    error
  ) {
    console.warn(
      "Bỏ qua lỗi lưu câu sai:",
      error,
    );
  }
}