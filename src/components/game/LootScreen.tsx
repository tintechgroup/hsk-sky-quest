"use client";

import { useMemo, useState } from "react";
import { BattleQuestionsProvider } from "@/contexts/BattleQuestionsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import MatchmakingScreen from "@/components/game/MatchmakingScreen";
import TeamBattleScreen from "@/components/game/TeamBattleScreen";
import type {
  ClientMatchMode,
  MatchmakingMatch,
  MatchmakingQuestion,
} from "@/components/game/MatchmakingScreen";
import type { HSKLevel, Inventory } from "@/types/game";
import type { GameQuestion } from "@/types/question";
import type { Region } from "@/types/region";

interface LootScreenProps {
  region: Region;
  level: HSKLevel;
  onRestart: () => void;
}

type LootPhase = "loot" | "matchmaking" | "intro" | "battle";
type InventoryKey = keyof Inventory;

interface LootItem {
  id: InventoryKey;
  icon: string;
  color: string;
}

interface MatchModeOption {
  id: ClientMatchMode;
  icon: string;
  color: string;
}

const MAX_LOOT_ITEMS = 3;

const EMPTY_INVENTORY: Inventory = {
  "fifty-fifty": 0,
  hint: 0,
  pinyin: 0,
  "extra-time": 0,
  retry: 0,
};

const LOOT_ITEMS: LootItem[] = [
  {
    id: "fifty-fifty",
    icon: "✂️",
    color: "border-red-300/20 bg-red-300/10 text-red-100",
  },
  {
    id: "hint",
    icon: "💡",
    color: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  },
  {
    id: "pinyin",
    icon: "🔎",
    color: "border-blue-300/20 bg-blue-300/10 text-blue-100",
  },
  {
    id: "extra-time",
    icon: "⏱️",
    color: "border-purple-300/20 bg-purple-300/10 text-purple-100",
  },
  {
    id: "retry",
    icon: "🔄",
    color: "border-orange-300/20 bg-orange-300/10 text-orange-100",
  },
];

const MATCH_MODES: MatchModeOption[] = [
  {
    id: "1v1",
    icon: "⚔️",
    color: "border-red-300/30 bg-red-300/10",
  },
  {
    id: "3v3",
    icon: "🛡️",
    color: "border-blue-300/30 bg-blue-300/10",
  },
  {
    id: "5v5",
    icon: "🏆",
    color: "border-amber-300/30 bg-amber-300/10",
  },
  {
    id: "bot",
    icon: "🤖",
    color: "border-purple-300/30 bg-purple-300/10",
  },
];

const lootText = {
  vi: {
    "fifty-fifty": {
      name: "Dao loại trừ",
      shortName: "50/50",
      description: "Loại bỏ hai đáp án không chính xác trong một câu hỏi.",
    },
    hint: {
      name: "Đèn gợi ý",
      shortName: "Gợi ý",
      description: "Hiển thị một gợi ý giúp bạn tìm ra đáp án phù hợp.",
    },
    pinyin: {
      name: "Kính phiên âm",
      shortName: "Pinyin",
      description: "Hiển thị phiên âm Pinyin của câu hỏi tiếng Trung.",
    },
    "extra-time": {
      name: "Đồng hồ thời gian",
      shortName: "+10 giây",
      description: "Cộng thêm 10 giây vào thời gian trả lời câu hỏi.",
    },
    retry: {
      name: "Thẻ hồi đáp",
      shortName: "Trả lời lại",
      description: "Cho phép trả lời lại một lần khi lựa chọn chưa chính xác.",
    },
  },
  zh: {
    "fifty-fifty": {
      name: "排除卡",
      shortName: "50/50",
      description: "在一道题中排除两个错误选项。",
    },
    hint: {
      name: "提示灯",
      shortName: "提示",
      description: "显示一条提示，帮助你找到合适的答案。",
    },
    pinyin: {
      name: "拼音镜",
      shortName: "拼音",
      description: "显示中文题目的拼音。",
    },
    "extra-time": {
      name: "计时器",
      shortName: "+10 秒",
      description: "答题时间增加 10 秒。",
    },
    retry: {
      name: "重答卡",
      shortName: "重新作答",
      description: "选错时可以重新回答一次。",
    },
  },
} as const;

