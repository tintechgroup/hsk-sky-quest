

import { useReducer } from "react";

import TeamBattleScreen from "@/components/game/TeamBattleScreen";
import {
  items,
  lootSpots,
  MAX_LOOT_PICKS,
} from "@/data/items";

import type {
  HSKLevel,
  Inventory,
  Region,
} from "@/types/game";

interface LootScreenProps {
  region: Region;
  level: HSKLevel;
  onRestart: () => void;
}

interface LootState {
  openedIds: string[];
  completed: boolean;
  message: string;
}

type LootAction =
  | {
      type: "PICK";
      spotId: string;
    }
  | {
      type: "COMPLETE";
    };

const INITIAL_STATE: LootState = {
  openedIds: [],
  completed: false,
  message:
    "Chọn một điểm tiếp tế để tìm vật phẩm hỗ trợ.",
};

function lootReducer(
  state: LootState,
  action: LootAction,
): LootState {
  switch (action.type) {
    case "PICK": {
      const alreadyOpened =
        state.openedIds.includes(action.spotId);

      const reachedLimit =
        state.openedIds.length >= MAX_LOOT_PICKS;

      if (
        state.completed ||
        alreadyOpened ||
        reachedLimit
      ) {
        return state;
      }

      const selectedSpot = lootSpots.find(
        (spot) => spot.id === action.spotId,
      );

      if (!selectedSpot) {
        return state;
      }

      const selectedItem =
        items[selectedSpot.itemId];

      return {
        ...state,
        openedIds: [
          ...state.openedIds,
          selectedSpot.id,
        ],
        message: `Bạn vừa nhận được ${selectedItem.name}.`,
      };
    }

    case "COMPLETE": {
      if (
        state.completed ||
        state.openedIds.length < MAX_LOOT_PICKS
      ) {
        return state;
      }

      return {
        ...state,
        completed: true,
        message:
          "Đã hoàn tất thu thập. Đang tìm đội đối thủ...",
      };
    }

    default:
      return state;
  }
}

