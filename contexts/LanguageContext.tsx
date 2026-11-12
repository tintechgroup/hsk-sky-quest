"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type Language = "vi" | "zh";

const messages = {
  vi: {
    backToMap: "Quay lại bản đồ",
    chooseLanguage: "Chọn ngôn ngữ",
    welcome: "Chào mừng trở lại",
    startJourney: "Bắt đầu hành trình",
    chooseLevel: "Chọn trình độ",
    question: "Câu hỏi",
    score: "Điểm",
    nextQuestion: "Câu tiếp theo",
    showResult: "Xem kết quả",
    tryAgain: "Làm lại",
    history: "Lịch sử",
    profile: "Hồ sơ",
    login: "Đăng nhập",
    register: "Đăng ký",
    logout: "Đăng xuất",

    destination: "ĐIỂM ĐẾN",
    tagline: "HỌC · KHÁM PHÁ · CHINH PHỤC",
    journeyLabel: "HÀNH TRÌNH HỌC TIẾNG TRUNG",
    welcomeHeadline: "Chào mừng bạn đến với",
    welcomeDescription:
      "Bay qua những vùng đất nổi tiếng, khám phá địa lý, văn hóa Trung Quốc và chinh phục kiến thức HSK qua từng thử thách.",

    exploreFeatureTitle: "Khám phá Trung Quốc",
    exploreFeatureDescription:
      "Bay qua các tỉnh và lựa chọn điểm đến.",
    lootFeatureTitle: "Nhảy dù thu thập",
    lootFeatureDescription:
      "Tiếp đất và nhận vật phẩm hỗ trợ.",
    battleFeatureTitle: "Thi đấu HSK",
    battleFeatureDescription:
      "Trả lời câu hỏi và cạnh tranh cùng đội.",

    questionsByRegion: "Câu hỏi theo tỉnh",
    saveGameHistory: "Lưu lịch sử chơi",
    multiplayer: "Thi đấu nhiều người",

    challengeLabel: "CHỌN THỬ THÁCH",
    levelHeading: "Trình độ của bạn",
    levelDescription:
      "Câu hỏi trong trận đấu sẽ tương ứng với cấp độ đã chọn.",

    level3Description: "Nền tảng",
    level4Description: "Trung cấp",
    level5Description: "Nâng cao",
    level6Description: "Thử thách",

    selectedLevel: "Bạn đang chọn",
    canChangeLevel:
      "Có thể thay đổi cấp độ trước khi bắt đầu hành trình.",

    beginJourney: "BẮT ĐẦU HÀNH TRÌNH",
    exploreChina: "KHÁM PHÁ TRUNG QUỐC",
    signInToSave:
      "Bạn cần đăng nhập để lưu tiến độ và lịch sử thi đấu.",
  },

  zh: {
    backToMap: "返回地图",
    chooseLanguage: "选择语言",
    welcome: "欢迎回来",
    startJourney: "开始旅程",
    chooseLevel: "选择等级",
    question: "问题",
    score: "分数",
    nextQuestion: "下一题",
    showResult: "查看结果",
    tryAgain: "再玩一次",
    history: "历史记录",
    profile: "个人资料",
    login: "登录",
    register: "注册",
    logout: "退出登录",

    destination: "目的地",
    tagline: "学习 · 探索 · 挑战",
    journeyLabel: "中文学习之旅",
    welcomeHeadline: "欢迎来到",
    welcomeDescription:
      "飞越中国各地，探索当地地理与文化，并通过挑战逐步掌握 HSK 知识。",

    exploreFeatureTitle: "探索中国",
    exploreFeatureDescription:
      "飞越各个省份，选择你的目的地。",
    lootFeatureTitle: "跳伞收集",
    lootFeatureDescription:
      "安全着陆并获得辅助道具。",
    battleFeatureTitle: "HSK 对战",
    battleFeatureDescription:
      "回答问题，与其他队伍一较高下。",

    questionsByRegion: "各省专属问题",
    saveGameHistory: "保存游戏记录",
    multiplayer: "多人对战",

    challengeLabel: "选择挑战",
    levelHeading: "选择你的等级",
    levelDescription:
      "比赛中的问题将根据你选择的等级进行匹配。",

    level3Description: "基础",
    level4Description: "中级",
    level5Description: "高级",
    level6Description: "挑战",

    selectedLevel: "当前选择",
    canChangeLevel: "开始旅程前可以更改等级。",

    beginJourney: "开始旅程",
    exploreChina: "探索中国",
    signInToSave: "登录后即可保存进度和比赛记录。",
  },
} as const;

export type TranslationKey = keyof typeof messages.vi;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "hsk-language";
const LANGUAGE_CHANGE_EVENT = "hsk-language-change";

function getLanguageSnapshot(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "zh"
      ? "zh"
      : "vi";
  } catch {
    return "vi";
  }
}

function getServerLanguageSnapshot(): Language {
  return "vi";
}

function subscribeToLanguage(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

function saveLanguage(language: Language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ứng dụng vẫn hoạt động nếu trình duyệt chặn localStorage.
  }

  window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang =
      language === "zh" ? "zh-CN" : "vi";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    saveLanguage(nextLanguage);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => messages[language][key],
    }),
    [language, setLanguage],
  );

  const isAdminPage =
    pathname?.startsWith("/admin") ?? false;

  return (
    <LanguageContext.Provider value={value}>
      {children}

      {!isAdminPage && (
        <div
          className="fixed bottom-4 right-4 z-[120] flex rounded-full border border-white/25 bg-slate-950/90 p-1 text-xs font-black shadow-xl backdrop-blur-md"
          aria-label={messages[language].chooseLanguage}
        >
          <button
            type="button"
            onClick={() => setLanguage("vi")}
            aria-pressed={language === "vi"}
            className={`rounded-full px-3 py-2 transition ${
              language === "vi"
                ? "bg-emerald-300 text-slate-950"
                : "text-white/75 hover:text-white"
            }`}
          >
            VI
          </button>

          <button
            type="button"
            onClick={() => setLanguage("zh")}
            aria-pressed={language === "zh"}
            className={`rounded-full px-3 py-2 transition ${
              language === "zh"
                ? "bg-emerald-300 text-slate-950"
                : "text-white/75 hover:text-white"
            }`}
          >
            中文
          </button>
        </div>
      )}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage phải được dùng bên trong LanguageProvider.",
    );
  }

  return context;
}