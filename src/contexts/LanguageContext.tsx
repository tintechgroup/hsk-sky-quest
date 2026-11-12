"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type Language = "vi" | "zh";

const translations = {
  vi: {
    destination: "Trung Quốc",
    destinationName: "Trung Quốc",
    tagline: "Học tiếng Trung qua hành trình",
    journeyLabel: "HÀNH TRÌNH KHÁM PHÁ",
    welcomeHeadline: "Sẵn sàng cho hành trình khám phá Trung Quốc?",
    welcomeDescription:
      "Bay qua các tỉnh thành, trả lời câu hỏi HSK và chinh phục thử thách tiếng Trung.",
    exploreFeatureTitle: "Khám phá Trung Quốc",
    exploreFeatureDescription:
      "Tìm hiểu các tỉnh thành và khám phá những câu chuyện thú vị.",
    lootFeatureTitle: "Thu thập vật phẩm",
    lootFeatureDescription:
      "Tìm vật phẩm hỗ trợ trước khi bước vào trận đấu.",
    battleFeatureTitle: "Thử thách kiến thức",
    battleFeatureDescription:
      "Trả lời câu hỏi HSK và thi đấu cùng người chơi khác.",
    questionsByRegion: "Câu hỏi theo khu vực",
    saveGameHistory: "Lưu lịch sử chơi",
    multiplayer: "Nhiều người chơi",
    challengeLabel: "THỬ THÁCH",
    levelHeading: "Chọn trình độ HSK",
    levelDescription: "Chọn cấp độ phù hợp với trình độ tiếng Trung của bạn.",
    level3Description: "Từ vựng và câu giao tiếp cơ bản.",
    level4Description: "Mở rộng vốn từ và cấu trúc câu.",
    level5Description: "Thử thách với nội dung nâng cao hơn.",
    level6Description: "Dành cho người học đã vững tiếng Trung.",
    selectedLevel: "Đang chọn",
    canChangeLevel: "Bạn có thể đổi cấp độ trước khi bắt đầu.",
    beginJourney: "Bắt đầu hành trình",
    exploreChina: "Khám phá Trung Quốc",
    signInToSave: "Đăng nhập để lưu tiến trình",
    languageName: "Tiếng Việt",
    switchLanguage: "切换到中文",
  },
  zh: {
    destination: "中国",
    destinationName: "中国",
    tagline: "在旅途中学习中文",
    journeyLabel: "中国探索之旅",
    welcomeHeadline: "准备好开启中国探索之旅了吗？",
    welcomeDescription:
      "飞越各个省份，回答 HSK 问题，挑战你的中文知识。",
    exploreFeatureTitle: "探索中国",
    exploreFeatureDescription: "了解各个省份，发现有趣的故事。",
    lootFeatureTitle: "收集道具",
    lootFeatureDescription: "在比赛开始前寻找辅助道具。",
    battleFeatureTitle: "知识挑战",
    battleFeatureDescription: "回答 HSK 问题，与其他玩家进行比赛。",
    questionsByRegion: "各地区题目",
    saveGameHistory: "保存游戏记录",
    multiplayer: "多人游戏",
    challengeLabel: "挑战",
    levelHeading: "选择 HSK 等级",
    levelDescription: "请选择适合自己中文水平的等级。",
    level3Description: "基础词汇和日常交流。",
    level4Description: "扩展词汇量并学习更多句型。",
    level5Description: "挑战更高级的中文内容。",
    level6Description: "适合中文基础扎实的学习者。",
    selectedLevel: "当前选择",
    canChangeLevel: "开始前可以更改等级。",
    beginJourney: "开始旅程",
    exploreChina: "探索中国",
    signInToSave: "登录以保存进度",
    languageName: "中文",
    switchLanguage: "切换到越南语",
  },
} as const;

export type TranslationKey = keyof typeof translations.vi;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "hsk-language";
const LANGUAGE_CHANGE_EVENT = "hsk-language-change";

function getLanguageSnapshot(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "vi";
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
    // Vẫn cập nhật ngôn ngữ trong trang nếu localStorage bị chặn.
  }

  window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "vi";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    saveLanguage(nextLanguage);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key],
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
      <LanguageSwitcher />
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage phải được sử dụng bên trong LanguageProvider.");
  }

  return context;
}

function LanguageSwitcher() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();

  const isAdminPage =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/tintech-admin");

  if (isAdminPage) {
    return null;
  }

  const nextLanguage: Language = language === "vi" ? "zh" : "vi";
  const buttonLabel =
    language === "vi" ? "🇻🇳 VI · 中文" : "🇨🇳 中文 · VI";
  const switchLabel =
    language === "vi" ? "Chuyển sang tiếng Trung" : "切换到越南语";

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={switchLabel}
      title={switchLabel}
      className="fixed bottom-5 right-5 z-[200] inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 px-4 text-sm font-bold text-white shadow-xl backdrop-blur-md transition hover:border-emerald-300/50 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
    >
      {buttonLabel}
    </button>
  );
}