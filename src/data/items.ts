import type {
  GameItem,
  ItemType,
  LootSpot,
} from "@/types/game";

export const items: Record<ItemType, GameItem> = {
  "fifty-fifty": {
    id: "fifty-fifty",
    name: "La bàn 50/50",
    icon: "🧭",
    description:
      "Loại bỏ hai đáp án sai trong một câu hỏi.",
  },

  hint: {
    id: "hint",
    name: "Cuộn gợi ý",
    icon: "📜",
    description:
      "Hiển thị gợi ý giúp bạn suy nghĩ về đáp án.",
  },
};

// Số lượng giới hạn để thử nghiệm.
// Có thể thay đổi sau mà không phải sửa component.
export const MAX_LOOT_PICKS = 3;

// Tạm dùng vị trí vật phẩm cố định để dễ kiểm tra.
// Khi thêm máy chủ multiplayer, máy chủ sẽ phân bố vật phẩm.
export const lootSpots: LootSpot[] = [
  {
    id: "spot-1",
    name: "Điểm tiếp tế 1",
    itemId: "fifty-fifty",
  },
  {
    id: "spot-2",
    name: "Điểm tiếp tế 2",
    itemId: "hint",
  },
  {
    id: "spot-3",
    name: "Điểm tiếp tế 3",
    itemId: "hint",
  },
  {
    id: "spot-4",
    name: "Điểm tiếp tế 4",
    itemId: "fifty-fifty",
  },
  {
    id: "spot-5",
    name: "Điểm tiếp tế 5",
    itemId: "hint",
  },
  {
    id: "spot-6",
    name: "Điểm tiếp tế 6",
    itemId: "fifty-fifty",
  },
];