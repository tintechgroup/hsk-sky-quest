"use client";

import { useReducer } from "react";

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

const initialState: LootState = {
  openedIds: [],
  completed: false,
  message: "Chọn một điểm tiếp tế để tìm vật phẩm.",
};

// Quản lý việc nhặt đồ ở một chỗ.
// Không cho nhặt trùng hoặc vượt giới hạn.
function lootReducer(
  state: LootState,
  action: LootAction
): LootState {
  if (action.type === "PICK") {
    if (
      state.completed ||
      state.openedIds.includes(action.spotId) ||
      state.openedIds.length >= MAX_LOOT_PICKS
    ) {
      return state;
    }

    const spot = lootSpots.find(
      (item) => item.id === action.spotId
    );

    if (!spot) {
      return state;
    }

    const pickedItem = items[spot.itemId];

    return {
      ...state,
      openedIds: [...state.openedIds, spot.id],
      message: `Bạn vừa nhận được ${pickedItem.name}.`,
    };
  }

  if (action.type === "COMPLETE") {
    // Chưa nhặt đủ thì chưa xác nhận hoàn tất.
    if (
      state.completed ||
      state.openedIds.length < MAX_LOOT_PICKS
    ) {
      return state;
    }

    return {
      ...state,
      completed: true,
      message: "Đã hoàn tất thu thập vật phẩm.",
    };
  }

  return state;
}

export default function LootScreen({
  region,
  level,
  onRestart,
}: LootScreenProps) {
  const [state, dispatch] = useReducer(
    lootReducer,
    initialState
  );

  // Tính ba lô từ những điểm đã mở.
  // Không lưu thêm một bản số lượng riêng để tránh lệch dữ liệu.
  const inventory: Inventory =
    state.openedIds.reduce<Inventory>(
      (bag, spotId) => {
        const spot = lootSpots.find(
          (item) => item.id === spotId
        );

        if (spot) {
          bag[spot.itemId] += 1;
        }

        return bag;
      },
      {
        "fifty-fifty": 0,
        hint: 0,
      }
    );

  const totalItems = state.openedIds.length;

  const canComplete =
    totalItems >= MAX_LOOT_PICKS;

  const progress =
    (totalItems / MAX_LOOT_PICKS) * 100;

  return (
    <section className="hsk-card">
      <div className="hsk-loot-heading">
        <div>
          <p className="hsk-eyebrow">
            ĐÃ TIẾP ĐẤT · HSK {level}
          </p>

          <h2>
            {region.name} · {region.chineseName}
          </h2>

          <p className="hsk-description">
            Thu thập vật phẩm hỗ trợ trước khi đối đầu
            bằng kiến thức HSK.
          </p>
        </div>

        <span className="hsk-badge">
          {totalItems}/{MAX_LOOT_PICKS} vật phẩm
        </span>
      </div>

      <div className="hsk-loot-layout">
        <div className="hsk-loot-main">
          <div className="hsk-loot-grid">
            {lootSpots.map((spot) => {
              const opened =
                state.openedIds.includes(spot.id);

              const item = items[spot.itemId];

              const disabled =
                opened ||
                canComplete ||
                state.completed;

              return (
                <button
                  key={spot.id}
                  type="button"
                  className={
                    opened
                      ? "hsk-loot-spot is-opened"
                      : "hsk-loot-spot"
                  }
                  disabled={disabled}
                  onClick={() => {
                    dispatch({
                      type: "PICK",
                      spotId: spot.id,
                    });
                  }}
                >
                  <span
                    className="hsk-loot-icon"
                    aria-hidden="true"
                  >
                    {opened ? item.icon : "📦"}
                  </span>

                  <strong>
                    {opened ? item.name : spot.name}
                  </strong>

                  <span className="hsk-loot-detail">
                    {opened
                      ? item.description
                      : "Bấm để tìm vật phẩm"}
                  </span>

                  {opened && (
                    <span className="hsk-loot-collected">
                      Đã thêm vào ba lô
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p
            className="hsk-loot-message"
            role="status"
          >
            {state.message}
          </p>

          {canComplete && !state.completed && (
            <p className="hsk-note">
              Bạn đã nhặt đủ vật phẩm. Kiểm tra ba lô
              và bấm “Hoàn tất thu thập”.
            </p>
          )}
        </div>

        <aside
          className="hsk-loot-bag"
          aria-label="Ba lô vật phẩm"
        >
          <h3>🎒 Ba lô của bạn</h3>

          <p className="hsk-loot-bag-description">
            Vật phẩm sẽ hỗ trợ bạn trong trận đấu.
          </p>

          <div className="hsk-loot-bag-list">
            {Object.values(items).map((item) => (
              <div
                key={item.id}
                className="hsk-loot-bag-row"
              >
                <span
                  className="hsk-loot-bag-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <div>
                  <strong>{item.name}</strong>
                  <p>{item.description}</p>
                </div>

                <span className="hsk-loot-quantity">
                  ×{inventory[item.id]}
                </span>
              </div>
            ))}
          </div>

          <div className="hsk-loot-progress-heading">
            <span>Đã thu thập</span>
            <strong>
              {totalItems}/{MAX_LOOT_PICKS}
            </strong>
          </div>

          <div
            className="hsk-loot-progress"
            role="progressbar"
            aria-label="Tiến độ thu thập vật phẩm"
            aria-valuemin={0}
            aria-valuemax={MAX_LOOT_PICKS}
            aria-valuenow={totalItems}
          >
            <div
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          {!state.completed ? (
            <button
              type="button"
              className="hsk-primary hsk-loot-finish"
              disabled={!canComplete}
              onClick={() => {
                dispatch({
                  type: "COMPLETE",
                });
              }}
            >
              Hoàn tất thu thập
            </button>
          ) : (
            <div className="hsk-loot-ready">
              <strong>Hành trang đã sẵn sàng</strong>

              <p>
                Ba lô có {totalItems} vật phẩm.
                Phần tiếp theo sẽ nối sang tìm đối thủ
                và đấu 3 câu hỏi HSK.
              </p>
            </div>
          )}

          <button
            type="button"
            className="hsk-secondary hsk-loot-restart"
            onClick={onRestart}
          >
            Chơi lại từ đầu
          </button>

          <p className="hsk-note">
            Chơi lại sẽ xóa ba lô của lượt hiện tại.
          </p>
        </aside>
      </div>
    </section>
  );
}