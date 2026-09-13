"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  HSKLevel,
  Inventory,
  Region,
} from "@/types/game";

interface BattleQuestion {
  id: string;
  level: HSKLevel;
  topic: string;
  question: string;
  pinyin?: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

interface TeamBattleScreenProps {
  level: HSKLevel;
  region: Region;
  initialInventory: Inventory;
  onRestart: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface ErrorLogItem {
  questionId: string;
  level: HSKLevel;
  topic: string;
  question: string;
  pinyin?: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  wrongCount: number;
  reviewed: boolean;
  updatedAt: string;
}

type BattleStage =
  | "matching"
  | "battle"
  | "result";

type Winner = "red" | "blue" | "draw";

const QUESTION_STORAGE_KEY =
  "hsk-admin-question-bank";

const QUESTION_TIME = 30;

const RED_TEAM: TeamMember[] = [
  {
    id: "red-1",
    name: "Bạn",
    avatar: "🧑‍✈️",
    role: "Đội trưởng",
  },
  {
    id: "red-2",
    name: "Tiểu Minh",
    avatar: "👨‍🎓",
    role: "Đồng đội",
  },
  {
    id: "red-3",
    name: "Linh Linh",
    avatar: "👩‍🎓",
    role: "Đồng đội",
  },
];

const BLUE_TEAM: TeamMember[] = [
  {
    id: "blue-1",
    name: "Hạo Nhiên",
    avatar: "🧑‍🚀",
    role: "Đội trưởng",
  },
  {
    id: "blue-2",
    name: "Gia Ninh",
    avatar: "👨‍🎓",
    role: "Đối thủ",
  },
  {
    id: "blue-3",
    name: "Tiểu Vũ",
    avatar: "👩‍🎓",
    role: "Đối thủ",
  },
];

/*
 * Kết quả mô phỏng của hai đồng đội Đỏ.
 * Mỗi hàng tương ứng với một câu hỏi.
 */
const RED_TEAMMATE_RESULTS = [
  [true, false],
  [true, true],
  [false, true],
];

/*
 * Kết quả mô phỏng của ba thành viên Đội Xanh.
 */
const BLUE_TEAM_RESULTS = [
  [true, true, false],
  [true, false, true],
  [true, true, true],
];

const RED_TEAMMATE_TIMES = [
  [8, 0],
  [9, 11],
  [0, 8],
];

const BLUE_TEAM_TIMES = [
  [7, 9, 0],
  [8, 0, 11],
  [7, 10, 9],
];

const DEFAULT_QUESTIONS: BattleQuestion[] = [
  // ==================== HSK 3 ====================

  {
    id: "default-hsk3-01",
    level: 3,
    topic: "Từ vựng",
    question: "我每天早上七点___。",
    pinyin:
      "Wǒ měitiān zǎoshang qī diǎn ___.",
    options: ["起床", "睡觉", "下班", "休息"],
    correctIndex: 0,
    hint: "Hành động thường làm vào buổi sáng.",
    explanation:
      '"起床" nghĩa là thức dậy. Câu này có nghĩa: Tôi thức dậy lúc 7 giờ mỗi sáng.',
  },
  {
    id: "default-hsk3-02",
    level: 3,
    topic: "Ngữ pháp",
    question: "她唱歌唱___很好。",
    pinyin:
      "Tā chànggē chàng ___ hěn hǎo.",
    options: ["了", "得", "过", "着"],
    correctIndex: 1,
    hint:
      "Cần một trợ từ bổ sung mức độ sau động từ.",
    explanation:
      '"得" được đặt sau động từ để bổ sung mức độ. Câu này nghĩa là cô ấy hát rất hay.',
  },
  {
    id: "default-hsk3-03",
    level: 3,
    topic: "Từ vựng",
    question: "“附近” có nghĩa là gì?",
    pinyin: "fùjìn",
    options: [
      "Xa xôi",
      "Gần đây",
      "Ở giữa",
      "Phía trên",
    ],
    correctIndex: 1,
    hint: "Từ dùng để nói về một nơi ở gần.",
    explanation:
      '"附近" nghĩa là gần đây hoặc khu vực lân cận.',
  },

  // ==================== HSK 4 ====================

  {
    id: "default-hsk4-01",
    level: 4,
    topic: "Ngữ pháp",
    question:
      "虽然今天下雨，___他还是去上班了。",
    pinyin:
      "Suīrán jīntiān xiàyǔ, ___ tā háishì qù shàngbān le.",
    options: ["所以", "但是", "因为", "如果"],
    correctIndex: 1,
    hint: "Cấu trúc: mặc dù... nhưng...",
    explanation:
      'Cấu trúc đúng là "虽然……但是……", nghĩa là mặc dù... nhưng...',
  },
  {
    id: "default-hsk4-02",
    level: 4,
    topic: "Từ vựng",
    question: "“经验” có nghĩa là gì?",
    pinyin: "jīngyàn",
    options: [
      "Kinh nghiệm",
      "Kế hoạch",
      "Kết quả",
      "Thói quen",
    ],
    correctIndex: 0,
    hint:
      "Kiến thức có được qua quá trình thực hành.",
    explanation:
      '"经验" nghĩa là kinh nghiệm tích lũy từ học tập, công việc hoặc cuộc sống.',
  },
  {
    id: "default-hsk4-03",
    level: 4,
    topic: "Đọc hiểu",
    question:
      "他每天坚持运动，所以身体越来越好。Vì sao sức khỏe của anh ấy tốt hơn?",
    pinyin:
      "Tā měitiān jiānchí yùndòng, suǒyǐ shēntǐ yuèláiyuè hǎo.",
    options: [
      "Vì ngủ nhiều",
      "Vì ăn ít",
      "Vì kiên trì vận động",
      "Vì không đi làm",
    ],
    correctIndex: 2,
    hint: 'Chú ý cụm từ "坚持运动".',
    explanation:
      '"坚持运动" nghĩa là kiên trì tập thể dục.',
  },

  // ==================== HSK 5 ====================

  {
    id: "default-hsk5-01",
    level: 5,
    topic: "Ngữ pháp",
    question: "这件事情必须认真___。",
    pinyin:
      "Zhè jiàn shìqing bìxū rènzhēn ___.",
    options: ["处理", "举行", "发生", "提供"],
    correctIndex: 0,
    hint: "Động từ mang nghĩa xử lý vấn đề.",
    explanation:
      '"处理事情" nghĩa là xử lý sự việc hoặc giải quyết vấn đề.',
  },
  {
    id: "default-hsk5-02",
    level: 5,
    topic: "Từ vựng",
    question:
      "“逐渐” gần nghĩa nhất với từ nào?",
    pinyin: "zhújiàn",
    options: ["突然", "慢慢", "立刻", "永远"],
    correctIndex: 1,
    hint: "Một sự thay đổi xảy ra từ từ.",
    explanation:
      '"逐渐" nghĩa là dần dần, gần nghĩa với "慢慢".',
  },
  {
    id: "default-hsk5-03",
    level: 5,
    topic: "Đọc hiểu",
    question:
      "只有不断学习，才能适应社会的发展。Ý chính của câu là gì?",
    pinyin:
      "Zhǐyǒu bùduàn xuéxí, cáinéng shìyìng shèhuì de fāzhǎn.",
    options: [
      "Xã hội phát triển quá chậm",
      "Cần học liên tục để thích nghi",
      "Không cần học sau khi đi làm",
      "Học không ảnh hưởng công việc",
    ],
    correctIndex: 1,
    hint: 'Chú ý cấu trúc "只有……才……".',
    explanation:
      "Câu nhấn mạnh cần học tập liên tục để thích nghi với sự phát triển của xã hội.",
  },

  // ==================== HSK 6 ====================

  {
    id: "default-hsk6-01",
    level: 6,
    topic: "Từ vựng",
    question: "“不可避免” có nghĩa là gì?",
    pinyin: "bùkě bìmiǎn",
    options: [
      "Không đáng quan tâm",
      "Không thể tránh khỏi",
      "Không được phép",
      "Không có kết quả",
    ],
    correctIndex: 1,
    hint: "Một sự việc nhất định sẽ xảy ra.",
    explanation:
      '"不可避免" nghĩa là không thể tránh khỏi.',
  },
  {
    id: "default-hsk6-02",
    level: 6,
    topic: "Ngữ pháp",
    question:
      "与其抱怨困难，___积极寻找解决办法。",
    pinyin:
      "Yǔqí bàoyuàn kùnnan, ___ jījí xúnzhǎo jiějué bànfǎ.",
    options: ["不如", "不但", "尽管", "除非"],
    correctIndex: 0,
    hint: "Cấu trúc: thay vì... chi bằng...",
    explanation:
      'Cấu trúc "与其……不如……" nghĩa là thay vì... chi bằng...',
  },
  {
    id: "default-hsk6-03",
    level: 6,
    topic: "Đọc hiểu",
    question:
      "科技的发展既带来了便利，也引发了新的社会问题。Câu này thể hiện điều gì?",
    pinyin:
      "Kējì de fāzhǎn jì dàilái le biànlì, yě yǐnfā le xīn de shèhuì wèntí.",
    options: [
      "Công nghệ chỉ có lợi",
      "Công nghệ chỉ gây tác hại",
      "Công nghệ vừa có lợi vừa tạo ra vấn đề",
      "Công nghệ không ảnh hưởng xã hội",
    ],
    correctIndex: 2,
    hint: 'Chú ý cấu trúc "既……也……".',
    explanation:
      "Câu thể hiện công nghệ vừa mang lại tiện lợi, vừa tạo ra những vấn đề xã hội mới.",
  },
];

function getQuestionsFromAdmin(): BattleQuestion[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedQuestions =
      window.localStorage.getItem(
        QUESTION_STORAGE_KEY,
      );

    if (!savedQuestions) {
      return [];
    }

    const parsedQuestions: unknown =
      JSON.parse(savedQuestions);

    if (!Array.isArray(parsedQuestions)) {
      return [];
    }

    return parsedQuestions as BattleQuestion[];
  } catch (error) {
    console.error(
      "Không thể tải câu hỏi admin:",
      error,
    );

    return [];
  }
}

function createBattleQuestions(
  level: HSKLevel,
): BattleQuestion[] {
  const adminQuestions =
    getQuestionsFromAdmin().filter(
      (question) => question.level === level,
    );

  const defaultQuestions =
    DEFAULT_QUESTIONS.filter(
      (question) => question.level === level,
    );

  const combinedQuestions = [
    ...adminQuestions,
    ...defaultQuestions.filter(
      (defaultQuestion) =>
        !adminQuestions.some(
          (adminQuestion) =>
            adminQuestion.id === defaultQuestion.id,
        ),
    ),
  ];

  return combinedQuestions.slice(0, 3);
}

export default function TeamBattleScreen({
  level,
  region,
  initialInventory,
  onRestart,
}: TeamBattleScreenProps) {
  const [stage, setStage] =
    useState<BattleStage>("matching");

  const [battleQuestions, setBattleQuestions] =
    useState<BattleQuestion[]>([]);

  const [questionIndex, setQuestionIndex] =
    useState(0);

  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  const [answered, setAnswered] =
    useState(false);

  const [timedOut, setTimedOut] =
    useState(false);

  const [redScore, setRedScore] =
    useState(0);

  const [blueScore, setBlueScore] =
    useState(0);

  const [redTime, setRedTime] =
    useState(0);

  const [blueTime, setBlueTime] =
    useState(0);

  const [timeLeft, setTimeLeft] =
    useState(QUESTION_TIME);

  const [questionStartedAt, setQuestionStartedAt] =
    useState(Date.now());

  const [inventory, setInventory] =
    useState<Inventory>({
      ...initialInventory,
    });

  const [hiddenOptions, setHiddenOptions] =
    useState<number[]>([]);

  const [showHint, setShowHint] =
    useState(false);

  const [showPinyin, setShowPinyin] =
    useState(false);

  const [retryOffered, setRetryOffered] =
    useState(false);

  const [retryUsed, setRetryUsed] =
    useState(false);

  const currentQuestion =
    battleQuestions[questionIndex];

  const redTeammatePoints = useMemo(() => {
    return RED_TEAMMATE_RESULTS[
      questionIndex
    ]?.filter(Boolean).length ?? 0;
  }, [questionIndex]);

  const blueRoundPoints = useMemo(() => {
    return BLUE_TEAM_RESULTS[
      questionIndex
    ]?.filter(Boolean).length ?? 0;
  }, [questionIndex]);

  /*
   * Nạp câu hỏi do admin thêm.
   */
  useEffect(() => {
    setBattleQuestions(
      createBattleQuestions(level),
    );
  }, [level]);

  /*
   * Màn hình ghép hai đội.
   */
  useEffect(() => {
    if (stage !== "matching") return;

    const timer = window.setTimeout(() => {
      setQuestionStartedAt(Date.now());
      setStage("battle");
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [stage]);

  /*
   * Đồng hồ đếm ngược.
   */
  useEffect(() => {
    if (
      stage !== "battle" ||
      answered ||
      retryOffered ||
      !currentQuestion
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) =>
        Math.max(0, previous - 1),
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    stage,
    answered,
    retryOffered,
    currentQuestion,
  ]);

  /*
   * Hết thời gian sẽ tự động chốt câu sai.
   */
  useEffect(() => {
    if (
      stage !== "battle" ||
      answered ||
      retryOffered ||
      timeLeft > 0 ||
      !currentQuestion
    ) {
      return;
    }

    finishRound(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timeLeft,
    stage,
    answered,
    retryOffered,
    currentQuestion,
  ]);

  function useFiftyFifty() {
    if (
      !currentQuestion ||
      answered ||
      selectedIndex !== null ||
      hiddenOptions.length > 0 ||
      inventory["fifty-fifty"] <= 0
    ) {
      return;
    }

    const wrongOptions =
      currentQuestion.options
        .map((_, index) => index)
        .filter(
          (index) =>
            index !== currentQuestion.correctIndex,
        )
        .slice(0, 2);

    setHiddenOptions(wrongOptions);

    setInventory((previous) => ({
      ...previous,
      "fifty-fifty":
        previous["fifty-fifty"] - 1,
    }));
  }

  function useHint() {
    if (
      !currentQuestion ||
      answered ||
      showHint ||
      inventory.hint <= 0
    ) {
      return;
    }

    setShowHint(true);

    setInventory((previous) => ({
      ...previous,
      hint: previous.hint - 1,
    }));
  }

  function usePinyin() {
    if (
      !currentQuestion ||
      answered ||
      showPinyin ||
      !currentQuestion.pinyin ||
      inventory.pinyin <= 0
    ) {
      return;
    }

    setShowPinyin(true);

    setInventory((previous) => ({
      ...previous,
      pinyin: previous.pinyin - 1,
    }));
  }

  function useExtraTime() {
    if (
      answered ||
      retryOffered ||
      inventory["extra-time"] <= 0
    ) {
      return;
    }

    setTimeLeft(
      (previous) => previous + 10,
    );

    setInventory((previous) => ({
      ...previous,
      "extra-time":
        previous["extra-time"] - 1,
    }));
  }

  function submitAnswer() {
    if (
      !currentQuestion ||
      selectedIndex === null ||
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
      inventory.retry > 0
    ) {
      setRetryOffered(true);
      return;
    }

    finishRound(selectedIndex);
  }

  function useRetry() {
    if (
      !currentQuestion ||
      selectedIndex === null ||
      !retryOffered ||
      retryUsed ||
      inventory.retry <= 0
    ) {
      return;
    }

    saveWrongQuestion(
      currentQuestion,
      selectedIndex,
    );

    setInventory((previous) => ({
      ...previous,
      retry: previous.retry - 1,
    }));

    setRetryUsed(true);
    setRetryOffered(false);
    setSelectedIndex(null);
    setHiddenOptions([]);
    setTimeLeft((previous) =>
      Math.max(previous, 10),
    );
  }

  function declineRetry() {
    if (!retryOffered) return;

    setRetryOffered(false);
    finishRound(selectedIndex);
  }

  function finishRound(
    finalAnswerIndex: number | null,
  ) {
    if (!currentQuestion || answered) {
      return;
    }

    const playerCorrect =
      finalAnswerIndex ===
      currentQuestion.correctIndex;

    const elapsedSeconds = Math.max(
      1,
      Math.round(
        (Date.now() - questionStartedAt) / 1000,
      ),
    );

    const redRoundScore =
      redTeammatePoints +
      (playerCorrect ? 1 : 0);

    const redTeammatesTime =
      RED_TEAMMATE_TIMES[
        questionIndex
      ]?.reduce(
        (total, value) => total + value,
        0,
      ) ?? 0;

    const blueRoundTime =
      BLUE_TEAM_TIMES[
        questionIndex
      ]?.reduce(
        (total, value) => total + value,
        0,
      ) ?? 0;

    setRedScore(
      (previous) =>
        previous + redRoundScore,
    );

    setBlueScore(
      (previous) =>
        previous + blueRoundPoints,
    );

    setRedTime(
      (previous) =>
        previous +
        redTeammatesTime +
        (playerCorrect ? elapsedSeconds : 0),
    );

    setBlueTime(
      (previous) =>
        previous + blueRoundTime,
    );

    if (!playerCorrect) {
      saveWrongQuestion(
        currentQuestion,
        finalAnswerIndex,
      );
    }

    setTimedOut(finalAnswerIndex === null);
    setRetryOffered(false);
    setAnswered(true);
  }

  function nextQuestion() {
    if (!answered) return;

    if (
      questionIndex >=
      battleQuestions.length - 1
    ) {
      setStage("result");
      return;
    }

    setQuestionIndex(
      (previous) => previous + 1,
    );

    setSelectedIndex(null);
    setAnswered(false);
    setTimedOut(false);
    setHiddenOptions([]);
    setShowHint(false);
    setShowPinyin(false);
    setRetryOffered(false);
    setRetryUsed(false);
    setTimeLeft(QUESTION_TIME);
    setQuestionStartedAt(Date.now());
  }

  function determineWinner(): Winner {
    if (redScore > blueScore) {
      return "red";
    }

    if (blueScore > redScore) {
      return "blue";
    }

    if (redTime < blueTime) {
      return "red";
    }

    if (blueTime < redTime) {
      return "blue";
    }

    return "draw";
  }

  if (stage === "matching") {
    return (
      <MatchingScreen
        level={level}
        region={region}
      />
    );
  }

  if (stage === "result") {
    return (
      <ResultScreen
        winner={determineWinner()}
        region={region}
        redScore={redScore}
        blueScore={blueScore}
        redTime={redTime}
        blueTime={blueTime}
        onRestart={onRestart}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <section className="rounded-3xl border border-red-300/20 bg-[#0b2235] p-8 text-center">
        <div className="text-6xl">📭</div>

        <h2 className="mt-4 text-2xl font-black">
          Chưa có đủ câu hỏi
        </h2>

        <p className="text-slate-400">
          Hãy thêm câu hỏi HSK {level} tại trang
          quản trị.
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-4 rounded-xl bg-emerald-300 px-6 py-3 font-black text-[#062d32]"
        >
          Quay lại
        </button>
      </section>
    );
  }

  const selectedIsCorrect =
    selectedIndex ===
    currentQuestion.correctIndex;

  const timePercentage = Math.min(
    100,
    (timeLeft / QUESTION_TIME) * 100,
  );

  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-[#102a40] via-[#0b2237] to-[#071827] shadow-[0_30px_80px_rgba(0,8,20,0.45)]">
      {/* Điểm hai đội */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-[#051c2c]/90 p-4 md:p-6">
        <TeamScore
          team="ĐỘI ĐỎ"
          icon="🦅"
          score={redScore}
          color="red"
        />

        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black tracking-widest text-emerald-300 md:text-[11px]">
            CÂU {questionIndex + 1}/
            {battleQuestions.length}
          </span>

          <strong className="text-lg font-black text-amber-300 md:text-2xl">
            HSK {currentQuestion.level}
          </strong>

          <small className="text-slate-400">
            {currentQuestion.topic}
          </small>
        </div>

        <TeamScore
          team="ĐỘI XANH"
          icon="🐉"
          score={blueScore}
          color="blue"
          alignRight
        />
      </header>

      {/* Đồng hồ */}
      <div className="border-y border-white/5 bg-[#061a29]/80 px-5 py-3 md:px-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            Hai đội đang trả lời cùng câu hỏi
          </span>

          <span
            className={`font-black ${
              timeLeft <= 10
                ? "animate-pulse text-red-400"
                : "text-amber-300"
            }`}
          >
            ⏱ {timeLeft} giây
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft <= 10
                ? "bg-red-400"
                : "bg-gradient-to-r from-emerald-400 to-amber-300"
            }`}
            style={{
              width: `${timePercentage}%`,
            }}
          />
        </div>
      </div>

      {/* Câu hỏi */}
      <article className="p-5 md:p-9">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-300">
            CÂU HỎI CHUNG
          </span>

          <span className="rounded-full bg-blue-300/10 px-3 py-1 text-[10px] font-black text-blue-300">
            {currentQuestion.topic}
          </span>
        </div>

        <h2 className="mx-auto mb-3 max-w-4xl text-center text-2xl font-black leading-relaxed text-white md:text-4xl">
          {currentQuestion.question}
        </h2>

        {showPinyin && currentQuestion.pinyin && (
          <p className="mb-7 text-center text-base italic text-amber-200">
            {currentQuestion.pinyin}
          </p>
        )}

        {!showPinyin && (
          <p className="mb-7 text-center text-sm text-slate-500">
            Sử dụng Kính phiên âm để hiển thị pinyin
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {currentQuestion.options.map(
            (option, index) => {
              const isHidden =
                hiddenOptions.includes(index);

              const isSelected =
                selectedIndex === index;

              const isCorrect =
                index ===
                currentQuestion.correctIndex;

              let className =
                "flex min-h-[76px] items-center gap-3 rounded-2xl border p-4 text-left transition ";

              if (isHidden) {
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
              } else if (isSelected) {
                className +=
                  "border-amber-300 bg-amber-300/15 text-white";
              } else {
                className +=
                  "border-emerald-200/15 bg-[#123148] text-slate-100 hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-[#173b54]";
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
                    setSelectedIndex(index)
                  }
                  className={className}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 font-black text-emerald-300">
                    {String.fromCharCode(65 + index)}
                  </span>

                  <strong>
                    {isHidden
                      ? "Đã loại bỏ"
                      : option}
                  </strong>
                </button>
              );
            },
          )}
        </div>

        {showHint && (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">
            <strong>💡 Gợi ý</strong>

            <p className="mb-0 mt-1">
              {currentQuestion.hint}
            </p>
          </div>
        )}

        {retryOffered && (
          <div className="mt-5 rounded-2xl border border-orange-300/30 bg-orange-300/10 p-5">
            <strong className="text-orange-200">
              Đáp án chưa chính xác
            </strong>

            <p className="mb-4 mt-2 text-sm text-slate-300">
              Bạn đang có Thẻ hồi đáp. Bạn có muốn
              trả lời lại một lần không?
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={useRetry}
                className="rounded-xl bg-orange-300 px-5 py-3 font-black text-[#33220b]"
              >
                🔄 Dùng thẻ trả lời lại
              </button>

              <button
                type="button"
                onClick={declineRetry}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-slate-300"
              >
                Không sử dụng
              </button>
            </div>
          </div>
        )}

        {answered && (
          <div
            className={`mt-5 rounded-2xl border p-5 ${
              selectedIsCorrect && !timedOut
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

            <p className="mb-0 mt-2 leading-relaxed">
              {currentQuestion.explanation}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-red-300/10 p-3">
                <small className="block opacity-70">
                  Điểm Đội Đỏ vòng này
                </small>

                <strong className="text-xl">
                  {redTeammatePoints +
                    (selectedIsCorrect ? 1 : 0)}
                </strong>
              </div>

              <div className="rounded-xl bg-blue-300/10 p-3">
                <small className="block opacity-70">
                  Điểm Đội Xanh vòng này
                </small>

                <strong className="text-xl">
                  {blueRoundPoints}
                </strong>
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Vật phẩm và nút xác nhận */}
      <div className="border-t border-white/5 bg-[#051b2a]/80 p-5 md:px-9">
        <p className="mb-3 mt-0 text-[10px] font-black tracking-widest text-slate-500">
          VẬT PHẨM HỖ TRỢ
        </p>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <ItemButton
              icon="🧭"
              label="50/50"
              quantity={inventory["fifty-fifty"]}
              disabled={
                answered ||
                retryOffered ||
                selectedIndex !== null ||
                hiddenOptions.length > 0
              }
              onClick={useFiftyFifty}
            />

            <ItemButton
              icon="📜"
              label="Gợi ý"
              quantity={inventory.hint}
              disabled={
                answered ||
                retryOffered ||
                showHint
              }
              onClick={useHint}
            />

            <ItemButton
              icon="🔎"
              label="Pinyin"
              quantity={inventory.pinyin}
              disabled={
                answered ||
                retryOffered ||
                showPinyin ||
                !currentQuestion.pinyin
              }
              onClick={usePinyin}
            />

            <ItemButton
              icon="⏳"
              label="+10 giây"
              quantity={inventory["extra-time"]}
              disabled={
                answered || retryOffered
              }
              onClick={useExtraTime}
            />

            <ItemButton
              icon="🔄"
              label="Trả lời lại"
              quantity={inventory.retry}
              disabled={!retryOffered}
              onClick={useRetry}
            />
          </div>

          {!answered ? (
            <button
              type="button"
              disabled={
                selectedIndex === null ||
                retryOffered
              }
              onClick={submitAnswer}
              className="min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-8 font-black text-[#172532] shadow-[0_13px_30px_rgba(251,191,36,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Xác nhận đáp án
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-300 to-emerald-400 px-8 font-black text-[#062d32] shadow-[0_13px_30px_rgba(52,211,153,0.2)] transition hover:-translate-y-0.5"
            >
              {questionIndex ===
              battleQuestions.length - 1
                ? "Xem kết quả"
                : "Câu tiếp theo →"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function MatchingScreen({
  level,
  region,
}: {
  level: HSKLevel;
  region: Region;
}) {
  return (
    <section className="min-h-[680px] overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-[#102a40] via-[#0b2237] to-[#071827] p-5 shadow-[0_30px_80px_rgba(0,8,20,0.45)] md:p-8">
      <div className="text-center">
        <p className="m-0 text-[10px] font-black tracking-[0.18em] text-emerald-300">
          GHÉP ĐỘI THÀNH CÔNG
        </p>

        <h2 className="mb-2 mt-3 text-3xl font-black text-white md:text-5xl">
          Trận chiến HSK tại{" "}
          <span className="text-amber-300">
            {region.name}
          </span>
        </h2>

        <p className="text-slate-400">
          Hai đội cùng trả lời 3 câu hỏi HSK {level}
        </p>
      </div>

      <div className="mx-auto mt-9 grid max-w-5xl grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <TeamRoster
          name="Đội Đỏ"
          icon="🦅"
          members={RED_TEAM}
          color="red"
        />

        <div className="flex flex-col items-center">
          <div className="grid size-20 animate-pulse place-items-center rounded-full border-2 border-amber-300/40 bg-amber-300/10 text-3xl font-black text-amber-300 shadow-[0_0_40px_rgba(251,191,36,0.16)]">
            VS
          </div>

          <span className="mt-3 text-xs font-bold text-slate-500">
            3 VS 3
          </span>
        </div>

        <TeamRoster
          name="Đội Xanh"
          icon="🐉"
          members={BLUE_TEAM}
          color="blue"
        />
      </div>

      <div className="mx-auto mt-8 max-w-md">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-red-400 via-amber-300 to-blue-400" />
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Đang đồng bộ câu hỏi cho sáu người chơi...
        </p>
      </div>
    </section>
  );
}

function TeamRoster({
  name,
  icon,
  members,
  color,
}: {
  name: string;
  icon: string;
  members: TeamMember[];
  color: "red" | "blue";
}) {
  const teamClass =
    color === "red"
      ? "border-red-400/30 bg-red-400/10"
      : "border-blue-400/30 bg-blue-400/10";

  const avatarClass =
    color === "red"
      ? "border-red-300/30 bg-red-300/10"
      : "border-blue-300/30 bg-blue-300/10";

  return (
    <article
      className={`rounded-3xl border p-5 ${teamClass}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-black tracking-widest text-slate-400">
            ĐỘI HÌNH
          </span>

          <h3 className="m-0 text-2xl font-black text-white">
            {name}
          </h3>
        </div>

        <span className="text-4xl">{icon}</span>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#071a2a]/60 p-3"
          >
            <div
              className={`grid size-12 place-items-center rounded-2xl border text-2xl ${avatarClass}`}
            >
              {member.avatar}
            </div>

            <div className="min-w-0 flex-1">
              <strong className="block truncate text-white">
                {member.name}
              </strong>

              <small className="text-slate-400">
                {member.role}
              </small>
            </div>

            <span className="size-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
          </div>
        ))}
      </div>
    </article>
  );
}

function TeamScore({
  team,
  icon,
  score,
  color,
  alignRight = false,
}: {
  team: string;
  icon: string;
  score: number;
  color: "red" | "blue";
  alignRight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col ${
        alignRight ? "items-end" : "items-start"
      }`}
    >
      <span
        className={`text-[9px] font-black md:text-xs ${
          color === "red"
            ? "text-red-300"
            : "text-blue-300"
        }`}
      >
        {alignRight
          ? `${team} ${icon}`
          : `${icon} ${team}`}
      </span>

      <strong className="text-3xl font-black text-white">
        {score}
      </strong>
    </div>
  );
}

function ItemButton({
  icon,
  label,
  quantity,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  quantity: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const unavailable =
    disabled || quantity <= 0;

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onClick}
      className="grid min-w-[105px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-emerald-300/15 bg-[#12344a] p-3 text-left text-white transition hover:-translate-y-0.5 hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
    >
      <span>{icon}</span>

      <strong className="text-[11px]">
        {label}
      </strong>

      <small>×{quantity}</small>
    </button>
  );
}

function ResultScreen({
  winner,
  region,
  redScore,
  blueScore,
  redTime,
  blueTime,
  onRestart,
}: {
  winner: Winner;
  region: Region;
  redScore: number;
  blueScore: number;
  redTime: number;
  blueTime: number;
  onRestart: () => void;
}) {
  return (
    <section className="flex min-h-[680px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-[#102a40] to-[#071827] p-6 text-center shadow-[0_30px_80px_rgba(0,8,20,0.45)]">
      <div className="animate-bounce text-8xl">
        {winner === "red"
          ? "🏆"
          : winner === "blue"
            ? "🛡️"
            : "🤝"}
      </div>

      <p className="mt-5 text-[10px] font-black tracking-[0.18em] text-emerald-300">
        KẾT QUẢ TRẬN ĐẤU
      </p>

      <h2 className="my-3 text-3xl font-black text-white md:text-5xl">
        {winner === "red" &&
          "Đội Đỏ chiến thắng!"}

        {winner === "blue" &&
          "Đội Xanh chiến thắng!"}

        {winner === "draw" &&
          "Hai đội hòa nhau!"}
      </h2>

      <p className="m-0 text-slate-400">
        Trận đấu HSK tại {region.name} đã kết thúc.
      </p>

      <div className="my-8 grid w-full max-w-2xl grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <ResultCard
          name="Đội Đỏ"
          icon="🦅"
          score={redScore}
          time={redTime}
          winner={winner === "red"}
          color="red"
        />

        <span className="text-3xl font-black text-amber-300">
          —
        </span>

        <ResultCard
          name="Đội Xanh"
          icon="🐉"
          score={blueScore}
          time={blueTime}
          winner={winner === "blue"}
          color="blue"
        />
      </div>

      <p className="mb-6 rounded-xl border border-emerald-300/10 bg-emerald-300/5 px-5 py-3 text-sm text-slate-300">
        Câu trả lời sai đã được lưu vào Error Log.
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="min-h-[50px] rounded-xl bg-gradient-to-r from-emerald-300 to-emerald-400 px-7 font-black text-[#062d32] transition hover:-translate-y-0.5"
      >
        Bắt đầu hành trình mới
      </button>
    </section>
  );
}

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
  color: "red" | "blue";
}) {
  return (
    <article
      className={`flex flex-col rounded-3xl border p-6 ${
        winner
          ? "border-amber-300 bg-amber-300/10 shadow-[0_0_35px_rgba(251,191,36,0.15)]"
          : color === "red"
            ? "border-red-300/20 bg-red-300/5"
            : "border-blue-300/20 bg-blue-300/5"
      }`}
    >
      <span className="text-3xl">{icon}</span>

      <strong className="mt-2 text-lg text-white">
        {name}
      </strong>

      <b className="text-5xl font-black text-white">
        {score}
      </b>

      <small className="mt-2 text-slate-400">
        Tổng thời gian đúng: {time} giây
      </small>
    </article>
  );
}

function saveWrongQuestion(
  question: BattleQuestion,
  selectedIndex: number | null,
) {
  if (typeof window === "undefined") return;

  const storageKey = "hsk-error-log";

  try {
    const savedData =
      window.localStorage.getItem(storageKey);

    const parsedData: unknown = savedData
      ? JSON.parse(savedData)
      : [];

    const oldData: ErrorLogItem[] =
      Array.isArray(parsedData)
        ? parsedData
        : [];

    const existingIndex = oldData.findIndex(
      (item) =>
        item.questionId === question.id,
    );

    const oldWrongCount =
      existingIndex >= 0
        ? oldData[existingIndex].wrongCount
        : 0;

    const selectedAnswer =
      selectedIndex === null
        ? "Không trả lời – hết thời gian"
        : question.options[selectedIndex];

    const errorItem: ErrorLogItem = {
      questionId: question.id,
      level: question.level,
      topic: question.topic,
      question: question.question,
      pinyin: question.pinyin,
      selectedAnswer,
      correctAnswer:
        question.options[
          question.correctIndex
        ],
      explanation: question.explanation,
      wrongCount: oldWrongCount + 1,
      reviewed: false,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      oldData[existingIndex] = errorItem;
    } else {
      oldData.push(errorItem);
    }

    oldData.sort(
      (first, second) =>
        second.wrongCount - first.wrongCount,
    );

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(oldData),
    );
  } catch (error) {
    console.error(
      "Không thể lưu câu sai:",
      error,
    );
  }
}