const modeText = {
  vi: {
    "1v1": {
      name: "Đấu 1 đối 1",
      teamLabel: "1 người mỗi đội",
      description:
        "Đấu trực tiếp với một người chơi khác. Nếu chưa có người, máy sẽ tham gia sau 15 giây.",
      waitingText: "Tối đa 2 người",
    },
    "3v3": {
      name: "Đấu đội 3 đối 3",
      teamLabel: "3 người mỗi đội",
      description:
        "Hai đội gồm tối đa ba thành viên. Máy sẽ lấp những vị trí còn thiếu.",
      waitingText: "Tối đa 6 người",
    },
    "5v5": {
      name: "Đại chiến 5 đối 5",
      teamLabel: "5 người mỗi đội",
      description: "Trận đấu lớn dành cho tối đa mười người chơi và người máy.",
      waitingText: "Tối đa 10 người",
    },
    bot: {
      name: "Đấu với máy",
      teamLabel: "Bạn đấu với bot",
      description:
        "Không cần chờ ghép người. Hệ thống tạo đối thủ máy và bắt đầu ngay.",
      waitingText: "Bắt đầu ngay",
    },
  },
  zh: {
    "1v1": {
      name: "一对一对战",
      teamLabel: "每队 1 人",
      description: "与另一位玩家直接对战。若暂时没有玩家，15 秒后由电脑加入。",
      waitingText: "最多 2 人",
    },
    "3v3": {
      name: "三对三团队赛",
      teamLabel: "每队 3 人",
      description: "两队各最多三名成员，电脑会补上空缺位置。",
      waitingText: "最多 6 人",
    },
    "5v5": {
      name: "五对五大战",
      teamLabel: "每队 5 人",
      description: "最多十名玩家和电脑参与的大型比赛。",
      waitingText: "最多 10 人",
    },
    bot: {
      name: "人机对战",
      teamLabel: "你对战电脑",
      description: "无需等待匹配，系统会创建电脑对手并立即开始。",
      waitingText: "立即开始",
    },
  },
} as const;

