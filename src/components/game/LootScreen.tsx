"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  BattleQuestionsProvider,
} from "@/contexts/BattleQuestionsContext";

import MatchmakingScreen from "@/components/game/MatchmakingScreen";
import TeamBattleScreen from "@/components/game/TeamBattleScreen";

import type {
  ClientMatchMode,
  MatchmakingMatch,
  MatchmakingQuestion,
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

interface LootScreenProps {
  region: Region;
  level: HSKLevel;
  onRestart: () => void;
}

type LootPhase =
  | "loot"
  | "matchmaking"
  | "battle";

type InventoryKey =
  keyof Inventory;

interface LootItem {
  id: InventoryKey;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  color: string;
}

interface MatchModeOption {
  id: ClientMatchMode;
  name: string;
  icon: string;
  teamLabel: string;
  description: string;
  waitingText: string;
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
    name: "Dao loại trừ",
    shortName: "50/50",
    icon: "✂️",
    description:
      "Loại bỏ hai đáp án không chính xác trong một câu hỏi.",
    color:
      "border-red-300/20 bg-red-300/10 text-red-100",
  },
  {
    id: "hint",
    name: "Đèn gợi ý",
    shortName: "Gợi ý",
    icon: "💡",
    description:
      "Hiển thị một gợi ý giúp bạn tìm ra đáp án phù hợp.",
    color:
      "border-amber-300/20 bg-amber-300/10 text-amber-100",
  },
  {
    id: "pinyin",
    name: "Kính phiên âm",
    shortName: "Pinyin",
    icon: "🔎",
    description:
      "Hiển thị phiên âm Pinyin của câu hỏi tiếng Trung.",
    color:
      "border-blue-300/20 bg-blue-300/10 text-blue-100",
  },
  {
    id: "extra-time",
    name: "Đồng hồ thời gian",
    shortName: "+10 giây",
    icon: "⏱️",
    description:
      "Cộng thêm 10 giây vào thời gian trả lời câu hỏi.",
    color:
      "border-purple-300/20 bg-purple-300/10 text-purple-100",
  },
  {
    id: "retry",
    name: "Thẻ hồi đáp",
    shortName: "Trả lời lại",
    icon: "🔄",
    description:
      "Cho phép trả lời lại một lần khi lựa chọn chưa chính xác.",
    color:
      "border-orange-300/20 bg-orange-300/10 text-orange-100",
  },
];

const MATCH_MODES: MatchModeOption[] = [
  {
    id: "1v1",
    name: "Đấu 1 đối 1",
    icon: "⚔️",
    teamLabel: "1 người mỗi đội",
    description:
      "Đấu trực tiếp với một người chơi khác. Nếu chưa có người, máy sẽ tham gia sau 15 giây.",
    waitingText:
      "Tối đa 2 người",
    color:
      "border-red-300/30 bg-red-300/10",
  },
  {
    id: "3v3",
    name: "Đấu đội 3 đối 3",
    icon: "🛡️",
    teamLabel: "3 người mỗi đội",
    description:
      "Hai đội gồm tối đa ba thành viên. Máy sẽ lấp những vị trí còn thiếu.",
    waitingText:
      "Tối đa 6 người",
    color:
      "border-blue-300/30 bg-blue-300/10",
  },
  {
    id: "5v5",
    name: "Đại chiến 5 đối 5",
    icon: "🏆",
    teamLabel: "5 người mỗi đội",
    description:
      "Trận đấu lớn dành cho tối đa mười người chơi và người máy.",
    waitingText:
      "Tối đa 10 người",
    color:
      "border-amber-300/30 bg-amber-300/10",
  },
  {
    id: "bot",
    name: "Đấu với máy",
    icon: "🤖",
    teamLabel: "Bạn đấu với bot",
    description:
      "Không cần chờ ghép người. Hệ thống tạo đối thủ máy và bắt đầu ngay.",
    waitingText:
      "Bắt đầu ngay",
    color:
      "border-purple-300/30 bg-purple-300/10",
  },
];

function normalizeMatchQuestions(
  questions: MatchmakingQuestion[],
  fallbackLevel: HSKLevel,
  regionId: string,
): GameQuestion[] {
  return questions
    .filter((question) => {
      return (
        Boolean(question.id) &&
        Boolean(
          question.question?.trim(),
        ) &&
        Array.isArray(
          question.options,
        ) &&
        question.options.length >= 2 &&
        Number.isInteger(
          question.correctIndex,
        )
      );
    })
    .map((question) => ({
      id: question.id,
      regionId,

      level:
        [3, 4, 5, 6].includes(
          Number(question.level),
        )
          ? (Number(
              question.level,
            ) as HSKLevel)
          : fallbackLevel,

      topic:
        question.topic?.trim() ||
        "Kiến thức tổng hợp",

      question:
        question.question?.trim() ||
        "",

      pinyin:
        question.pinyin?.trim() ||
        "",

      options:
        question.options ?? [],

      correctIndex:
        Number(
          question.correctIndex,
        ),

      hint:
        question.hint?.trim() ||
        "Hãy đọc kỹ câu hỏi và loại trừ các đáp án không phù hợp.",

      explanation:
        question.explanation?.trim() ||
        "Hãy xem lại đáp án chính xác của câu hỏi.",
    }));
}