export default function LootScreen({
  region,
  level,
  onRestart,
}: LootScreenProps) {
  const [state, dispatch] = useReducer(
    lootReducer,
    INITIAL_STATE,
  );

  /*
   * Ba lô được tính từ những điểm tiếp tế
   * mà người chơi đã mở.
   */
  const inventory =
    state.openedIds.reduce<Inventory>(
      (bag, spotId) => {
        const selectedSpot = lootSpots.find(
          (spot) => spot.id === spotId,
        );

        if (selectedSpot) {
          bag[selectedSpot.itemId] += 1;
        }

        return bag;
      },
      {
        "fifty-fifty": 0,
        hint: 0,
        pinyin: 0,
        "extra-time": 0,
        retry: 0,
      },
    );

  const totalItems = state.openedIds.length;

  const canComplete =
    totalItems >= MAX_LOOT_PICKS;

  const progressPercentage = Math.min(
    100,
    (totalItems / MAX_LOOT_PICKS) * 100,
  );

  /*
   * Nhặt đủ vật phẩm và bấm tìm đối thủ
   * thì chuyển sang màn hình đấu hai đội.
   */
  if (state.completed) {
    return (
      <TeamBattleScreen
        level={level}
        region={region}
        initialInventory={inventory}
        onRestart={onRestart}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-br from-[#102a40] via-[#0b2237] to-[#071827] shadow-[0_30px_80px_rgba(0,8,20,0.45)]">
      {/* Thanh tiêu đề */}
      <header className="flex flex-col gap-5 border-b border-emerald-200/10 bg-[#081d2e]/75 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />

            <p className="m-0 text-[10px] font-black tracking-[0.17em] text-emerald-300">
              ĐÃ TIẾP ĐẤT
            </p>
          </div>

          <h2 className="m-0 text-2xl font-black text-white md:text-3xl">
            Thu thập vật phẩm tại{" "}
            <span className="text-amber-300">
              {region.name}
            </span>
          </h2>

          <p className="mb-0 mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Mở đủ {MAX_LOOT_PICKS} điểm tiếp tế để
            chuẩn bị cho trận đấu giữa Đội Đỏ và Đội
            Xanh.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-center">
            <span className="block text-[9px] font-black tracking-wider text-emerald-200">
              TRÌNH ĐỘ
            </span>

            <strong className="text-lg font-black text-emerald-300">
              HSK {level}
            </strong>
          </div>

          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-center">
            <span className="block text-[9px] font-black tracking-wider text-amber-200">
              ĐÃ NHẶT
            </span>

            <strong className="text-lg font-black text-amber-300">
              {totalItems}/{MAX_LOOT_PICKS}
            </strong>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Danh sách điểm tiếp tế */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="m-0 text-[10px] font-black tracking-[0.15em] text-emerald-300">
                KHU VỰC TIẾP TẾ
              </p>

              <h3 className="mb-0 mt-1 text-xl font-black text-white">
                Chọn thùng vật phẩm
              </h3>
            </div>

            <span className="hidden rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400 sm:block">
              Tối đa {MAX_LOOT_PICKS} vật phẩm
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {lootSpots.map((spot, index) => {
              const opened =
                state.openedIds.includes(spot.id);

              const selectedItem =
                items[spot.itemId];

              const disabled =
                opened || canComplete;

              return (
                <button
                  key={spot.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={opened}
                  onClick={() =>
                    dispatch({
                      type: "PICK",
                      spotId: spot.id,
                    })
                  }
                  className={`group relative min-h-[190px] overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${
                    opened
                      ? "cursor-default border-emerald-300/50 bg-gradient-to-br from-emerald-400/20 to-emerald-900/10 shadow-[0_15px_35px_rgba(52,211,153,0.1)]"
                      : canComplete
                        ? "cursor-not-allowed border-white/5 bg-white/5 opacity-40"
                        : "cursor-pointer border-cyan-100/15 bg-[#123148] hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-[#173b54] hover:shadow-[0_18px_35px_rgba(0,0,0,0.18)]"
                  }`}
                >
                  {/* Số thứ tự */}
                  <span className="absolute right-4 top-4 text-4xl font-black text-white/[0.04]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Ánh sáng trang trí */}
                  <span
                    className={`absolute -right-7 -top-7 size-24 rounded-full blur-2xl transition ${
                      opened
                        ? "bg-emerald-300/20"
                        : "bg-cyan-300/5 group-hover:bg-emerald-300/15"
                    }`}
                  />

                  <div
                    className={`relative z-10 grid size-14 place-items-center rounded-2xl border text-3xl transition duration-300 ${
                      opened
                        ? "border-emerald-300/30 bg-emerald-300/15"
                        : "border-cyan-100/10 bg-[#071c2d] group-hover:scale-110"
                    }`}
                  >
                    {opened ? selectedItem.icon : "📦"}
                  </div>

                  <strong className="relative z-10 mt-4 block text-base font-black text-white">
                    {opened
                      ? selectedItem.name
                      : spot.name}
                  </strong>

                  <p className="relative z-10 mb-0 mt-2 text-sm leading-relaxed text-slate-300">
                    {opened
                      ? selectedItem.description
                      : "Mở điểm tiếp tế để nhận một vật phẩm hỗ trợ trong trận đấu HSK."}
                  </p>

                  {opened && (
                    <div className="relative z-10 mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-300">
                      <span>✓</span>
                      ĐÃ THÊM VÀO BA LÔ
                    </div>
                  )}

                  {!opened && !canComplete && (
                    <div className="relative z-10 mt-4 inline-flex items-center gap-2 text-[11px] font-bold text-cyan-200/70">
                      Nhấn để mở
                      <span className="transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Thông báo vật phẩm */}
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 flex items-center gap-3 rounded-2xl border p-4 ${
              canComplete
                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                : "border-emerald-300/15 bg-emerald-300/5 text-slate-300"
            }`}
          >
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                canComplete
                  ? "bg-amber-300/15"
                  : "bg-emerald-300/10"
              }`}
            >
              {canComplete ? "⚔️" : "🔍"}
            </div>

            <div>
              <strong className="block text-sm">
                {canComplete
                  ? "Hành trang đã sẵn sàng"
                  : "Đang tìm vật phẩm"}
              </strong>

              <p className="mb-0 mt-1 text-xs opacity-80">
                {canComplete
                  ? "Bạn đã nhặt đủ vật phẩm. Hãy tìm Đội Xanh để bắt đầu trận đấu."
                  : state.message}
              </p>
            </div>
          </div>
        </div>

        {/* Ba lô */}
        <aside className="h-fit rounded-3xl border border-emerald-200/15 bg-[#071c2d]/80 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:sticky lg:top-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="m-0 text-[10px] font-black tracking-[0.15em] text-emerald-300">
                HÀNH TRANG
              </p>

              <h3 className="mb-0 mt-1 text-xl font-black text-white">
                Ba lô của bạn
              </h3>
            </div>

            <div className="grid size-12 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-2xl">
              🎒
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-emerald-200/20 to-transparent" />

          <div className="space-y-3">
            {Object.values(items).map((item) => {
              const itemId =
                item.id as keyof Inventory;

              const quantity = inventory[itemId];

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 ${
                    quantity > 0
                      ? "border-emerald-300/20 bg-emerald-300/5"
                      : "border-white/5 bg-white/[0.025] opacity-55"
                  }`}
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-[#102f44] text-2xl">
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-white">
                      {item.name}
                    </strong>

                    <small className="text-[10px] text-slate-400">
                      {quantity > 0
                        ? "Sẵn sàng sử dụng"
                        : "Chưa thu thập"}
                    </small>
                  </div>

                  <span
                    className={`grid min-w-9 place-items-center rounded-lg px-2 py-1 text-sm font-black ${
                      quantity > 0
                        ? "bg-emerald-300/15 text-emerald-300"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    ×{quantity}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tiến trình */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Tiến trình thu thập
              </span>

              <strong className="text-xs text-emerald-300">
                {Math.round(progressPercentage)}%
              </strong>
            </div>

            <div
              role="progressbar"
              aria-label="Tiến trình thu thập vật phẩm"
              aria-valuemin={0}
              aria-valuemax={MAX_LOOT_PICKS}
              aria-valuenow={totalItems}
              className="h-2 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300 transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>

            <p className="mb-0 mt-2 text-center text-[10px] text-slate-500">
              {totalItems}/{MAX_LOOT_PICKS} điểm tiếp tế
              đã mở
            </p>
          </div>

          <button
            type="button"
            disabled={!canComplete}
            onClick={() =>
              dispatch({
                type: "COMPLETE",
              })
            }
            className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 font-black text-[#172532] shadow-[0_14px_30px_rgba(251,191,36,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(251,191,36,0.3)] disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
          >
            <span>⚔️</span>
            {canComplete
              ? "Tìm đội đối thủ"
              : `Cần thêm ${
                  MAX_LOOT_PICKS - totalItems
                } vật phẩm`}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="mt-3 min-h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            ← Thử lại chuyến bay
          </button>

          <p className="mb-0 mt-4 text-center text-[10px] leading-relaxed text-slate-500">
            Vật phẩm chỉ được sử dụng số lần tương ứng
            với số lượng đã thu thập.
          </p>
        </aside>
      </div>
    </section>
  );
}