const pageText = {
  vi: {
    landed: "Tiếp đất thành công",
    prepareAt: "Chuẩn bị trận đấu tại",
    backToMap: "← Quay lại bản đồ",
    prepareItems: "Chuẩn bị vật phẩm",
    prepareDescription: "Chọn tối đa 3 vật phẩm hỗ trợ trước khi tìm trận.",
    selected: "Đã chọn",
    cannotContinue: "Chưa thể tiếp tục:",
    step1: "BƯỚC 1",
    chooseItems: "Chọn vật phẩm hỗ trợ",
    bagFull: "Túi đã đầy",
    remove: "Bỏ khỏi túi",
    collect: "Nhặt vật phẩm",
    step2: "BƯỚC 2",
    chooseMode: "Chọn chế độ thi đấu",
    modeDescription:
      "Các chế độ PvP sẽ chờ người thật trong 15 giây. Nếu chưa đủ, máy tự động tham gia vào những vị trí còn trống.",
    preparationComplete: "Chuẩn bị hoàn tất",
    noItems: "Chưa chọn vật phẩm",
    startBot: "🤖 Bắt đầu đấu máy",
    findMatch: "⚔️ Tìm trận đấu",
    tooManyItems: "Bạn chỉ được mang tối đa 3 vật phẩm vào trận.",
    chooseAtLeastOne: "Hãy chọn ít nhất một vật phẩm trước khi tìm trận.",
    chooseModeError: "Hãy chọn chế độ thi đấu.",
    insufficientQuestions:
      "Trận đấu chưa tải đủ ba câu hỏi. Hãy kiểm tra câu hỏi theo tỉnh và trình độ trong MongoDB.",
    knowledge: "Kiến thức tổng hợp",
    fallbackQuestion: "Hãy đọc kỹ câu hỏi và loại trừ các đáp án không phù hợp.",
    fallbackExplanation: "Hãy xem lại đáp án chính xác của câu hỏi.",
    introRegion: "HỒ BẮC · VŨ HÁN · HỘ BỘ HẠNG",
    welcomeGame: "CHÀO MỪNG ĐẾN VỚI TRÒ CHƠI",
    introTitle: "CHÀO MỪNG ĐẾN VỚI SẠP TÔM HÙM ĐẤT HỘ BỘ HẠNG!",
    introDescription:
      "Bạn sẽ điều hành một sạp tôm hùm đất tại Hộ Bộ Hạng, thành phố Vũ Hán, tỉnh Hồ Bắc. Con phố luôn nhộn nhịp, khách ghé ăn không ngớt và sẵn sàng thử thách kiến thức của bạn về văn hóa, lịch sử, giáo dục, kinh tế và địa lý Hồ Bắc.",
    correct: "Trả lời đúng",
    correctDescription: "Bán được 1 phần tôm, thu về 10 nhân dân tệ.",
    incorrect: "Trả lời sai",
    incorrectDescription: "Khách rời đi, bạn bỏ lỡ lượt bán hàng đó.",
    ready: "Bạn đã sẵn sàng mở hàng chưa? 🔥 Kéo tạp dề lên, đón vị khách đầu tiên nào!",
    openShop: "MỞ SẠP · BẮT ĐẦU THỬ THÁCH →",
    gameIntro: "Mở sạp tại Hộ Bộ Hạng",
  },
  zh: {
    landed: "成功着陆",
    prepareAt: "准备在此开始比赛：",
    backToMap: "← 返回地图",
    prepareItems: "准备道具",
    prepareDescription: "开始匹配前最多选择 3 件辅助道具。",
    selected: "已选择",
    cannotContinue: "暂时无法继续：",
    step1: "第一步",
    chooseItems: "选择辅助道具",
    bagFull: "背包已满",
    remove: "从背包移除",
    collect: "拾取道具",
    step2: "第二步",
    chooseMode: "选择比赛模式",
    modeDescription:
      "玩家对战模式会等待真实玩家 15 秒。人数不足时，电脑会自动补上空缺位置。",
    preparationComplete: "准备完成",
    noItems: "尚未选择道具",
    startBot: "🤖 开始人机对战",
    findMatch: "⚔️ 开始匹配",
    tooManyItems: "每场比赛最多携带 3 件道具。",
    chooseAtLeastOne: "匹配前请至少选择一件道具。",
    chooseModeError: "请选择比赛模式。",
    insufficientQuestions:
      "比赛题目不足三道。请检查 MongoDB 中对应省份和等级的题目。",
    knowledge: "综合知识",
    fallbackQuestion: "请仔细阅读题目，并排除不合适的选项。",
    fallbackExplanation: "请查看本题的正确答案。",
    introRegion: "湖北 · 武汉 · 户部巷",
    welcomeGame: "欢迎来到游戏",
    introTitle: "欢迎来到户部巷小龙虾摊！",
    introDescription:
      "你将在湖北省武汉市户部巷经营一家小龙虾摊。这里街巷热闹，食客络绎不绝；他们会用湖北的文化、历史、教育、经济与地理知识向你发起挑战。准备好接招了吗？",
    correct: "回答正确",
    correctDescription: "卖出一份小龙虾，收入 10 元。",
    incorrect: "回答错误",
    incorrectDescription: "顾客离开，你错过了这笔生意。",
    ready: "准备好开张了吗？🔥 系好围裙，迎接第一位顾客！",
    openShop: "开始营业 · 开始挑战 →",
    gameIntro: "在户部巷开店",
  },
} as const;

function normalizeMatchQuestions(
  questions: MatchmakingQuestion[],
  fallbackLevel: HSKLevel,
  regionId: string,
  language: "vi" | "zh",
): GameQuestion[] {
  const text = pageText[language];

  return questions
    .filter((question) => {
      return (
        Boolean(question.id) &&
        Boolean(question.question?.trim()) &&
        Array.isArray(question.options) &&
        question.options.length >= 2 &&
        Number.isInteger(question.correctIndex)
      );
    })
    .map((question) => ({
      id: question.id,
      regionId,
      level: [3, 4, 5, 6].includes(Number(question.level))
        ? (Number(question.level) as HSKLevel)
        : fallbackLevel,
      topic: question.topic?.trim() || text.knowledge,
      question: question.question?.trim() || "",
      pinyin: question.pinyin?.trim() || "",
      options: question.options ?? [],
      correctIndex: Number(question.correctIndex),
      hint: question.hint?.trim() || text.fallbackQuestion,
      explanation: question.explanation?.trim() || text.fallbackExplanation,
    }));
}

