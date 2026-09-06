// Các trình độ được hỗ trợ.
export type HSKLevel = 3 | 4 | 5 | 6;

// Các màn hình của phần 1.
export type GamePhase =
  | "start"
  | "flight"
  | "parachuting"
  | "landed";

// Thông tin giới thiệu một vùng đất.
export interface Region {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  geography: string;
  culture: string;
  landmark: string;
}
// Hai loại trợ giúp dùng cho phần đấu câu hỏi.
export type ItemType = "fifty-fifty" | "hint";

export interface GameItem {
  id: ItemType;
  name: string;
  icon: string;
  description: string;
}

// Một điểm tiếp tế trên khu vực.
export interface LootSpot {
  id: string;
  name: string;
  itemId: ItemType;
}

// Số lượng từng loại vật phẩm trong ba lô.
export type Inventory = Record<ItemType, number>;