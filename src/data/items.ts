import type {
  GameItem,
  ItemType,
  LootSpot,
} from "@/types/game";

export const MAX_LOOT_PICKS = 3;

export const items: Record<
  ItemType,
  GameItem
> = {
  "fifty-fifty": {
    id: "fifty-fifty",
    name: "La bàn 50/50",
    shortName: "50/50",
    icon: "🧭",
    description:
      "Loại bỏ hai đáp án sai trong câu hỏi hiện tại.",
  },

  hint: {
    id: "hint",
    name: "Cuộn gợi ý",
    shortName: "Gợi ý",
    icon: "📜",
    description:
      "Hiển thị một gợi ý giúp người chơi tìm đáp án.",
  },

  pinyin: {
    id: "pinyin",
    name: "Kính phiên âm",
    shortName: "Pinyin",
    icon: "🔎",
    description:
      "Hiển thị pinyin của nội dung tiếng Trung trong câu hỏi.",
  },

  "extra-time": {
    id: "extra-time",
    name: "Đồng hồ thời gian",
    shortName: "+10 giây",
    icon: "⏳",
    description:
      "Cộng thêm 10 giây trả lời cho câu hỏi hiện tại.",
  },

  retry: {
    id: "retry",
    name: "Thẻ hồi đáp",
    shortName: "Trả lời lại",
    icon: "🔄",
    description:
      "Cho phép người chơi chọn lại đáp án một lần.",
  },
};

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
    itemId: "pinyin",
  },
  {
    id: "spot-4",
    name: "Điểm tiếp tế 4",
    itemId: "extra-time",
  },
  {
    id: "spot-5",
    name: "Điểm tiếp tế 5",
    itemId: "retry",
  },
  {
    id: "spot-6",
    name: "Điểm tiếp tế 6",
    itemId: "fifty-fifty",
  },
  {
    id: "spot-7",
    name: "Điểm tiếp tế 7",
    itemId: "hint",
  },
  {
    id: "spot-8",
    name: "Điểm tiếp tế 8",
    itemId: "pinyin",
  },
  {
    id: "spot-9",
    name: "Điểm tiếp tế 9",
    itemId: "extra-time",
  },
  {
    id: "spot-10",
    name: "Điểm tiếp tế 10",
    itemId: "retry",
  },
];