export default function LootScreen({
  region,
  level,
  onRestart,
}: LootScreenProps) {
  const { language } = useLanguage();
  const lang: "vi" | "zh" = language === "zh" ? "zh" : "vi";
  const text = pageText[lang];
  const localizedRegionName =
    lang === "zh"
      ? region.chineseName || region.name
      : region.name;

  const [phase, setPhase] = useState<LootPhase>("loot");
  const [inventory, setInventory] = useState<Inventory>({
    ...EMPTY_INVENTORY,
  });
  const [selectedItems, setSelectedItems] = useState<InventoryKey[]>([]);
  const [selectedMode, setSelectedMode] =
    useState<ClientMatchMode>("1v1");
  const [match, setMatch] = useState<MatchmakingMatch | null>(null);
  const [battleQuestions, setBattleQuestions] = useState<GameQuestion[]>([]);
  const [error, setError] = useState("");

  const selectedCount = selectedItems.length;
  const canStartMatchmaking =
    selectedCount > 0 && Boolean(selectedMode);

  const selectedModeInformation =
    MATCH_MODES.find((mode) => mode.id === selectedMode) ?? MATCH_MODES[0];

  const inventorySummary = useMemo(() => {
    return LOOT_ITEMS.filter((item) => inventory[item.id] > 0);
  }, [inventory]);

  function collectItem(item: LootItem) {
    if (selectedItems.includes(item.id)) {
      return;
    }

    if (selectedItems.length >= MAX_LOOT_ITEMS) {
      setError(text.tooManyItems);
      return;
    }

    setError("");
    setSelectedItems((previous) => [...previous, item.id]);
    setInventory((previous) => ({
      ...previous,
      [item.id]: previous[item.id] + 1,
    }));
  }

  function removeItem(item: LootItem) {
    if (!selectedItems.includes(item.id)) {
      return;
    }

    setError("");
    setSelectedItems((previous) =>
      previous.filter((itemId) => itemId !== item.id),
    );
    setInventory((previous) => ({
      ...previous,
      [item.id]: Math.max(0, previous[item.id] - 1),
    }));
  }

  function selectMode(mode: ClientMatchMode) {
    setSelectedMode(mode);
    setError("");
  }

  function startMatchmaking() {
    if (selectedCount === 0) {
      setError(text.chooseAtLeastOne);
      return;
    }

    if (!selectedMode) {
      setError(text.chooseModeError);
      return;
    }

    setError("");
    setPhase("matchmaking");
  }

  function handleMatchReady(readyMatch: MatchmakingMatch) {
    const normalizedQuestions = normalizeMatchQuestions(
      readyMatch.questions,
      level,
      region.id,
      lang,
    );

    if (normalizedQuestions.length < 3) {
      setError(text.insufficientQuestions);
      setPhase("loot");
      return;
    }

    setMatch(readyMatch);
    setBattleQuestions(normalizedQuestions.slice(0, 3));
    setPhase("intro");
  }

  function cancelMatchmaking() {
    setPhase("loot");
    setMatch(null);
    setBattleQuestions([]);
    setError("");
  }

  if (phase === "matchmaking") {
    return (
      <MatchmakingScreen
        region={region}
        level={level}
        mode={selectedMode}
        onMatchReady={handleMatchReady}
        onCancel={cancelMatchmaking}
      />
    );
  }

  if (phase === "intro" && match && battleQuestions.length > 0) {
    return (
      <main
        lang={lang === "zh" ? "zh-CN" : "vi"}
        className="relative isolate grid min-h-[calc(100svh-2rem)] place-items-center overflow-hidden rounded-[28px] border border-amber-100/20 bg-[#27170f] p-4 text-white shadow-2xl sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_15%,rgba(251,146,60,.55),transparent_34%),radial-gradient(ellipse_at_82%_18%,rgba(239,68,68,.35),transparent_32%),radial-gradient(ellipse_at_50%_100%,rgba(120,53,15,.78),transparent_55%),linear-gradient(145deg,#3b2114,#101b26_72%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-[linear-gradient(180deg,rgba(15,23,42,.2),transparent)]" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 flex items-end justify-around overflow-hidden text-5xl opacity-50 sm:text-7xl"
        >
          <span>🏮</span>
          <span>🍜</span>
          <span>🦞</span>
          <span>🥢</span>
          <span>🏮</span>
        </div>

        <section className="w-full max-w-3xl rounded-[28px] border border-white/25 bg-slate-950/45 p-5 shadow-[0_30px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl sm:p-9">
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className="rounded-full border border-amber-100/25 bg-amber-100/10 px-3 py-1.5 text-[10px] font-black tracking-[.15em] text-amber-100 sm:text-xs">
              {text.introRegion}
            </span>
            <span className="rounded-full border border-white/20 bg-black/25 px-3 py-2 text-xs font-bold">
              HSK {level}
            </span>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl border border-amber-100/25 bg-amber-200/10 text-5xl shadow-[0_0_50px_rgba(251,191,36,.18)]">
              🦞
            </div>

            <p className="text-xs font-black tracking-[.22em] text-amber-200">
              {text.welcomeGame}
            </p>

            <h1 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight sm:text-4xl">
              {text.introTitle}
            </h1>

            <p className="mt-5 text-sm leading-7 text-white/85 sm:text-base sm:leading-8">
              {text.introDescription}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-4">
              <div className="text-2xl">✅</div>
              <strong className="mt-2 block text-sm text-emerald-100">
                {text.correct}
              </strong>
              <p className="mt-1 text-sm leading-6 text-white/75">
                {text.correctDescription}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200/20 bg-rose-300/10 p-4">
              <div className="text-2xl">🚶</div>
              <strong className="mt-2 block text-sm text-rose-100">
                {text.incorrect}
              </strong>
              <p className="mt-1 text-sm leading-6 text-white/75">
                {text.incorrectDescription}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-100/20 bg-amber-200/10 p-4 text-center">
            <p className="text-sm font-bold leading-6 text-amber-50 sm:text-base">
              {text.ready}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPhase("battle")}
            className="mt-6 min-h-14 w-full rounded-2xl bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 px-5 font-black text-[#321b0c] shadow-[0_14px_35px_rgba(251,146,60,.25)] transition hover:-translate-y-0.5"
          >
            {text.openShop}
          </button>
        </section>
      </main>
    );
  }

  if (phase === "battle" && match && battleQuestions.length > 0) {
    return (
      <BattleQuestionsProvider questions={battleQuestions}>
        <TeamBattleScreen
          key={match.id}
          level={level}
          region={region}
          match={match}
          initialInventory={inventory}
          language={lang}
          onRestart={onRestart}
        />
      </BattleQuestionsProvider>
    );
  }

  return (
    <section
      lang={lang === "zh" ? "zh-CN" : "vi"}
      className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-[#102f46] via-[#0b2235] to-[#061522] shadow-[0_30px_80px_rgba(0,8,20,0.5)] sm:rounded-[30px]"
    >
      <header className="border-b border-white/10 bg-[#061a29]/70 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
              {text.landed}
            </span>

            <h1 className="mt-3 break-words text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
              {text.prepareAt}{" "}
              <span className="text-amber-300">{localizedRegionName}</span>
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              <span lang="zh-CN">{region.chineseName}</span>
              {region.pinyin ? ` · ${region.pinyin}` : ""}
              {" · "}HSK {level}
            </p>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="min-h-11 shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/10"
          >
            {text.backToMap}
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5">
          <span className="grid size-12 place-items-center rounded-xl bg-amber-300/15 text-2xl">
            🎒
          </span>

          <div>
            <strong className="block text-amber-100">
              {text.prepareItems}
            </strong>
            <p className="mt-1 text-sm leading-relaxed text-amber-100/70">
              {text.prepareDescription}
            </p>
          </div>

          <div className="rounded-xl bg-black/10 px-4 py-3 text-center">
            <strong className="block text-2xl font-black text-amber-300">
              {selectedCount}/{MAX_LOOT_ITEMS}
            </strong>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100/60">
              {text.selected}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm leading-relaxed text-red-100"
          >
            <strong>{text.cannotContinue}</strong> {error}
          </div>
        )}

        {/* Danh sách vật phẩm */}
        <div className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                {text.step1}
              </span>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                {text.chooseItems}
              </h2>
            </div>

            {selectedCount >= MAX_LOOT_ITEMS && (
              <span className="rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                {text.bagFull}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {LOOT_ITEMS.map((item) => {
              const selected = selectedItems.includes(item.id);
              const bagFull = selectedCount >= MAX_LOOT_ITEMS && !selected;
              const itemText = lootText[lang][item.id];

              return (
                <article
                  key={item.id}
                  className={`relative flex min-h-[225px] flex-col overflow-hidden rounded-2xl border p-4 transition sm:p-5 ${
                    selected
                      ? `${item.color} -translate-y-1 shadow-xl`
                      : bagFull
                        ? "border-white/5 bg-white/[0.02] opacity-40"
                        : "border-white/10 bg-white/[0.04] hover:-translate-y-1 hover:border-emerald-300/30"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-emerald-300 text-sm font-black text-[#062d32]">
                      ✓
                    </span>
                  )}

                  <span className="grid size-14 place-items-center rounded-2xl bg-black/10 text-3xl">
                    {item.icon}
                  </span>

                  <span className="mt-4 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    {itemText.shortName}
                  </span>

                  <h3 className="mt-1 text-lg font-black text-white">
                    {itemText.name}
                  </h3>

                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                    {itemText.description}
                  </p>

                  {selected ? (
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="mt-4 min-h-11 rounded-xl border border-white/15 bg-black/10 px-4 text-sm font-black text-white transition hover:bg-red-400/10 hover:text-red-200"
                    >
                      {text.remove}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={bagFull}
                      onClick={() => collectItem(item)}
                      className="mt-4 min-h-11 rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#062d32] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {text.collect}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        {/* Chọn chế độ */}
        <section className="mt-8">
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
              {text.step2}
            </span>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {text.chooseMode}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {text.modeDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {MATCH_MODES.map((mode) => {
              const selected = selectedMode === mode.id;
              const details = modeText[lang][mode.id];

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => selectMode(mode.id)}
                  className={`relative min-h-[210px] rounded-2xl border p-5 text-left transition ${
                    selected
                      ? `${mode.color} -translate-y-1 shadow-xl ring-2 ring-emerald-300/40`
                      : "border-white/10 bg-white/[0.04] hover:-translate-y-1 hover:border-emerald-300/30"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-emerald-300 font-black text-[#062d32]">
                      ✓
                    </span>
                  )}

                  <span className="text-4xl">{mode.icon}</span>

                  <h3 className="mt-4 text-lg font-black text-white">
                    {details.name}
                  </h3>

                  <span className="mt-1 block text-xs font-bold text-emerald-300">
                    {details.teamLabel}
                  </span>

                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {details.description}
                  </p>

                  <span className="mt-4 inline-flex rounded-full bg-black/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300">
                    {details.waitingText}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tổng kết lựa chọn */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#061a29]/60 p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {text.preparationComplete}
              </span>

              <div className="mt-3 flex flex-wrap gap-2">
                {inventorySummary.length > 0 ? (
                  inventorySummary.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200"
                    >
                      <span>{item.icon}</span>
                      {lootText[lang][item.id].shortName}
                      <small className="text-amber-300">
                        ×{inventory[item.id]}
                      </small>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">{text.noItems}</span>
                )}
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2">
                <span>{selectedModeInformation.icon}</span>
                <strong className="text-sm text-emerald-100">
                  {modeText[lang][selectedModeInformation.id].name}
                </strong>
                <span className="text-xs text-emerald-200/60">
                  · {modeText[lang][selectedModeInformation.id].teamLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canStartMatchmaking}
              onClick={startMatchmaking}
              className="min-h-14 w-full shrink-0 rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-8 text-base font-black text-[#382207] shadow-lg shadow-orange-500/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
            >
              {selectedMode === "bot" ? text.startBot : text.findMatch}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}