export default function LootScreen({
  region,
  level,
  onRestart,
}: LootScreenProps) {
  const [phase, setPhase] =
    useState<LootPhase>("loot");

  const [inventory, setInventory] =
    useState<Inventory>({
      ...EMPTY_INVENTORY,
    });

  const [selectedItems, setSelectedItems] =
    useState<InventoryKey[]>([]);

  const [
    selectedMode,
    setSelectedMode,
  ] = useState<ClientMatchMode>("1v1");

  const [match, setMatch] =
    useState<MatchmakingMatch | null>(
      null,
    );

  const [
    battleQuestions,
    setBattleQuestions,
  ] = useState<GameQuestion[]>([]);

  const [error, setError] =
    useState("");

  const selectedCount =
    selectedItems.length;

  const canStartMatchmaking =
    selectedCount > 0 &&
    Boolean(selectedMode);

  const selectedModeInformation =
    MATCH_MODES.find(
      (mode) =>
        mode.id === selectedMode,
    ) ?? MATCH_MODES[0];

  const inventorySummary = useMemo(() => {
    return LOOT_ITEMS.filter(
      (item) =>
        inventory[item.id] > 0,
    );
  }, [inventory]);

  function collectItem(
    item: LootItem,
  ) {
    if (
      selectedItems.includes(item.id)
    ) {
      return;
    }

    if (
      selectedItems.length >=
      MAX_LOOT_ITEMS
    ) {
      setError(
        `Bạn chỉ được mang tối đa ${MAX_LOOT_ITEMS} vật phẩm vào trận.`,
      );

      return;
    }

    setError("");

    setSelectedItems((previous) => [
      ...previous,
      item.id,
    ]);

    setInventory((previous) => ({
      ...previous,
      [item.id]:
        previous[item.id] + 1,
    }));
  }

  function removeItem(
    item: LootItem,
  ) {
    if (
      !selectedItems.includes(item.id)
    ) {
      return;
    }

    setError("");

    setSelectedItems((previous) =>
      previous.filter(
        (itemId) =>
          itemId !== item.id,
      ),
    );

    setInventory((previous) => ({
      ...previous,
      [item.id]: Math.max(
        0,
        previous[item.id] - 1,
      ),
    }));
  }

  function selectMode(
    mode: ClientMatchMode,
  ) {
    setSelectedMode(mode);
    setError("");
  }

  function startMatchmaking() {
    if (selectedCount === 0) {
      setError(
        "Hãy chọn ít nhất một vật phẩm trước khi tìm trận.",
      );

      return;
    }

    if (!selectedMode) {
      setError(
        "Hãy chọn chế độ thi đấu.",
      );

      return;
    }

    setError("");
    setPhase("matchmaking");
  }

  function handleMatchReady(
    readyMatch: MatchmakingMatch,
  ) {
    const normalizedQuestions =
      normalizeMatchQuestions(
        readyMatch.questions,
        level,
        region.id,
      );

    if (
      normalizedQuestions.length < 3
    ) {
      setError(
        "Trận đấu chưa tải đủ ba câu hỏi. Hãy kiểm tra câu hỏi theo tỉnh và trình độ trong MongoDB.",
      );

      setPhase("loot");
      return;
    }

    setMatch(readyMatch);

    setBattleQuestions(
      normalizedQuestions.slice(0, 3),
    );

    setPhase("battle");
  }

  function cancelMatchmaking() {
    setPhase("loot");
    setMatch(null);
    setBattleQuestions([]);
    setError("");
  }

  /*
   * Màn hình chờ ghép trận.
   */
  if (phase === "matchmaking") {
    return (
      <MatchmakingScreen
        region={region}
        level={level}
        mode={selectedMode}
        onMatchReady={
          handleMatchReady
        }
        onCancel={
          cancelMatchmaking
        }
      />
    );
  }

  /*
   * Màn hình trận đấu.
   */
  if (
    phase === "battle" &&
    match &&
    battleQuestions.length > 0
  ) {
    return (
      <BattleQuestionsProvider
        questions={battleQuestions}
      >
        <TeamBattleScreen
  key={match.id}
  level={level}
  region={region}
  match={match}
  initialInventory={inventory}
  onRestart={onRestart}
/>
      </BattleQuestionsProvider>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-[#102f46] via-[#0b2235] to-[#061522] shadow-[0_30px_80px_rgba(0,8,20,0.5)] sm:rounded-[30px]">
      {/* Tiêu đề */}
      <header className="border-b border-white/10 bg-[#061a29]/70 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
              Tiếp đất thành công
            </span>

            <h1 className="mt-3 break-words text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
              Chuẩn bị trận đấu tại{" "}
              <span className="text-amber-300">
                {region.name}
              </span>
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
              <span lang="zh-CN">
                {region.chineseName}
              </span>

              {region.pinyin
                ? ` · ${region.pinyin}`
                : ""}

              {" · "}HSK {level}
            </p>
          </div>

          <button
            type="button"
            onClick={onRestart}
            className="min-h-11 shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/10"
          >
            ← Quay lại bản đồ
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Hướng dẫn vật phẩm */}
        <div className="grid gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5">
          <span className="grid size-12 place-items-center rounded-xl bg-amber-300/15 text-2xl">
            🎒
          </span>

          <div>
            <strong className="block text-amber-100">
              Chuẩn bị vật phẩm
            </strong>

            <p className="mt-1 text-sm leading-relaxed text-amber-100/70">
              Chọn tối đa{" "}
              {MAX_LOOT_ITEMS} vật phẩm hỗ
              trợ trước khi tìm trận.
            </p>
          </div>

          <div className="rounded-xl bg-black/10 px-4 py-3 text-center">
            <strong className="block text-2xl font-black text-amber-300">
              {selectedCount}/
              {MAX_LOOT_ITEMS}
            </strong>

            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100/60">
              Đã chọn
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm leading-relaxed text-red-100"
          >
            <strong>
              Chưa thể tiếp tục:
            </strong>{" "}
            {error}
          </div>
        )}

        {/* Danh sách vật phẩm */}
        <div className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                Bước 1
              </span>

              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                Chọn vật phẩm hỗ trợ
              </h2>
            </div>

            {selectedCount >=
              MAX_LOOT_ITEMS && (
              <span className="rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200">
                Túi đã đầy
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {LOOT_ITEMS.map(
              (item) => {
                const selected =
                  selectedItems.includes(
                    item.id,
                  );

                const bagFull =
                  selectedCount >=
                    MAX_LOOT_ITEMS &&
                  !selected;

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
                      {item.shortName}
                    </span>

                    <h3 className="mt-1 text-lg font-black text-white">
                      {item.name}
                    </h3>

                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                      {item.description}
                    </p>

                    {selected ? (
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(item)
                        }
                        className="mt-4 min-h-11 rounded-xl border border-white/15 bg-black/10 px-4 text-sm font-black text-white transition hover:bg-red-400/10 hover:text-red-200"
                      >
                        Bỏ khỏi túi
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={bagFull}
                        onClick={() =>
                          collectItem(item)
                        }
                        className="mt-4 min-h-11 rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#062d32] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Nhặt vật phẩm
                      </button>
                    )}
                  </article>
                );
              },
            )}
          </div>
        </div>

        {/* Chọn chế độ */}
        <section className="mt-8">
          <div className="mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
              Bước 2
            </span>

            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              Chọn chế độ thi đấu
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Các chế độ PvP sẽ chờ người
              thật trong 15 giây. Nếu chưa đủ,
              máy tự động tham gia vào những
              vị trí còn trống.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {MATCH_MODES.map(
              (mode) => {
                const selected =
                  selectedMode ===
                  mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      selectMode(mode.id)
                    }
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

                    <span className="text-4xl">
                      {mode.icon}
                    </span>

                    <h3 className="mt-4 text-lg font-black text-white">
                      {mode.name}
                    </h3>

                    <span className="mt-1 block text-xs font-bold text-emerald-300">
                      {mode.teamLabel}
                    </span>

                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      {mode.description}
                    </p>

                    <span className="mt-4 inline-flex rounded-full bg-black/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300">
                      {mode.waitingText}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* Tổng kết lựa chọn */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#061a29]/60 p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Chuẩn bị hoàn tất
              </span>

              <div className="mt-3 flex flex-wrap gap-2">
                {inventorySummary.length >
                0 ? (
                  inventorySummary.map(
                    (item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200"
                      >
                        <span>
                          {item.icon}
                        </span>

                        {item.shortName}

                        <small className="text-amber-300">
                          ×
                          {
                            inventory[
                              item.id
                            ]
                          }
                        </small>
                      </span>
                    ),
                  )
                ) : (
                  <span className="text-sm text-slate-500">
                    Chưa chọn vật phẩm
                  </span>
                )}
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2">
                <span>
                  {
                    selectedModeInformation.icon
                  }
                </span>

                <strong className="text-sm text-emerald-100">
                  {
                    selectedModeInformation.name
                  }
                </strong>

                <span className="text-xs text-emerald-200/60">
                  ·{" "}
                  {
                    selectedModeInformation.teamLabel
                  }
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={
                !canStartMatchmaking
              }
              onClick={
                startMatchmaking
              }
              className="min-h-14 w-full shrink-0 rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-8 text-base font-black text-[#382207] shadow-lg shadow-orange-500/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
            >
              {selectedMode === "bot"
                ? "🤖 Bắt đầu đấu máy"
                : "⚔️ Tìm trận đấu"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}